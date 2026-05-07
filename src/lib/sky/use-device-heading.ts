'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live phone pointing — the (azimuth, altitude) the back of the device is
 * aimed at, derived from DeviceOrientationEvent.
 *
 * Why a quaternion path: the older code branched on `screen.orientation.angle`
 * and read altitude from `beta` or `gamma` directly. That breaks near vertical
 * (β > 80°) because of gimbal lock — the pitch reading wobbles by 15°+ even
 * when the user's hand is steady, which makes high-altitude planets feel
 * un-lockable. Building the full ZXY rotation matrix and reading the back-of-
 * phone vector's components in world frame fixes this regardless of how the
 * user holds the phone.
 *
 * Azimuth still prefers `webkitCompassHeading` on iOS — it's already corrected
 * for declination and screen orientation, both of which we'd otherwise have to
 * approximate.
 */
export type HeadingStatus = 'idle' | 'granted' | 'denied' | 'unavailable';

export interface UseDeviceHeading {
  /** Current heading in degrees, 0..360, or null until the first event fires. */
  heading: number | null;
  /**
   * Direction the back of the phone is pointing in altitude, in degrees.
   * −90 = straight down, 0 = horizon, +90 = zenith. Null until the first event.
   */
  altitude: number | null;
  /** Has Stellar received any heading event yet? */
  live: boolean;
  status: HeadingStatus;
  /** Best-effort heading accuracy in degrees from iOS, or null. */
  accuracy: number | null;
  /** Persistent calibration nudge applied on top of the raw sensor heading. */
  offset: number;
  /** Add `delta` degrees to the calibration offset. Persisted to localStorage. */
  nudge: (delta: number) => void;
  /** Reset the calibration offset to zero. */
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
 * Back-of-phone unit vector in Earth frame (x=East, y=North, z=Up), built
 * from intrinsic ZXY Euler angles (W3C DeviceOrientationEvent convention).
 * The 3rd column of R = Rz(α)·Rx(β)·Ry(γ) is the device Z axis in world; the
 * back camera is the negation of that.
 */
function backVectorWorld(alphaDeg: number, betaDeg: number, gammaDeg: number) {
  const a = alphaDeg * DEG;
  const b = betaDeg * DEG;
  const g = gammaDeg * DEG;
  const sa = Math.sin(a), ca = Math.cos(a);
  const sb = Math.sin(b), cb = Math.cos(b);
  const sg = Math.sin(g), cg = Math.cos(g);
  const zx = ca * sg + sa * sb * cg;
  const zy = sa * sg - ca * sb * cg;
  const zz = cb * cg;
  return { x: -zx, y: -zy, z: -zz };
}

interface PointingResult {
  /** Compass heading in degrees, 0=N, increasing clockwise. Null if alpha was missing. */
  heading: number | null;
  /** Altitude in degrees, [-90, +90]. */
  altitude: number;
}

/** Pull a stable (heading, altitude) pair out of a DeviceOrientationEvent across browsers. */
function eventToPointing(e: DeviceOrientationEvent): PointingResult | null {
  const ev = e as unknown as { webkitCompassHeading?: number };
  const beta = e.beta;
  const gamma = e.gamma;
  if (beta == null || Number.isNaN(beta) || gamma == null || Number.isNaN(gamma)) {
    return null;
  }

  // Resolve a world-frame α to feed the rotation matrix.
  // - iOS: `webkitCompassHeading` is true-north-corrected and screen-orientation-aware,
  //   but it tracks the heading of the TOP of the device's horizontal projection — not
  //   the back camera. Its relationship to world α depends on β:
  //     • cos(β) ≥ 0 (phone leaning forward, β ∈ [-90°, 90°]):
  //         webkit ≈ (360 − αworld) mod 360
  //     • cos(β) < 0 (phone tilted backward past vertical, β ∈ (90°, 180°]):
  //         webkit ≈ (180 − αworld) mod 360
  //   Without inverting the right branch the heading flips 180° as soon as the user
  //   tilts past vertical to look at anything near the zenith — i.e. exactly the
  //   "I pointed at the moon and it labeled it the sun" bug.
  // - Android `deviceorientationabsolute`: α is already in world frame.
  // - Otherwise α drifts; do the best we can.
  const compass = ev.webkitCompassHeading;
  const compassValid = typeof compass === 'number' && !Number.isNaN(compass) && compass >= 0;
  const alphaRaw = e.alpha;

  let alphaWorld: number;
  if (compassValid) {
    const cb = Math.cos(beta * DEG);
    if (cb >= 0) {
      alphaWorld = (360 - (compass as number) + 360) % 360;
    } else {
      alphaWorld = (180 - (compass as number) + 360) % 360;
    }
  } else if (alphaRaw != null && !Number.isNaN(alphaRaw) && e.absolute) {
    alphaWorld = alphaRaw;
  } else {
    alphaWorld = alphaRaw != null && !Number.isNaN(alphaRaw) ? alphaRaw : 0;
  }

  const v = backVectorWorld(alphaWorld, beta, gamma);
  const altitude = Math.max(-90, Math.min(90, Math.asin(Math.max(-1, Math.min(1, v.z))) / DEG));

  // Heading = azimuth of the back-of-phone's horizontal projection, atan2(East, North).
  // Same path on iOS and Android — the only difference is how we anchored α above.
  let heading: number | null = null;
  const horiz = Math.hypot(v.x, v.y);
  if (horiz > 1e-3) {
    let h = Math.atan2(v.x, v.y) / DEG;
    h = ((h % 360) + 360) % 360;
    heading = h;
  } else if (compassValid) {
    // Back camera is aimed straight up or down — no horizontal component.
    // Fall back to the raw compass so the dome still rotates with the body.
    heading = compass as number;
  }

  return { heading, altitude };
}

const OFFSET_KEY = 'stellar.sky.compass.offset';
/**
 * Range we accept for the user's calibration offset. ±180° covers any
 * possible heading error (magnetic declination, indoor interference,
 * sensor mis-zero, declination uncorrected on Android). Earlier we capped
 * this at ±30°, which silently swallowed real-world offsets >30° — making
 * the one-shot calibration look broken when the magnetic environment was
 * skewed by more than that.
 */
const MAX_OFFSET = 180;

function loadOffset(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(OFFSET_KEY);
    const n = raw ? parseFloat(raw) : 0;
    if (!isFinite(n)) return 0;
    return Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, n));
  } catch {
    return 0;
  }
}
function saveOffset(n: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFSET_KEY, String(n));
  } catch { /* ignore */ }
}

/** Map angular distance to the active target → smoothing alpha. */
function alphaForProximity(deg: number | null): number {
  if (deg == null) return ALPHA_FAR;
  if (deg <= NEAR_DEG) return ALPHA_NEAR;
  if (deg >= FAR_DEG) return ALPHA_FAR;
  // Linear ramp between NEAR_DEG and FAR_DEG.
  const t = (deg - NEAR_DEG) / (FAR_DEG - NEAR_DEG);
  return ALPHA_NEAR + (ALPHA_FAR - ALPHA_NEAR) * t;
}

export function useDeviceHeading(): UseDeviceHeading {
  const [rawHeading, setRawHeading] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>('idle');
  const [live, setLive] = useState(false);
  const [offset, setOffset] = useState<number>(0);

  // Lazy-load offset on mount (client-only — localStorage isn't on the server).
  useEffect(() => {
    setOffset(loadOffset());
  }, []);

  const smoothedHeadingRef = useRef<number | null>(null);
  const smoothedAltRef = useRef<number | null>(null);
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const proximityRef = useRef<number | null>(null);

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
      const next = eventToPointing(e);
      if (!next) return;
      setLive(true);

      const alphaSmooth = alphaForProximity(proximityRef.current);

      if (next.heading != null) {
        smoothedHeadingRef.current = smoothAngle(smoothedHeadingRef.current, next.heading, alphaSmooth);
        setRawHeading(smoothedHeadingRef.current);
      }

      const prevAlt = smoothedAltRef.current;
      const smoothedAlt = prevAlt == null
        ? next.altitude
        : prevAlt * (1 - alphaSmooth) + next.altitude * alphaSmooth;
      smoothedAltRef.current = smoothedAlt;
      setAltitude(smoothedAlt);

      const acc = (e as unknown as { webkitCompassAccuracy?: number }).webkitCompassAccuracy;
      if (typeof acc === 'number' && acc >= 0) setAccuracy(acc);
    };
    handlerRef.current = handle;
    window.addEventListener('deviceorientation', handle as EventListener, true);
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handle as EventListener, true);
    }

    timeoutRef.current = window.setTimeout(() => {
      // No usable heading after the timeout — sensor is dead or absent.
      if (smoothedHeadingRef.current === null) {
        setStatus('unavailable');
      }
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
    smoothedHeadingRef.current = null;
    smoothedAltRef.current = null;
    setStatus('idle');
  }, [detach]);

  const nudge = useCallback((delta: number) => {
    setOffset((prev) => {
      const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, prev + delta));
      saveOffset(next);
      return next;
    });
  }, []);

  const resetCalibration = useCallback(() => {
    setOffset(0);
    saveOffset(0);
  }, []);

  const setProximityDeg = useCallback((deg: number | null) => {
    proximityRef.current = deg;
  }, []);

  useEffect(() => detach, [detach]);

  // Apply the calibration offset to the raw sensor heading. Wrapped to [0, 360).
  const heading = rawHeading == null ? null : ((rawHeading + offset) % 360 + 360) % 360;

  return {
    heading,
    altitude,
    live,
    status,
    accuracy,
    offset,
    nudge,
    resetCalibration,
    setProximityDeg,
    request,
    stop,
  };
}

/** Signed shortest difference between two compass directions, in degrees [-180..+180]. */
export function headingDelta(targetAz: number, fromAz: number): number {
  return ((targetAz - fromAz + 540) % 360) - 180;
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
