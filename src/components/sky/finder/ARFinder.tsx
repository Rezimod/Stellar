'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { Camera, CameraOff, ChevronDown, RefreshCcw, SlidersHorizontal, X } from 'lucide-react';
import { PlanetIcon } from './PlanetIcon';
import { ARPlanet3DLayer, type ARPlanet3DHandle, type PlanetPlacement } from './ARPlanet3DLayer';
import {
  azimuthToCardinal,
  effectiveFov,
  shortestAzDelta,
} from '@/lib/sky/ar';
import { projectBodyToScreen } from '@/lib/sky/projection';
import { useCamera } from '@/hooks/useCamera';
import {
  angularSeparation,
  type HeadingStatus,
} from '@/lib/sky/use-device-heading';
import {
  CONSTELLATION_LINES,
  STAR_TO_CONSTELLATION,
  positionStars,
  type PositionedStar,
} from '@/lib/sky/stars';
import { CONSTELLATION_NAMES, hexToRgba, starTint } from '@/lib/sky/palette';
import type { ObjectId, SkyObject } from './types';
import './ARFinder.css';

interface ARFinderProps {
  objects: SkyObject[];
  observerLat: number;
  observerLon: number;
  /** Live compass heading from the parent's useDeviceHeading() — sharing
   *  the instance avoids a second iOS permission prompt and ensures the
   *  immersive view picks up wherever the dome left off. */
  heading: number | null;
  altitude: number | null;
  /** Camera roll in degrees, from the shared heading hook. Lets the AR
   *  view rotate markers when the phone is held tilted laterally. */
  roll: number | null;
  accuracy: number | null;
  headingStatus: HeadingStatus;
  /** When set, the view leads the user to this body — edge arrow when
   *  off-screen, hold-to-lock when centered. */
  activeId: ObjectId | null;
  /** Called when the user picks a different target from the in-view picker. */
  onSelectActive: (id: ObjectId | null) => void;
  /** Fired once when the user confirms a held lock on the active target. */
  onLock?: (id: string) => void;
  onClose: () => void;
}

const COMPASS_TICKS = [
  { deg: 0,   label: 'N',  cardinal: true },
  { deg: 30,  label: '30', cardinal: false },
  { deg: 45,  label: 'NE', cardinal: false },
  { deg: 60,  label: '60', cardinal: false },
  { deg: 90,  label: 'E',  cardinal: true },
  { deg: 120, label: '120',cardinal: false },
  { deg: 135, label: 'SE', cardinal: false },
  { deg: 150, label: '150',cardinal: false },
  { deg: 180, label: 'S',  cardinal: true },
  { deg: 210, label: '210',cardinal: false },
  { deg: 225, label: 'SW', cardinal: false },
  { deg: 240, label: '240',cardinal: false },
  { deg: 270, label: 'W',  cardinal: true },
  { deg: 300, label: '300',cardinal: false },
  { deg: 315, label: 'NW', cardinal: false },
  { deg: 330, label: '330',cardinal: false },
];

/** Pre-expanded compass ticks (each tick at -360/0/+360 so the strip wraps
 *  smoothly). Rendered once as stable nodes; the RAF loop only updates each
 *  tick's `left` and visibility. */
const COMPASS_TICK_INSTANCES = COMPASS_TICKS.flatMap((tick) =>
  [-360, 0, 360].map((wrap) => ({
    key: `${tick.label}-${wrap}`,
    deg: tick.deg + wrap,
    label: tick.label,
    cardinal: tick.cardinal,
  })),
);

const COMPASS_VISIBLE_DEG = 80;
const HOLD_TO_LOCK_MS = 800;
const POOR_ACCURACY_DEG = 15;
const STAR_LABEL_LIMIT = 14;
const DISPLAY_DEADBAND_AZ = 0.14;
const DISPLAY_DEADBAND_ALT = 0.10;
const DISPLAY_ALPHA_STILL = 0.08;
const DISPLAY_ALPHA_MOVE = 0.18;
const DISPLAY_ALPHA_FAST = 0.3;
const DISPLAY_SNAP_AZ = 22;
const DISPLAY_SNAP_ALT = 16;
/** Below this per-frame aim/roll change we skip the imperative DOM update —
 *  sub-pixel motion the eye can't see isn't worth the layout writes. */
const DISPLAY_APPLY_EPS = 0.05;
const AR_ALIGNMENT_KEY = 'stellar.sky.ar.alignment.v1';
const MAX_ALIGNMENT_YAW = 24;
const MAX_ALIGNMENT_PITCH = 18;
const ALIGNMENT_STEP = 0.5;

/** Bodies that get rendered as real 3D textured spheres by ARPlanet3DLayer
 *  instead of the flat SVG glyph. Stars and DSOs keep the SVG fallback. */
const PLANET3D_IDS = new Set([
  'sun','moon','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune',
]);

function pickerPriority(obj: SkyObject): number {
  if (obj.id === 'sun') return 0;
  if (obj.id === 'moon') return 1;
  if (obj.type === 'planet') return 2;
  if (obj.type === 'star' || obj.type === 'double') return 3;
  return 4;
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampAltitude(altitude: number): number {
  return clamp(altitude, -89, 89);
}

interface AlignmentState {
  yaw: number;
  pitch: number;
}

function loadAlignment(): AlignmentState {
  if (typeof window === 'undefined') return { yaw: 0, pitch: 0 };
  try {
    const raw = window.localStorage.getItem(AR_ALIGNMENT_KEY);
    if (!raw) return { yaw: 0, pitch: 0 };
    const parsed = JSON.parse(raw) as Partial<AlignmentState>;
    const yaw = typeof parsed.yaw === 'number' ? clamp(parsed.yaw, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW) : 0;
    const pitch = typeof parsed.pitch === 'number' ? clamp(parsed.pitch, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH) : 0;
    return { yaw, pitch };
  } catch {
    return { yaw: 0, pitch: 0 };
  }
}

function displayAlpha(azDelta: number, altDelta: number): number {
  const maxDelta = Math.max(Math.abs(azDelta), Math.abs(altDelta));
  if (maxDelta >= 8) return DISPLAY_ALPHA_FAST;
  if (maxDelta >= 2.5) return DISPLAY_ALPHA_MOVE;
  return DISPLAY_ALPHA_STILL;
}

/** Per-target lock radius (degrees). Mirrors SkyMap's tolerance ladder. */
function lockRadiusDeg(obj: SkyObject): number {
  if (obj.instrument === 'telescope') return 3;
  if (obj.instrument === 'binoculars') return 5;
  return 8;
}

/** Scene star — sky-fixed (its alt/az don't change as the phone moves), so
 *  it lives in a stable list. The RAF loop projects it each frame. */
interface SceneStar extends PositionedStar {
  constellation: string | undefined;
}

/** A constellation line segment whose endpoints are above the horizon — a
 *  stable node; only its x1/y1/x2/y2 + visibility update per frame. */
interface SceneSegment {
  key: number;
  a: PositionedStar;
  b: PositionedStar;
  isActive: boolean;
}

interface ActiveRow {
  obj: SkyObject;
  screenX: number;
  screenY: number;
  dAz: number;
  dAlt: number;
  sep: number;
  onScreen: boolean;
}

export function ARFinder({
  objects,
  observerLat,
  observerLon,
  heading,
  altitude,
  roll,
  accuracy,
  headingStatus,
  activeId,
  onSelectActive,
  onLock,
  onClose,
}: ARFinderProps) {
  const t = useTranslations('sky.ar');

  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 360,
    h: typeof window !== 'undefined' ? window.innerHeight : 640,
  });
  const [alignment, setAlignment] = useState<AlignmentState>(() => loadAlignment());
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Rear-camera feed is opt-in. The default AR experience is a pure black
  // void with rendered 3D planets, so users see textured spheres exactly
  // where each body sits in the sky. Tapping the camera button opts in to
  // the live see-through view.
  const { videoRef, stream, error: cameraError, startCamera, stopCamera } = useCamera();
  const cameraOn = stream != null;

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
    } else {
      void startCamera('environment');
    }
  }, [cameraOn, startCamera, stopCamera]);

  // Stars are computed once when the immersive view opens. They drift
  // ~0.25°/min — plenty accurate for a session lasting a few minutes.
  const stars = useMemo<PositionedStar[]>(() => {
    return positionStars(observerLat, observerLon, new Date());
  }, [observerLat, observerLon]);

  const starById = useMemo(() => {
    const map = new Map<string, PositionedStar>();
    stars.forEach((s) => map.set(s.id, s));
    return map;
  }, [stars]);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Track viewport for FOV → pixel math.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(AR_ALIGNMENT_KEY, JSON.stringify(alignment));
    } catch {
      // Ignore private-mode/localStorage failures.
    }
  }, [alignment]);

  const { horizontal: hFov, vertical: vFov } = useMemo(
    () => effectiveFov(viewport.w, viewport.h),
    [viewport],
  );

  // ── Aim lives in refs, not React state ───────────────────────────────────
  // The RAF loop smooths renderAimRef toward targetAimRef and pushes the
  // result straight to the DOM via applyFrame(); it never calls setState, so
  // panning the phone causes zero React renders.
  const renderAimRef = useRef({ azimuth: heading ?? 0, altitude: altitude ?? 0 });
  const targetAimRef = useRef(renderAimRef.current);

  // ── Scene-level derived data (independent of where the phone is aimed) ────
  const activeBody = useMemo(() => {
    if (!activeId) return null;
    return objects.find((o) => o.id === activeId) ?? null;
  }, [objects, activeId]);

  const activeConstellation = useMemo(() => {
    if (!activeBody) return null;
    return STAR_TO_CONSTELLATION[activeBody.id] ?? null;
  }, [activeBody]);

  // Stars visible-ish this session (their sky altitude doesn't change with
  // aim). Projection happens per frame in applyFrame.
  const sceneStars = useMemo<SceneStar[]>(() => {
    return stars
      .filter((s) => s.altitude > -2)
      .map((s) => ({ ...s, constellation: STAR_TO_CONSTELLATION[s.id] }));
  }, [stars]);

  // Stars eligible for a name label, in brightness order. The frame loop
  // shows the first STAR_LABEL_LIMIT of these that land on-screen.
  const labelCandidates = useMemo<SceneStar[]>(() => {
    return sceneStars
      .filter((s) => s.mag <= 0.9 || (!!activeConstellation && s.constellation === activeConstellation))
      .slice()
      .sort((a, b) => a.mag - b.mag);
  }, [sceneStars, activeConstellation]);

  const sceneSegments = useMemo<SceneSegment[]>(() => {
    const out: SceneSegment[] = [];
    let key = 0;
    for (const [aId, bId] of CONSTELLATION_LINES) {
      const a = starById.get(aId);
      const b = starById.get(bId);
      if (!a || !b) continue;
      if (a.altitude < -1 || b.altitude < -1) continue;
      const isActive =
        !!activeConstellation &&
        (STAR_TO_CONSTELLATION[aId] === activeConstellation ||
          STAR_TO_CONSTELLATION[bId] === activeConstellation);
      out.push({ key: key++, a, b, isActive });
    }
    return out;
  }, [starById, activeConstellation]);

  const constLabelKeys = useMemo<string[]>(() => {
    const present = new Set<string>();
    for (const s of sceneStars) {
      if (s.constellation && CONSTELLATION_NAMES[s.constellation]) present.add(s.constellation);
    }
    return Array.from(present);
  }, [sceneStars]);

  // Picker lists every catalog object so the user can browse first, then
  // opt into guidance. Visible bodies float to the top.
  const pickerBodies = useMemo(() => {
    return objects
      .slice()
      .sort((a, b) => {
        if (a.visible !== b.visible) return a.visible ? -1 : 1;
        const priority = pickerPriority(a) - pickerPriority(b);
        if (priority !== 0) return priority;
        if (a.visible && b.visible) return a.magnitude - b.magnitude || b.altitude - a.altitude;
        return b.altitude - a.altitude;
      });
  }, [objects]);

  const visibleBodyCount = useMemo(
    () => objects.filter((o) => o.visible).length,
    [objects],
  );

  const headingActive = heading != null && altitude != null;
  const poorAccuracy = headingActive && (accuracy == null || accuracy > POOR_ACCURACY_DEG);

  // ── Lock / hold-to-lock state (discrete events only) ─────────────────────
  const [holdProgress, setHoldProgress] = useState(0);
  const [confirmedLock, setConfirmedLock] = useState(false);
  const [insideLockCone, setInsideLockCone] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);
  const insideConeRef = useRef(false);

  // ── Latest values mirrored into refs so applyFrame reads them with no
  //    stale closure and no need to restart the RAF loop. ──────────────────
  const alignmentRef = useRef(alignment); alignmentRef.current = alignment;
  const rollRef = useRef(roll); rollRef.current = roll;
  const fovRef = useRef({ h: hFov, v: vFov }); fovRef.current = { h: hFov, v: vFov };
  const viewportRef = useRef(viewport); viewportRef.current = viewport;
  const activeIdRef = useRef(activeId); activeIdRef.current = activeId;
  const activeBodyRef = useRef(activeBody); activeBodyRef.current = activeBody;
  const headingActiveRef = useRef(headingActive); headingActiveRef.current = headingActive;
  const headingStatusRef = useRef(headingStatus); headingStatusRef.current = headingStatus;
  const confirmedLockRef = useRef(confirmedLock); confirmedLockRef.current = confirmedLock;
  const tRef = useRef(t); tRef.current = t;
  const objectsRef = useRef(objects); objectsRef.current = objects;
  const sceneStarsRef = useRef(sceneStars); sceneStarsRef.current = sceneStars;
  const labelCandidatesRef = useRef(labelCandidates); labelCandidatesRef.current = labelCandidates;
  const sceneSegmentsRef = useRef(sceneSegments); sceneSegmentsRef.current = sceneSegments;
  const constLabelKeysRef = useRef(constLabelKeys); constLabelKeysRef.current = constLabelKeys;
  const activeRowRef = useRef<ActiveRow | null>(null);

  // ── DOM node handles — populated by ref callbacks, written each frame. ────
  const bodyNodes = useRef(new Map<string, HTMLButtonElement>()).current;
  const starNodes = useRef(new Map<string, HTMLDivElement>()).current;
  const starLabelNodes = useRef(new Map<string, HTMLDivElement>()).current;
  const segmentNodes = useRef(new Map<number, SVGLineElement>()).current;
  const constLabelNodes = useRef(new Map<string, SVGTextElement>()).current;
  const compassTickNodes = useRef(new Map<string, HTMLDivElement>()).current;
  const edgeArrowRef = useRef<HTMLDivElement>(null);
  const edgeArrowLabelRef = useRef<HTMLSpanElement>(null);
  const horizonRef = useRef<HTMLDivElement>(null);
  const topbarHeadingRef = useRef<HTMLDivElement>(null);
  const centerAltRef = useRef<HTMLElement>(null);
  const centerAzRef = useRef<HTMLElement>(null);
  const bottomHintRef = useRef<HTMLDivElement>(null);
  const hintPrimaryRef = useRef<HTMLSpanElement>(null);
  const hintSecondaryRef = useRef<HTMLSpanElement>(null);
  const planet3DRef = useRef<ARPlanet3DHandle>(null);

  // ── The per-frame imperative paint. Reads everything from refs, so its
  //    identity is stable and it never closes over stale props. ────────────
  const applyFrame = useCallback(() => {
    const { w, h } = viewportRef.current;
    const align = alignmentRef.current;
    const rollDeg = rollRef.current ?? 0;
    const { h: hFovL, v: vFovL } = fovRef.current;
    const aim = renderAimRef.current;
    const phoneAz = wrap360(aim.azimuth + align.yaw);
    const phoneAlt = clampAltitude(aim.altitude + align.pitch);
    const cameraAim = { altitude: phoneAlt, azimuth: phoneAz };
    const activeIdNow = activeIdRef.current;
    const tt = tRef.current;

    const project = (az: number, alt: number) =>
      projectBodyToScreen({ altitude: alt, azimuth: az }, cameraAim, hFovL, vFovL, w, h, rollDeg);

    // Stars — project once, cache screen coords for the label + constellation
    // passes that follow.
    const starScreen = new Map<string, { x: number; y: number; onScreen: boolean }>();
    for (const s of sceneStarsRef.current) {
      const p = project(s.azimuth, s.altitude);
      const onScreen =
        p.inFront &&
        p.screenX >= -4 && p.screenX <= w + 4 &&
        p.screenY >= -4 && p.screenY <= h + 4;
      starScreen.set(s.id, { x: p.screenX, y: p.screenY, onScreen });
      const node = starNodes.get(s.id);
      if (!node) continue;
      if (!onScreen) { node.style.display = 'none'; continue; }
      node.style.display = '';
      node.style.left = `${p.screenX}px`;
      node.style.top = `${p.screenY}px`;
    }

    // Star labels — brightest on-screen first, capped.
    let shownLabels = 0;
    for (const s of labelCandidatesRef.current) {
      const node = starLabelNodes.get(s.id);
      if (!node) continue;
      const sc = starScreen.get(s.id);
      if (!sc || !sc.onScreen || shownLabels >= STAR_LABEL_LIMIT) {
        node.style.display = 'none';
        continue;
      }
      node.style.display = '';
      node.style.left = `${sc.x + 10}px`;
      node.style.top = `${sc.y - 12}px`;
      shownLabels += 1;
    }

    // Constellation labels — centroid of the on-screen stars in each group.
    for (const key of constLabelKeysRef.current) {
      const node = constLabelNodes.get(key);
      if (!node) continue;
      let sx = 0, sy = 0, n = 0;
      for (const s of sceneStarsRef.current) {
        if (s.constellation !== key) continue;
        const sc = starScreen.get(s.id);
        if (sc && sc.onScreen) { sx += sc.x; sy += sc.y; n += 1; }
      }
      if (n < 2) { node.style.display = 'none'; continue; }
      node.style.display = '';
      node.setAttribute('x', String(sx / n));
      node.setAttribute('y', String(sy / n));
    }

    // Constellation line segments.
    const pad = 12;
    for (const seg of sceneSegmentsRef.current) {
      const node = segmentNodes.get(seg.key);
      if (!node) continue;
      const pa = project(seg.a.azimuth, seg.a.altitude);
      const pb = project(seg.b.azimuth, seg.b.altitude);
      if (!pa.inFront && !pb.inFront) { node.style.display = 'none'; continue; }
      const aOn = pa.inFront && pa.screenX >= -pad && pa.screenX <= w + pad && pa.screenY >= -pad && pa.screenY <= h + pad;
      const bOn = pb.inFront && pb.screenX >= -pad && pb.screenX <= w + pad && pb.screenY >= -pad && pb.screenY <= h + pad;
      if (!aOn && !bOn) { node.style.display = 'none'; continue; }
      node.style.display = '';
      node.setAttribute('x1', String(pa.screenX));
      node.setAttribute('y1', String(pa.screenY));
      node.setAttribute('x2', String(pb.screenX));
      node.setAttribute('y2', String(pb.screenY));
    }

    // Bodies — position/opacity/z-order + capture the active row for the
    // edge arrow, hint and lock cone.
    const bodyScreen = new Map<string, { x: number; y: number; onScreen: boolean }>();
    let activeRow: ActiveRow | null = null;
    for (const obj of objectsRef.current) {
      const p = project(obj.azimuth, obj.altitude);
      const onScreen =
        p.inFront &&
        p.screenX >= -8 && p.screenX <= w + 8 &&
        p.screenY >= -8 && p.screenY <= h + 8;
      bodyScreen.set(obj.id, { x: p.screenX, y: p.screenY, onScreen });
      const isActive = obj.id === activeIdNow;
      const sep = angularSeparation(obj.altitude, obj.azimuth, phoneAlt, phoneAz);
      if (isActive) {
        activeRow = { obj, screenX: p.screenX, screenY: p.screenY, dAz: p.dAz, dAlt: p.dAlt, sep, onScreen };
      }
      const node = bodyNodes.get(obj.id);
      if (!node) continue;
      // Render a bit beyond the viewport so bodies fade in/out smoothly as
      // the user pans, instead of popping when they cross the edge.
      const inFade =
        p.screenX >= -120 && p.screenX <= w + 120 &&
        p.screenY >= -120 && p.screenY <= h + 120;
      if (!inFade) { node.style.display = 'none'; continue; }
      node.style.display = '';
      node.style.left = `${p.screenX}px`;
      node.style.top = `${p.screenY}px`;
      node.style.opacity = onScreen ? (isActive ? '1' : '0.94') : '0';
      // Nearer bodies (and the active one) paint on top.
      node.style.zIndex = isActive ? '50' : String(Math.max(1, Math.round(40 - sep / 10)));
    }
    activeRowRef.current = activeRow;

    // 3D planet layer — push placements straight into its refs.
    const placements: PlanetPlacement[] = [];
    for (const obj of objectsRef.current) {
      if (!PLANET3D_IDS.has(obj.id)) continue;
      const bs = bodyScreen.get(obj.id);
      if (!bs) continue;
      placements.push({
        id: obj.id,
        screenX: bs.x,
        screenY: bs.y,
        size: obj.id === activeIdNow ? 56 : 40,
        visible: bs.onScreen,
      });
    }
    const sunBs = bodyScreen.get('sun');
    planet3DRef.current?.update(placements, sunBs ? { x: sunBs.x, y: sunBs.y } : null);

    // Edge arrow toward an off-screen active target.
    const arrow = edgeArrowRef.current;
    if (arrow) {
      const ab = activeBodyRef.current;
      if (ab && activeRow && !activeRow.onScreen) {
        const cx = w / 2;
        const cy = h / 2;
        let dx = activeRow.screenX - cx;
        let dy = activeRow.screenY - cy;
        if (Math.abs(activeRow.dAz) > 90) { dx = -dx; dy = -dy; }
        const norm = Math.hypot(dx, dy) || 1;
        const ux = dx / norm;
        const uy = dy / norm;
        const margin = 70;
        const halfW = cx - margin;
        const halfH = cy - margin;
        const tx = ux > 0 ? halfW / ux : -halfW / ux;
        const ty = uy > 0 ? halfH / uy : -halfH / uy;
        const tEdge = Math.min(Math.abs(tx), Math.abs(ty));
        const ax = cx + ux * tEdge;
        const ay = cy + uy * tEdge;
        const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;
        arrow.style.display = '';
        arrow.style.left = `${ax}px`;
        arrow.style.top = `${ay}px`;
        arrow.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
        if (edgeArrowLabelRef.current) {
          edgeArrowLabelRef.current.style.transform = `rotate(${-angleDeg}deg)`;
        }
      } else {
        arrow.style.display = 'none';
      }
    }

    // Center readout, horizon, compass, topbar heading.
    if (centerAltRef.current) {
      centerAltRef.current.textContent = `${phoneAlt >= 0 ? '+' : ''}${phoneAlt.toFixed(1)}°`;
    }
    if (centerAzRef.current) {
      centerAzRef.current.textContent = `${phoneAz.toFixed(1)}°`;
    }
    if (horizonRef.current) {
      const horizonY = (phoneAlt / vFovL) * h + h / 2;
      horizonRef.current.style.top = `${Math.max(-1, Math.min(h + 1, horizonY))}px`;
    }
    if (topbarHeadingRef.current) {
      topbarHeadingRef.current.textContent = `${azimuthToCardinal(phoneAz)} · ${Math.round(phoneAz)}°`;
    }
    const pxPerDeg = w / COMPASS_VISIBLE_DEG;
    for (const inst of COMPASS_TICK_INSTANCES) {
      const node = compassTickNodes.get(inst.key);
      if (!node) continue;
      const delta = shortestAzDelta(inst.deg, phoneAz);
      if (Math.abs(delta) > COMPASS_VISIBLE_DEG / 2 + 5) { node.style.display = 'none'; continue; }
      node.style.display = '';
      node.style.left = `${w / 2 + delta * pxPerDeg}px`;
    }

    // Bottom hint — structured cue. Recomputed per frame so the degree
    // countdown and the on-screen/off-screen flip stay live.
    const hintEl = bottomHintRef.current;
    const primaryEl = hintPrimaryRef.current;
    const secondaryEl = hintSecondaryRef.current;
    if (hintEl && primaryEl && secondaryEl) {
      const ab = activeBodyRef.current;
      const status = headingStatusRef.current;
      const confirmed = confirmedLockRef.current;
      let primary: string;
      let secondary: string | undefined;
      let lockTone = false;
      if (!headingActiveRef.current) {
        if (status === 'denied') { primary = tt('denied.title'); secondary = tt('denied.body'); }
        else if (status === 'unavailable') { primary = tt('fallbacks.noSensors'); }
        else { primary = tt('liftPhone'); }
      } else if (ab && activeRow) {
        const steps: string[] = [];
        const horizontal = Math.round(Math.abs(activeRow.dAz));
        const vertical = Math.round(Math.abs(activeRow.dAlt));
        if (horizontal >= 1) steps.push(tt(activeRow.dAz > 0 ? 'turnRight' : 'turnLeft', { deg: horizontal }));
        if (vertical >= 1) steps.push(tt(activeRow.dAlt > 0 ? 'tiltUp' : 'tiltDown', { deg: vertical }));
        if (confirmed) {
          primary = tt('found', { object: ab.name });
          lockTone = true;
        } else if (activeRow.onScreen) {
          primary = tt('centerTarget', { object: ab.name });
          secondary = steps.join(' · ') || tt('holdSteady');
        } else {
          primary = tt('guideTo', { object: ab.name });
          secondary = steps.join(' · ') || tt('panTo', { deg: Math.round(activeRow.sep), object: ab.name });
        }
      } else {
        primary = tt('browseSky');
        secondary = tt('browseSkyBody');
      }
      primaryEl.textContent = primary;
      if (secondary) {
        secondaryEl.textContent = secondary;
        secondaryEl.style.display = '';
      } else {
        secondaryEl.style.display = 'none';
      }
      hintEl.classList.toggle('is-locked', lockTone);
      hintEl.classList.toggle('has-secondary', !!secondary);
    }

    // Lock cone — flip the discrete React state only on a boundary crossing.
    const ab = activeBodyRef.current;
    const lockRadius = ab ? lockRadiusDeg(ab) : 8;
    const cone = headingActiveRef.current && activeRow != null && activeRow.sep <= lockRadius;
    if (cone !== insideConeRef.current) {
      insideConeRef.current = cone;
      setInsideLockCone(cone);
    }
  }, [bodyNodes, starNodes, starLabelNodes, segmentNodes, constLabelNodes, compassTickNodes]);

  // Feed the smoother its target whenever the sensor reports new pointing.
  useEffect(() => {
    targetAimRef.current = {
      azimuth: heading ?? renderAimRef.current.azimuth,
      altitude: altitude ?? renderAimRef.current.altitude,
    };
    if (heading == null || altitude == null) {
      renderAimRef.current = targetAimRef.current;
      applyFrame();
    }
  }, [heading, altitude, applyFrame]);

  // Reposition everything after any scene change (active target, alignment,
  // viewport/FOV, object/star set, lock state). Runs before paint so newly
  // structured nodes never flash at the wrong spot.
  useLayoutEffect(() => {
    applyFrame();
  }, [
    applyFrame,
    viewport,
    hFov,
    vFov,
    alignment,
    activeId,
    objects,
    sceneStars,
    labelCandidates,
    sceneSegments,
    constLabelKeys,
    confirmedLock,
    headingActive,
    headingStatus,
    activeConstellation,
  ]);

  // The display smoother. Writes renderAimRef every frame; only paints when
  // the aim or roll actually moved more than a sub-pixel amount.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let raf = 0;
    let docVisible = !document.hidden;
    let lastAz = renderAimRef.current.azimuth;
    let lastAlt = renderAimRef.current.altitude;
    let lastRoll = rollRef.current ?? 0;

    const stop = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const start = () => {
      if (raf || !docVisible) return;
      raf = window.requestAnimationFrame(tick);
    };

    const tick = () => {
      if (!docVisible) {
        stop();
        return;
      }
      const current = renderAimRef.current;
      const target = targetAimRef.current;
      const azDelta = shortestAzDelta(target.azimuth, current.azimuth);
      const altDelta = target.altitude - current.altitude;
      const absAz = Math.abs(azDelta);
      const absAlt = Math.abs(altDelta);

      let nextAz = current.azimuth;
      let nextAlt = current.altitude;

      if (absAz >= DISPLAY_SNAP_AZ || absAlt >= DISPLAY_SNAP_ALT) {
        nextAz = target.azimuth;
        nextAlt = target.altitude;
      } else {
        const alpha = displayAlpha(azDelta, altDelta);
        if (absAz >= DISPLAY_DEADBAND_AZ) nextAz = wrap360(current.azimuth + azDelta * alpha);
        if (absAlt >= DISPLAY_DEADBAND_ALT) nextAlt = current.altitude + altDelta * alpha;
      }

      renderAimRef.current = { azimuth: nextAz, altitude: nextAlt };

      const rollNow = rollRef.current ?? 0;
      const movedAim =
        Math.abs(shortestAzDelta(nextAz, lastAz)) >= DISPLAY_APPLY_EPS ||
        Math.abs(nextAlt - lastAlt) >= DISPLAY_APPLY_EPS;
      const movedRoll = Math.abs(rollNow - lastRoll) >= DISPLAY_APPLY_EPS;
      if (movedAim || movedRoll) {
        lastAz = nextAz;
        lastAlt = nextAlt;
        lastRoll = rollNow;
        applyFrame();
      }

      raf = window.requestAnimationFrame(tick);
    };

    const onVis = () => {
      docVisible = !document.hidden;
      if (docVisible) start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [applyFrame]);

  const nudgeAlignment = useCallback((axis: 'yaw' | 'pitch', delta: number) => {
    setAlignment((prev) => {
      if (axis === 'yaw') {
        return { ...prev, yaw: clamp(prev.yaw + delta, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW) };
      }
      return { ...prev, pitch: clamp(prev.pitch + delta, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH) };
    });
  }, []);

  const matchActiveTarget = useCallback(() => {
    const ar = activeRowRef.current;
    if (!ar) return;
    setAlignment((prev) => ({
      yaw: clamp(prev.yaw + ar.dAz, -MAX_ALIGNMENT_YAW, MAX_ALIGNMENT_YAW),
      pitch: clamp(prev.pitch + ar.dAlt, -MAX_ALIGNMENT_PITCH, MAX_ALIGNMENT_PITCH),
    }));
  }, []);

  const resetAlignment = useCallback(() => {
    setAlignment({ yaw: 0, pitch: 0 });
  }, []);

  useEffect(() => {
    if (activeBody?.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeBody?.id ?? null;
      holdStartRef.current = null;
      setHoldProgress(0);
      setConfirmedLock(false);
    }
  }, [activeBody]);

  useEffect(() => {
    if (!insideLockCone) {
      holdStartRef.current = null;
      if (holdProgress !== 0) setHoldProgress(0);
      if (confirmedLock) setConfirmedLock(false);
      return;
    }
    if (holdStartRef.current == null) holdStartRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const start = holdStartRef.current;
      if (start == null) return;
      const elapsed = performance.now() - start;
      const tt = Math.min(1, elapsed / HOLD_TO_LOCK_MS);
      setHoldProgress(tt);
      if (tt >= 1) {
        if (!confirmedLock) {
          setConfirmedLock(true);
          if (activeId) onLock?.(activeId);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([12, 40, 12]); } catch { /* ignore */ }
          }
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [insideLockCone, confirmedLock, holdProgress, activeId, onLock]);

  return (
    <div
      className={`ar-overlay${cameraOn ? ' ar-overlay--camera-on' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
    >
      <video
        ref={videoRef}
        className="ar-overlay__camera"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />

      <svg
        className="ar-constellations"
        width={viewport.w}
        height={viewport.h}
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      >
        {sceneSegments.map((seg) => (
          <line
            key={seg.key}
            ref={(el) => { if (el) segmentNodes.set(seg.key, el); else segmentNodes.delete(seg.key); }}
            stroke={seg.isActive ? 'rgba(255,224,174,0.42)' : 'rgba(248,244,236,0.14)'}
            strokeWidth={seg.isActive ? 1.15 : 0.9}
            strokeLinecap="round"
            style={{ display: 'none' }}
          />
        ))}
        {constLabelKeys.map((key) => (
          <text
            key={key}
            ref={(el) => { if (el) constLabelNodes.set(key, el); else constLabelNodes.delete(key); }}
            className={`ar-constellation-label${activeConstellation === key ? ' is-active' : ''}`}
            textAnchor="middle"
            style={{ display: 'none' }}
          >
            {CONSTELLATION_NAMES[key]}
          </text>
        ))}
      </svg>

      <div className="ar-overlay__layer">
        {sceneStars.map((star) => {
          const size = Math.max(1.7, 4.8 - star.mag * 0.62);
          const opacity = Math.max(0.56, 1 - star.mag * 0.16);
          const tint = starTint(star.id, star.mag);
          const glow = star.mag <= 0.6
            ? `0 0 12px ${hexToRgba(tint, 0.72)}, 0 0 28px ${hexToRgba(tint, 0.28)}`
            : `0 0 10px ${hexToRgba(tint, 0.42)}`;
          return (
            <div
              key={star.id}
              ref={(el) => { if (el) starNodes.set(star.id, el); else starNodes.delete(star.id); }}
              className="ar-star"
              style={{
                width: size,
                height: size,
                opacity,
                background: tint,
                boxShadow: glow,
                display: 'none',
              }}
              title={star.name}
            />
          );
        })}
        {labelCandidates.map((star) => (
          <div
            key={`label-${star.id}`}
            ref={(el) => { if (el) starLabelNodes.set(star.id, el); else starLabelNodes.delete(star.id); }}
            className={`ar-star-label${activeConstellation === star.constellation ? ' is-active' : ''}`}
            style={{ display: 'none' }}
          >
            {star.name}
          </div>
        ))}
      </div>

      <div className="ar-horizon-line" ref={horizonRef} style={{ top: 0 }}>
        <span className="ar-horizon-line__label">{t('horizon')}</span>
      </div>

      <ARPlanet3DLayer
        ref={planet3DRef}
        width={viewport.w}
        height={viewport.h}
      />

      <div className="ar-overlay__layer">
        {objects.map((obj) => {
          const isActive = obj.id === activeId;
          return (
            <button
              type="button"
              key={obj.id}
              ref={(el) => { if (el) bodyNodes.set(obj.id, el); else bodyNodes.delete(obj.id); }}
              className={`ar-body ${isActive ? 'ar-body--focused' : ''} ${isActive && confirmedLock ? 'ar-body--locked' : ''}`}
              style={{ display: 'none' }}
              onClick={() => onSelectActive(obj.id)}
              aria-label={isActive ? t('centerTarget', { object: obj.name }) : obj.name}
              aria-pressed={isActive}
            >
              <div className="ar-body__icon">
                {PLANET3D_IDS.has(obj.id) ? (
                  <div
                    className="ar-body__icon-3d-slot"
                    style={{ width: isActive ? 56 : 40, height: isActive ? 56 : 40 }}
                    aria-hidden="true"
                  />
                ) : (
                  <PlanetIcon
                    id={obj.id}
                    type={obj.type}
                    magnitude={obj.magnitude}
                    size={isActive ? 56 : 40}
                    phase={obj.phase}
                    glow={true}
                  />
                )}
                <div className="ar-body__crosshair" />
                {isActive && !confirmedLock && holdProgress > 0 && (
                  <HoldRing progress={holdProgress} size={isActive ? 70 : 54} />
                )}
              </div>
              <div className="ar-body__label">{obj.name}</div>
              {isActive && (
                <div className="ar-body__coords">
                  ALT {Math.round(obj.altitude)}° · AZ {Math.round(obj.azimuth)}°
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activeBody && (
        <div
          className="ar-edge-arrow"
          ref={edgeArrowRef}
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          <ArrowGlyph />
          <span className="ar-edge-arrow__label" ref={edgeArrowLabelRef}>
            {activeBody.name}
          </span>
        </div>
      )}

      <div
        className={`ar-center-reticle${activeBody ? ' is-guiding' : ''}${confirmedLock ? ' is-locked' : ''}`}
        aria-hidden="true"
      >
        <span className="ar-center-reticle__h" />
        <span className="ar-center-reticle__v" />
        <span className="ar-center-reticle__dot" />
      </div>

      <div className="ar-center-readout">
        <div className="ar-center-readout__line">
          <span>ALT</span>
          <strong ref={centerAltRef} />
          <span>·</span>
          <span>AZ</span>
          <strong ref={centerAzRef} />
        </div>
      </div>

      <div className="ar-compass-strip" aria-hidden="true">
        <div className="ar-compass-strip__inner">
          <div className="ar-compass-strip__center" />
          {COMPASS_TICK_INSTANCES.map((inst) => (
            <div
              key={inst.key}
              ref={(el) => { if (el) compassTickNodes.set(inst.key, el); else compassTickNodes.delete(inst.key); }}
              className={`ar-compass-tick ${inst.cardinal ? 'ar-compass-tick--cardinal' : ''}`}
              style={{ display: 'none' }}
            >
              <span className="ar-compass-tick__mark" />
              <span>{inst.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-bottom-hint" ref={bottomHintRef}>
        <span className="ar-bottom-hint__primary" ref={hintPrimaryRef} />
        <span className="ar-bottom-hint__secondary" ref={hintSecondaryRef} />
      </div>

      {poorAccuracy && (
        <div className="ar-accuracy-banner" role="status">
          {t('poorAccuracy')}
        </div>
      )}

      {/* In-AR target picker — chip in the top-left, tap to expand a list
          of currently-visible bodies. Lets the user switch from Jupiter to
          Saturn without dropping back to the dome. */}
      <ARTargetPicker
        bodies={pickerBodies}
        activeId={activeId}
        visibleCount={visibleBodyCount}
        open={pickerOpen}
        onToggle={() => setPickerOpen((v) => !v)}
        onSelect={(id) => {
          onSelectActive(id);
          setPickerOpen(false);
        }}
      />

      <ARAlignmentPanel
        open={alignmentOpen}
        yaw={alignment.yaw}
        pitch={alignment.pitch}
        activeBodyName={activeBody?.name ?? null}
        onToggle={() => setAlignmentOpen((value) => !value)}
        onNudge={nudgeAlignment}
        onMatchTarget={matchActiveTarget}
        onReset={resetAlignment}
      />

      <div className="ar-overlay__topbar">
        <div>
          <div className="ar-topbar__title">{t('title')}</div>
          <div className="ar-topbar__heading" ref={topbarHeadingRef} />
        </div>
        <div className="ar-overlay__topbar-actions">
          <button
            type="button"
            className={`ar-topbar__btn${cameraOn ? ' is-active' : ''}`}
            aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={cameraOn}
            onClick={toggleCamera}
          >
            {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          <button
            type="button"
            className="ar-topbar__btn"
            aria-label={t('close')}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!cameraOn && cameraError === 'permission_denied' && (
        <div className="ar-camera-banner" role="status">
          Camera blocked — Stellar is showing simulated stars. Enable camera in browser settings, then tap the camera button.
        </div>
      )}
    </div>
  );
}

function HoldRing({ progress, size }: { progress: number; size: number }) {
  const r = size / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg
      className="ar-hold-ring"
      width={size + 4}
      height={size + 4}
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      aria-hidden="true"
    >
      <circle
        cx={r}
        cy={r}
        r={r}
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${C * progress} ${C}`}
        transform={`rotate(-90 ${r} ${r})`}
      />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12h13M11 6l6 6-6 6"
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PickerProps {
  bodies: SkyObject[];
  activeId: ObjectId | null;
  visibleCount: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: ObjectId | null) => void;
}

function ARTargetPicker({ bodies, activeId, visibleCount, open, onToggle, onSelect }: PickerProps) {
  const t = useTranslations('sky.ar');
  const active = bodies.find((b) => b.id === activeId) ?? null;

  return (
    <div className={`ar-picker${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ar-picker__chip"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="ar-picker__chip-label">{t('targetLabel')}</span>
        <strong className="ar-picker__chip-name">
          {active?.name ?? t('showAll')}
        </strong>
        <span className="ar-picker__chip-meta">{visibleCount} · {t('visibleNow')}</span>
        <ChevronDown size={14} className="ar-picker__chip-caret" aria-hidden="true" />
      </button>
      {open && (
        <ul className="ar-picker__list" role="listbox" aria-label={t('targetLabel')}>
          <li>
            <button
              type="button"
              className={`ar-picker__row ar-picker__row--all${activeId == null ? ' is-selected' : ''}`}
              role="option"
              aria-selected={activeId == null}
              onClick={() => onSelect(null)}
            >
              <span className="ar-picker__row-main">
                <span className="ar-picker__row-copy">
                  <span className="ar-picker__row-name">{t('showAll')}</span>
                  <span className="ar-picker__row-subtitle">{t('guidanceOff')}</span>
                </span>
              </span>
            </button>
          </li>
          {bodies.length === 0 && (
            <li className="ar-picker__empty">{t('noVisibleBodies')}</li>
          )}
          {bodies.map((b) => {
            const selected = b.id === activeId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className={`ar-picker__row${selected ? ' is-selected' : ''}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(b.id)}
                >
                  <span className="ar-picker__row-main">
                    <span className="ar-picker__row-icon" aria-hidden="true">
                      <PlanetIcon
                        id={b.id}
                        type={b.type}
                        magnitude={b.magnitude}
                        size={24}
                        phase={b.phase}
                        glow={selected || b.visible}
                      />
                    </span>
                    <span className="ar-picker__row-copy">
                      <span className="ar-picker__row-name">{b.name}</span>
                      <span className="ar-picker__row-subtitle">
                        {b.visible ? t('visibleNow') : t('belowHorizon')}
                      </span>
                    </span>
                  </span>
                  <span className="ar-picker__row-coords">
                    {b.visible
                      ? `${Math.round(b.altitude)}° · ${b.compassDirection}`
                      : `${Math.abs(Math.round(b.altitude))}°`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface AlignmentPanelProps {
  open: boolean;
  yaw: number;
  pitch: number;
  activeBodyName: string | null;
  onToggle: () => void;
  onNudge: (axis: 'yaw' | 'pitch', delta: number) => void;
  onMatchTarget: () => void;
  onReset: () => void;
}

function ARAlignmentPanel({
  open,
  yaw,
  pitch,
  activeBodyName,
  onToggle,
  onNudge,
  onMatchTarget,
  onReset,
}: AlignmentPanelProps) {
  const t = useTranslations('sky.ar');

  return (
    <div className={`ar-align${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ar-align__chip"
        onClick={onToggle}
        aria-expanded={open}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        <span>{t('align')}</span>
      </button>
      {open && (
        <div className="ar-align__panel">
          <div className="ar-align__title">{t('alignment')}</div>
          <p className="ar-align__body">{t('alignmentBody')}</p>
          {activeBodyName && (
            <button type="button" className="ar-align__action" onClick={onMatchTarget}>
              {t('setFromTarget', { object: activeBodyName })}
            </button>
          )}
          <div className="ar-align__axes">
            <div className="ar-align__axis">
              <div className="ar-align__axis-head">
                <span>{t('yaw')}</span>
                <strong>{yaw >= 0 ? '+' : ''}{yaw.toFixed(1)}°</strong>
              </div>
              <div className="ar-align__controls">
                <button type="button" className="ar-align__step" onClick={() => onNudge('yaw', -ALIGNMENT_STEP)}>
                  {t('left')}
                </button>
                <button type="button" className="ar-align__step" onClick={() => onNudge('yaw', ALIGNMENT_STEP)}>
                  {t('right')}
                </button>
              </div>
            </div>
            <div className="ar-align__axis">
              <div className="ar-align__axis-head">
                <span>{t('pitch')}</span>
                <strong>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°</strong>
              </div>
              <div className="ar-align__controls">
                <button type="button" className="ar-align__step" onClick={() => onNudge('pitch', ALIGNMENT_STEP)}>
                  {t('up')}
                </button>
                <button type="button" className="ar-align__step" onClick={() => onNudge('pitch', -ALIGNMENT_STEP)}>
                  {t('down')}
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="ar-align__reset" onClick={onReset}>
            <RefreshCcw size={13} aria-hidden="true" />
            <span>{t('resetAlignment')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
