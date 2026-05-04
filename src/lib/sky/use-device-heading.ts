'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live compass heading from the device's orientation sensor.
 *
 * Returned `heading` is in degrees, 0 = magnetic north, increases clockwise.
 * Smoothed with a circular-mean low-pass to kill the jitter you'd otherwise
 * see on every dome rotation.
 *
 * iOS Safari requires a user-gesture-triggered permission prompt; that's
 * what `request()` is for. Android grants it automatically and you can call
 * `request()` anyway — it's a no-op there.
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
  /** Best-effort accuracy in degrees from iOS, or null. */
  accuracy: number | null;
  /** Persistent calibration nudge applied on top of the raw sensor heading. */
  offset: number;
  /** Add `delta` degrees to the calibration offset. Persisted to localStorage. */
  nudge: (delta: number) => void;
  /** Reset the calibration offset to zero. */
  resetCalibration: () => void;
  /** Trigger the iOS permission prompt and start listening. Idempotent. */
  request: () => Promise<void>;
  /** Stop listening and forget the heading. */
  stop: () => void;
}

type DeviceOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** Low-pass smoothing factor in [0..1]. Higher = more responsive, less smooth. */
const SMOOTH_ALPHA = 0.18;
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
 * Current screen rotation in degrees. iOS Safari already corrects
 * `webkitCompassHeading` for screen orientation, so we only apply this for
 * the Android (`deviceorientationabsolute`) path.
 */
function screenAngle(): number {
  if (typeof window === 'undefined') return 0;
  const so = (window.screen as Screen & { orientation?: { angle?: number } }).orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  // Legacy fallback.
  const wo = (window as Window & { orientation?: number }).orientation;
  return typeof wo === 'number' ? wo : 0;
}

/** Pull a compass heading out of a DeviceOrientationEvent across browsers. */
function eventHeading(e: DeviceOrientationEvent): number | null {
  const ev = e as unknown as { webkitCompassHeading?: number };
  if (typeof ev.webkitCompassHeading === 'number' && !Number.isNaN(ev.webkitCompassHeading)) {
    // iOS: 0 = true north (Apple corrects for declination), increases clockwise,
    // and is already screen-orientation corrected.
    return ev.webkitCompassHeading;
  }
  if (e.alpha != null && !Number.isNaN(e.alpha) && e.absolute) {
    // Android `deviceorientationabsolute`: alpha is 0 when device top points
    // north, increases counter-clockwise → invert to compass and rotate by
    // current screen orientation so landscape mode matches portrait.
    const compass = (360 - e.alpha + screenAngle()) % 360;
    return (compass + 360) % 360;
  }
  return null;
}

const OFFSET_KEY = 'stellar.sky.compass.offset';
const MAX_OFFSET = 30;

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
      const next = eventHeading(e);
      if (next == null) return;
      setLive(true);
      smoothedHeadingRef.current = smoothAngle(smoothedHeadingRef.current, next, SMOOTH_ALPHA);
      setRawHeading(smoothedHeadingRef.current);

      // Pitch the back camera is aimed at depends on which axis is "up" given
      // the current screen orientation. In portrait, beta tracks pitch and
      // altitude = beta − 90. In landscape, the long edge is horizontal and
      // gamma takes over; its sign flips between the two landscape rotations.
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta != null && !Number.isNaN(beta)) {
        const sa = screenAngle();
        let rawAlt: number;
        if (sa === 90 && gamma != null && !Number.isNaN(gamma)) {
          // Phone rotated 90° (home button on left in old phones / right edge up).
          rawAlt = -gamma;
        } else if ((sa === 270 || sa === -90) && gamma != null && !Number.isNaN(gamma)) {
          rawAlt = gamma;
        } else if (sa === 180) {
          rawAlt = 90 - beta;
        } else {
          rawAlt = beta - 90;
        }
        rawAlt = Math.max(-90, Math.min(90, rawAlt));
        const prev = smoothedAltRef.current;
        const smoothed = prev == null ? rawAlt : prev * (1 - SMOOTH_ALPHA) + rawAlt * SMOOTH_ALPHA;
        smoothedAltRef.current = smoothed;
        setAltitude(smoothed);
      }

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
      if (!live && smoothedHeadingRef.current === null) {
        setStatus('unavailable');
      }
    }, FIRST_EVENT_TIMEOUT_MS);
  }, [detach, live]);

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

  useEffect(() => detach, [detach]);

  // Apply the calibration offset to the raw sensor heading. Wrapped to [0, 360).
  const heading = rawHeading == null ? null : ((rawHeading + offset) % 360 + 360) % 360;

  return { heading, altitude, live, status, accuracy, offset, nudge, resetCalibration, request, stop };
}

/** Signed shortest difference between two compass directions, in degrees [-180..+180]. */
export function headingDelta(targetAz: number, fromAz: number): number {
  return ((targetAz - fromAz + 540) % 360) - 180;
}
