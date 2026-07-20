'use client';

import { useMemo } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { model as geomagneticModel } from 'geomagnetism';
import { compassOffsetKey } from '@/lib/observer-location';

/**
 * Live phone pointing — the (azimuth, altitude) the back of the device is
 * aimed at, derived from DeviceOrientationEvent.
 *
 * ## Why this is structured the way it is
 *
 * Two quantities with very different reliability get conflated by every naive
 * implementation, and separating them is the whole design:
 *
 *   1. **Attitude** — where the phone is aimed, from `alpha/beta/gamma`.
 *      Gyro+gravity fusion. Smooth, and free of singularities anywhere near
 *      the region we care about. Trustworthy always.
 *   2. **The north anchor** — one scalar tying that attitude to true north.
 *      Fragile, and *undefined* in exactly the pose our users hold.
 *
 * `webkitCompassHeading` is `CLHeading.magneticHeading` (WebKit
 * `WebCoreMotionManager.mm` → `sendMotionData:withHeading:`), i.e. the azimuth
 * of the horizontal projection of the device's **+Y axis** — the top edge, in
 * portrait reference (WebKit calls `startUpdatingHeading` without ever setting
 * `headingOrientation`, so Core Location assumes portrait).
 *
 * Aim the phone at the sky and that top edge points at the zenith. Its
 * horizontal projection collapses to nothing, the defining `atan2` becomes
 * ill-conditioned, and the reported heading flips ~180° as you cross vertical.
 * That is a real gimbal singularity in the reference axis, not sensor noise —
 * so it cannot be smoothed, deadzoned, or hysteresis'd away. Previous versions
 * of this file tried all three (a `cos β` branch latch, a flip-confirm frame
 * counter, a two-branch `alphaWorld` inversion) and each only moved the
 * symptom, because the sky-pointing pose *is* the bad region and the user
 * stays in it for the entire session.
 *
 * So: never derive yaw from the compass while the phone is aimed upward.
 * Track attitude continuously, and estimate the north offset as a single
 * scalar sampled **only** while the phone is near level and the compass
 * reports good accuracy — then latch it. Because a yaw rotation about world-up
 * commutes with everything else in the frame, that offset is a plain addition
 * to the final heading; altitude and roll are untouched by it.
 *
 * Two further corrections the old code got wrong:
 *   • `magneticHeading` is **magnetic**, not true. Declination applies on iOS
 *     too (~6°E in Tbilisi — wider than the 3° telescope lock radius).
 *   • `alpha/beta/gamma` and `webkitCompassHeading` are all portrait-referenced
 *     regardless of screen rotation, so heading and altitude need no screen
 *     correction — but **roll** does, since the AR overlay renders against the
 *     current screen-up rather than the device's top edge.
 */
export type HeadingStatus = 'idle' | 'granted' | 'denied' | 'unavailable';

/** How the current north anchor was established. Drives the UI trust signal. */
export type NorthSource =
  /** No anchor yet — heading is relative and meaningless as an absolute bearing. */
  | 'none'
  /** Android `deviceorientationabsolute`: alpha is already geomagnetic-referenced. */
  | 'absolute'
  /** Latched from gated compass samples taken while the phone was near level. */
  | 'compass'
  /** Solved from a star the user aimed at. Most accurate; wins over the compass. */
  | 'star';

export interface UseDeviceHeading {
  /** Current heading in degrees, 0..360, or null until the first event fires. */
  heading: number | null;
  /**
   * Direction the back of the phone is pointing in altitude, in degrees.
   * −90 = straight down, 0 = horizon, +90 = zenith. Null until the first event.
   */
  altitude: number | null;
  /**
   * Signed roll of the camera around its forward axis, in degrees, already
   * corrected for the current screen orientation so it can be applied
   * directly to the rendered overlay.
   * 0 = top of screen aligned with world-up (image is right-side-up).
   * Positive = phone rolled clockwise as seen from behind the camera.
   */
  roll: number | null;
  /** Has Stellar received any heading event yet? */
  live: boolean;
  status: HeadingStatus;
  /** Best-effort heading accuracy in degrees from iOS, or null. */
  accuracy: number | null;
  /** How the north anchor was established. */
  northSource: NorthSource;
  /**
   * True once the heading is anchored to true north and safe to trust as an
   * absolute bearing. While false, the dome should tell the user to hold the
   * phone level so the compass can be read.
   */
  northReady: boolean;
  /** Persistent user calibration nudge applied on top of the sensor heading. */
  offset: number;
  /** Add `delta` degrees to the calibration offset. Persisted to localStorage. */
  nudge: (delta: number) => void;
  /**
   * Solve the north anchor from a body the user is physically aiming at.
   * Pass the target's true azimuth in degrees; the current pointing direction
   * is redefined to match it. This beats the magnetometer outright — consumer
   * compasses run ±10–20° in the field and worse beside a telescope's steel
   * tube and counterweights. Persisted per observing site, and it suppresses
   * further compass drift correction until reset.
   */
  alignToAzimuth: (trueAzimuthDeg: number) => void;
  /** Drop the star alignment and the user nudge; fall back to the compass. */
  resetCalibration: () => void;
  /**
   * Hint the smoother to dampen harder when the user is closing in on a
   * target. Pass the current angular distance to the active body in degrees,
   * or null when nothing is selected. Adaptive smoothing factor goes from
   * ~0.22 (scanning) to ~0.07 (within 4°).
   */
  setProximityDeg: (deg: number | null) => void;
  /** Trigger the iOS permission prompt and start listening. Idempotent. */
  request: () => Promise<void>;
  /** Stop listening and forget the heading. */
  stop: () => void;
}

type DeviceOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** Smoothing alpha bounds — adaptive between these. Higher = more responsive. */
const ALPHA_FAR = 0.22;
const ALPHA_NEAR = 0.07;
/** Distance at which smoothing fully tightens to ALPHA_NEAR. */
const NEAR_DEG = 4;
/** Distance at which we begin tightening from ALPHA_FAR. */
const FAR_DEG = 20;
/** If we don't see an orientation event in this window after granting, fall back. */
const FIRST_EVENT_TIMEOUT_MS = 2500;

const DEG = Math.PI / 180;

// === North-anchor sampling gates ===================================

/**
 * Max |β| at which we'll believe the compass. At β = 90° the device's +Y axis
 * — the very axis `magneticHeading` describes — points at the zenith and the
 * reading is undefined; error grows as 1/cos(β) approaching it. 50° keeps the
 * horizontal projection at ≥64% of full length, well clear of the blow-up,
 * and is still a natural "holding the phone in front of me" pose.
 *
 * This bound is inferred from the eCompass geometry rather than measured, and
 * is the one number here most worth checking against a real device.
 */
const MAX_SAMPLE_TILT_DEG = 50;
/** iOS reports −1 when the magnetometer is uncalibrated. >20° is too coarse to use. */
const MAX_SAMPLE_ACCURACY_DEG = 20;
/**
 * Reject samples taken mid-swing. Heading and attitude arrive from two
 * independent subsystems (Core Location vs Core Motion) in one callback; while
 * the phone is turning, the latency skew between them is baked straight into
 * the offset estimate.
 */
const MAX_SAMPLE_RATE_DEG_PER_FRAME = 2;
/** Samples retained for the circular median. */
const SAMPLE_WINDOW = 24;
/** Below this many samples the anchor isn't trustworthy enough to show. */
const MIN_SAMPLES_TO_LATCH = 8;
/**
 * Re-anchor only once the fresh estimate disagrees with the latch by this
 * much. Correction stops below the threshold, so this is also the steady-state
 * error floor — it has to stay under the 3° telescope lock radius in
 * `SkyMap.lockRadiusDeg`, or a drifting anchor alone can hold a target
 * permanently outside its own lock cone.
 */
const REANCHOR_THRESHOLD_DEG = 2;
/** Cap re-anchor slew so a drift correction never visibly snaps the sky. */
const REANCHOR_SLEW_DEG_PER_FRAME = 0.15;

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Shortest signed difference a − b, in (−180, +180]. */
function angleDelta(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

/** Circular-mean low pass — averages on the unit circle so 359°→1° stays smooth. */
function smoothAngle(prev: number | null, next: number, alpha: number): number {
  if (prev === null) return next;
  const px = Math.cos(prev * DEG);
  const py = Math.sin(prev * DEG);
  const nx = Math.cos(next * DEG);
  const ny = Math.sin(next * DEG);
  const x = px * (1 - alpha) + nx * alpha;
  const y = py * (1 - alpha) + ny * alpha;
  let a = Math.atan2(y, x) / DEG;
  if (a < 0) a += 360;
  return a;
}

/**
 * Circular median — the sample minimising total angular distance to the rest.
 * Median rather than mean because magnetometer outliers near metal are large
 * and one-sided, and a mean lets a single bad reading drag the anchor.
 */
export function circularMedian(samples: number[]): number | null {
  if (!samples.length) return null;
  let best = samples[0];
  let bestCost = Infinity;
  for (const candidate of samples) {
    let cost = 0;
    for (const other of samples) cost += Math.abs(angleDelta(candidate, other));
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return best;
}

/** Screen rotation in degrees, or 0 where the API is unavailable. */
function screenAngle(): number {
  if (typeof window === 'undefined') return 0;
  const a = window.screen?.orientation?.angle;
  return typeof a === 'number' && Number.isFinite(a) ? a : 0;
}

export interface PointingResult {
  /**
   * Heading of the back of the phone in a yaw-arbitrary world frame, degrees.
   * Absolute only once `northOffset` is added. Null if alpha was missing.
   */
  headingRaw: number | null;
  /** Altitude in degrees, [−90, +90]. Yaw-independent, so always absolute. */
  altitude: number;
  /** Roll about the camera forward axis, degrees, screen-orientation corrected. */
  roll: number;
  /**
   * Azimuth of the device's +Y (top edge) in the same yaw-arbitrary frame.
   * This is the axis `webkitCompassHeading` measures, so comparing the two
   * yields the north offset. Null when the projection is too short to trust.
   */
  topAzRaw: number | null;
}

/**
 * Build the back-of-phone forward vector, the device's screen-up vector, and
 * the roll between screen-up and world-up projected into the camera plane,
 * from intrinsic ZXY Euler angles.
 *
 * Working from the full rotation matrix rather than reading altitude off `beta`
 * or `gamma` directly is what keeps this stable near vertical: those Euler
 * components individually gimbal-lock at β > 80° and wobble 15°+ with a steady
 * hand, which made high-altitude planets feel un-lockable.
 */
function buildCameraFrame(alphaDeg: number, betaDeg: number, gammaDeg: number) {
  const a = alphaDeg * DEG;
  const b = betaDeg * DEG;
  const g = gammaDeg * DEG;
  const sa = Math.sin(a), ca = Math.cos(a);
  const sb = Math.sin(b), cb = Math.cos(b);
  const sg = Math.sin(g), cg = Math.cos(g);

  // col2 of Rz(α)·Rx(β)·Ry(γ) — the device's screen-out (+Z) axis in world.
  // Back of phone is the negation of that.
  const fx = -(ca * sg + sa * sb * cg);
  const fy = -(sa * sg - ca * sb * cg);
  const fz = -(cb * cg);
  // col1 — device's screen-up (+Y) axis in world. This is the axis Core
  // Location's magneticHeading describes.
  const ux = -sa * cb;
  const uy = ca * cb;
  const uz = sb;

  // "Ideal" image-up = world-up projected onto the plane perpendicular to
  // camera-forward, then normalised.
  const dotFup = fz; // f · (0,0,1)
  let ix = -dotFup * fx;
  let iy = -dotFup * fy;
  let iz = 1 - dotFup * fz;
  const ilen = Math.hypot(ix, iy, iz);
  if (ilen < 1e-3) {
    // Camera aimed straight up or down — world-up is parallel to forward.
    // Fall back to "north" as the ideal image-up so roll stays defined.
    ix = 0; iy = 1; iz = 0;
  } else {
    ix /= ilen; iy /= ilen; iz /= ilen;
  }

  // Signed angle from ideal-up → actual-up around the forward axis.
  // dot = cos(roll); fwd · (ideal × actual) = sin(roll).
  const dot = Math.max(-1, Math.min(1, ix * ux + iy * uy + iz * uz));
  const cx = iy * uz - iz * uy;
  const cy = iz * ux - ix * uz;
  const cz = ix * uy - iy * ux;
  const sin = cx * fx + cy * fy + cz * fz;
  const rollRad = Math.atan2(sin, dot);

  return {
    back: { x: fx, y: fy, z: fz },
    up: { x: ux, y: uy, z: uz },
    rollDeg: rollRad / DEG,
  };
}

/**
 * Pull attitude out of a DeviceOrientationEvent, in a yaw-arbitrary world
 * frame. Deliberately does not consult the compass — anchoring to north is a
 * separate, gated concern handled by the caller.
 */
export function eventToPointing(e: DeviceOrientationEvent): PointingResult | null {
  const beta = e.beta;
  const gamma = e.gamma;
  const alphaRaw = e.alpha;
  if (
    beta == null || Number.isNaN(beta) ||
    gamma == null || Number.isNaN(gamma)
  ) {
    return null;
  }

  const alpha = alphaRaw != null && !Number.isNaN(alphaRaw) ? alphaRaw : 0;
  const frame = buildCameraFrame(alpha, beta, gamma);
  const v = frame.back;
  const altitude = Math.max(-90, Math.min(90, Math.asin(Math.max(-1, Math.min(1, v.z))) / DEG));

  // Heading = azimuth of the back-of-phone's horizontal projection,
  // atan2(East, North), in the frame's arbitrary yaw.
  let headingRaw: number | null = null;
  const horiz = Math.hypot(v.x, v.y);
  if (horiz > 1e-3) {
    headingRaw = wrap360(Math.atan2(v.x, v.y) / DEG);
  }

  // Azimuth of the device's top edge, same frame. Only meaningful while its
  // horizontal projection is long enough to define a direction.
  const u = frame.up;
  const uHoriz = Math.hypot(u.x, u.y);
  const topAzRaw = uHoriz > 0.2 ? wrap360(Math.atan2(u.x, u.y) / DEG) : null;

  // alpha/beta/gamma are portrait-referenced on every platform, so forward and
  // altitude need no screen correction. Roll does: it's measured against the
  // device's top edge, but the overlay renders against the current screen-up.
  const roll = frame.rollDeg - screenAngle();

  return {
    headingRaw,
    altitude,
    roll: ((roll + 540) % 360) - 180,
    topAzRaw,
  };
}

/** Linear low-pass for signed roll in degrees, wrap-aware across ±180°. */
function smoothRoll(prev: number | null, next: number, alpha: number): number {
  if (prev === null) return next;
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  let out = prev + delta * alpha;
  if (out > 180) out -= 360;
  else if (out < -180) out += 360;
  return out;
}

const LEGACY_OFFSET_KEY = 'stellar.sky.compass.offset';
/**
 * Range we accept for the user's calibration offset. ±180° covers any possible
 * heading error — a star alignment can legitimately need any value, and an
 * earlier ±30° cap silently swallowed real-world offsets, making the
 * calibration look broken whenever the magnetic environment was badly skewed.
 */
const MAX_OFFSET = 180;

function loadOffset(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    let raw = window.localStorage.getItem(key);
    if (!raw && key !== LEGACY_OFFSET_KEY) {
      raw = window.localStorage.getItem(LEGACY_OFFSET_KEY);
    }
    const n = raw ? parseFloat(raw) : 0;
    if (!isFinite(n)) return 0;
    return Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, n));
  } catch {
    return 0;
  }
}
function saveOffset(key: string, n: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(n));
  } catch { /* ignore */ }
}

/** Map angular distance to the active target → smoothing alpha. */
function alphaForProximity(deg: number | null): number {
  if (deg == null) return ALPHA_FAR;
  if (deg <= NEAR_DEG) return ALPHA_NEAR;
  if (deg >= FAR_DEG) return ALPHA_FAR;
  const t = (deg - NEAR_DEG) / (FAR_DEG - NEAR_DEG);
  return ALPHA_NEAR + (ALPHA_FAR - ALPHA_NEAR) * t;
}

export function useDeviceHeading(lat?: number | null, lon?: number | null): UseDeviceHeading {
  const [rawHeading, setRawHeading] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [roll, setRoll] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>('idle');
  const [live, setLive] = useState(false);
  const [offset, setOffset] = useState<number>(0);
  const [northSource, setNorthSource] = useState<NorthSource>('none');

  const offsetKey =
    lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)
      ? compassOffsetKey(lat, lon)
      : LEGACY_OFFSET_KEY;

  const declinationDeg = useMemo(() => {
    if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return 0;
    try {
      const field = geomagneticModel(new Date(), { allowOutOfBoundsModel: true }).point([lat, lon]);
      return Number.isFinite(field.decl) ? field.decl : 0;
    } catch {
      return 0;
    }
  }, [lat, lon]);

  // Read declination through a ref so the attached listener always applies the
  // current location's value — `attach` runs once per request(), and a GPS fix
  // arriving later would otherwise leave the old declination in its closure.
  const declinationRef = useRef(0);
  declinationRef.current = declinationDeg;

  const smoothedHeadingRef = useRef<number | null>(null);
  const smoothedAltRef = useRef<number | null>(null);
  const smoothedRollRef = useRef<number | null>(null);
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const proximityRef = useRef<number | null>(null);

  // North-anchor state. Refs rather than state so the hot event handler can
  // read and write without re-subscribing.
  const northOffsetRef = useRef<number | null>(null);
  const northSourceRef = useRef<NorthSource>('none');
  const samplesRef = useRef<number[]>([]);
  const prevTopAzRef = useRef<number | null>(null);
  /** Star alignment outranks the compass — stop re-anchoring once it's set. */
  const starAlignedRef = useRef(false);
  /**
   * Android fires both `deviceorientation` (relative alpha) and
   * `deviceorientationabsolute` (world-referenced alpha) into this same
   * handler. Their alpha origins differ by an arbitrary constant, so
   * interleaving them makes the heading jitter between two frames. Once an
   * absolute event has been seen, ignore the relative stream entirely.
   */
  const sawAbsoluteRef = useRef(false);

  // Per-site calibration — moving to a new observing site loads that site's
  // offset and invalidates every anchor derived at the previous one.
  useEffect(() => {
    setOffset(loadOffset(offsetKey));
    starAlignedRef.current = false;
    samplesRef.current = [];
    prevTopAzRef.current = null;
    northOffsetRef.current = null;
    northSourceRef.current = 'none';
    setNorthSource('none');
    smoothedHeadingRef.current = null;
    smoothedAltRef.current = null;
    smoothedRollRef.current = null;
  }, [offsetKey]);

  const detach = useCallback(() => {
    if (typeof window === 'undefined') return;
    const h = handlerRef.current;
    if (h) {
      window.removeEventListener('deviceorientation', h as EventListener, true);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', h as EventListener, true);
      }
      handlerRef.current = null;
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const attach = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unavailable');
      return;
    }
    detach();

    const handle = (e: DeviceOrientationEvent) => {
      if (e.absolute) sawAbsoluteRef.current = true;
      else if (sawAbsoluteRef.current) return; // stale relative stream — see ref docs
      const next = eventToPointing(e);
      if (!next) return;
      setLive(true);

      const declination = declinationRef.current;
      const ev = e as unknown as {
        webkitCompassHeading?: number;
        webkitCompassAccuracy?: number;
      };
      const compass = ev.webkitCompassHeading;
      const compassValid =
        typeof compass === 'number' && !Number.isNaN(compass) && compass >= 0;
      const compassAccuracy = ev.webkitCompassAccuracy;
      if (typeof compassAccuracy === 'number' && compassAccuracy >= 0) {
        setAccuracy(compassAccuracy);
      }

      // === North anchor ============================================
      if (starAlignedRef.current) {
        // User-solved anchor wins; leave it alone.
      } else if (e.absolute && !compassValid) {
        // Android `deviceorientationabsolute` — alpha already references
        // geomagnetic north, so the only correction left is declination.
        const target = wrap360(declination);
        if (northOffsetRef.current == null || northSourceRef.current !== 'absolute') {
          northOffsetRef.current = target;
          northSourceRef.current = 'absolute';
          setNorthSource('absolute');
        }
      } else if (compassValid && next.topAzRaw != null) {
        // iOS. Sample the offset only where magneticHeading is well defined.
        const beta = e.beta ?? 90;
        const levelEnough = Math.abs(beta) <= MAX_SAMPLE_TILT_DEG;
        const accurateEnough =
          typeof compassAccuracy !== 'number' ||
          (compassAccuracy > 0 && compassAccuracy <= MAX_SAMPLE_ACCURACY_DEG);
        const prevTop = prevTopAzRef.current;
        const steadyEnough =
          prevTop == null ||
          Math.abs(angleDelta(next.topAzRaw, prevTop)) <= MAX_SAMPLE_RATE_DEG_PER_FRAME;
        prevTopAzRef.current = next.topAzRaw;

        if (levelEnough && accurateEnough && steadyEnough) {
          // True azimuth of the top edge = magnetic heading + declination.
          // Offset is what turns the arbitrary frame into a true-north one.
          const sample = wrap360(compass + declination - next.topAzRaw);
          const buf = samplesRef.current;
          buf.push(sample);
          if (buf.length > SAMPLE_WINDOW) buf.shift();

          if (buf.length >= MIN_SAMPLES_TO_LATCH) {
            const median = circularMedian(buf);
            if (median != null) {
              const current = northOffsetRef.current;
              if (current == null) {
                northOffsetRef.current = median;
                northSourceRef.current = 'compass';
                setNorthSource('compass');
                // Everything smoothed so far was accumulated against a zero
                // anchor, so this latch shifts the true heading by up to 180°.
                // Drop the smoother state and let the next frame snap: easing
                // across a gap that wide would sweep the dome through every
                // bearing in between on its way to the right one.
                smoothedHeadingRef.current = null;
              } else {
                // Gyro yaw drifts a few degrees a minute in Core Motion's
                // arbitrary reference frame, so keep correcting — but only
                // past a threshold, and slewed, so the sky never jumps.
                const drift = angleDelta(median, current);
                if (Math.abs(drift) > REANCHOR_THRESHOLD_DEG) {
                  const step = Math.sign(drift) *
                    Math.min(Math.abs(drift), REANCHOR_SLEW_DEG_PER_FRAME);
                  const updated = wrap360(current + step);
                  northOffsetRef.current = updated;
                }
              }
            }
          }
        }
      }

      // === Attitude ================================================
      const alphaSmooth = alphaForProximity(proximityRef.current);

      if (next.headingRaw != null) {
        const anchor = northOffsetRef.current ?? 0;
        const absolute = wrap360(next.headingRaw + anchor);
        // No flip-rejection heuristic here any more: the 180° jumps it was
        // built to suppress came from re-deriving yaw off the compass every
        // frame. The anchor is now a slewed scalar, so a large frame-to-frame
        // change is a real turn and should track immediately.
        smoothedHeadingRef.current = smoothAngle(
          smoothedHeadingRef.current,
          absolute,
          alphaSmooth,
        );
        setRawHeading(smoothedHeadingRef.current);
      }

      const prevAlt = smoothedAltRef.current;
      const smoothedAlt = prevAlt == null
        ? next.altitude
        : prevAlt * (1 - alphaSmooth) + next.altitude * alphaSmooth;
      smoothedAltRef.current = smoothedAlt;
      setAltitude(smoothedAlt);

      const smoothedRoll = smoothRoll(smoothedRollRef.current, next.roll, alphaSmooth);
      smoothedRollRef.current = smoothedRoll;
      setRoll(smoothedRoll);
    };

    handlerRef.current = handle;
    window.addEventListener('deviceorientation', handle as EventListener, true);
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handle as EventListener, true);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (smoothedHeadingRef.current === null) setStatus('unavailable');
    }, FIRST_EVENT_TIMEOUT_MS);
  }, [detach]);

  const request = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unavailable');
      return;
    }
    const ctor = DeviceOrientationEvent as DeviceOrientationConstructor;
    if (typeof ctor.requestPermission === 'function') {
      try {
        const result = await ctor.requestPermission.call(ctor);
        if (result !== 'granted') {
          setStatus('denied');
          return;
        }
      } catch {
        setStatus('denied');
        return;
      }
    }
    setStatus('granted');
    attach();
  }, [attach]);

  const stop = useCallback(() => {
    detach();
    setLive(false);
    setRawHeading(null);
    setAltitude(null);
    setRoll(null);
    smoothedHeadingRef.current = null;
    smoothedAltRef.current = null;
    smoothedRollRef.current = null;
    samplesRef.current = [];
    prevTopAzRef.current = null;
    setStatus('idle');
  }, [detach]);

  const nudge = useCallback((delta: number) => {
    setOffset((prev) => {
      const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev + delta));
      saveOffset(offsetKey, next);
      return next;
    });
  }, [offsetKey]);

  const alignToAzimuth = useCallback((trueAzimuthDeg: number) => {
    const current = smoothedHeadingRef.current;
    if (current == null) return;
    setOffset((prev) => {
      // `current` already includes the previous offset, so the correction is
      // the residual between where we think we're aimed and where we are.
      const next = Math.max(
        -MAX_OFFSET,
        Math.min(MAX_OFFSET, prev + angleDelta(trueAzimuthDeg, wrap360(current + prev))),
      );
      saveOffset(offsetKey, next);
      return next;
    });
    starAlignedRef.current = true;
    northSourceRef.current = 'star';
    setNorthSource('star');
    // The compass anchor is now dead weight — freeze it where it stands so
    // the star solution isn't slowly dragged back toward the magnetometer.
    samplesRef.current = [];
    if (northOffsetRef.current == null) {
      northOffsetRef.current = 0;
    }
  }, [offsetKey]);

  const resetCalibration = useCallback(() => {
    setOffset(0);
    saveOffset(offsetKey, 0);
    starAlignedRef.current = false;
    samplesRef.current = [];
    northOffsetRef.current = null;
    northSourceRef.current = 'none';
    setNorthSource('none');
  }, [offsetKey]);

  const setProximityDeg = useCallback((deg: number | null) => {
    proximityRef.current = deg;
  }, []);

  useEffect(() => detach, [detach]);

  // Until north is anchored the reading is a relative bearing, not a compass
  // direction — surfacing it as one would point users at empty sky.
  const northReady = northSource !== 'none';
  const heading =
    rawHeading == null || !northReady ? null : wrap360(rawHeading + offset);

  return {
    heading,
    altitude,
    roll,
    live,
    status,
    accuracy,
    northSource,
    northReady,
    offset,
    nudge,
    alignToAzimuth,
    resetCalibration,
    setProximityDeg,
    request,
    stop,
  };
}

/**
 * Great-circle separation between two alt/az directions, in degrees.
 * Returns 0..180. This is what to use for "is the user pointing at the
 * target?" — single number, no zenith singularity.
 */
export function angularSeparation(
  alt1: number, az1: number,
  alt2: number, az2: number,
): number {
  const a1 = alt1 * DEG;
  const a2 = alt2 * DEG;
  const dAz = (az1 - az2) * DEG;
  const cosD = Math.sin(a1) * Math.sin(a2) + Math.cos(a1) * Math.cos(a2) * Math.cos(dAz);
  return Math.acos(Math.max(-1, Math.min(1, cosD))) / DEG;
}
