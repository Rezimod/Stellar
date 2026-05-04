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

/** Pull a compass heading out of a DeviceOrientationEvent across browsers. */
function eventHeading(e: DeviceOrientationEvent): number | null {
  const ev = e as unknown as { webkitCompassHeading?: number };
  if (typeof ev.webkitCompassHeading === 'number' && !Number.isNaN(ev.webkitCompassHeading)) {
    // iOS: 0 = magnetic north, increases clockwise.
    return ev.webkitCompassHeading;
  }
  if (e.alpha != null && !Number.isNaN(e.alpha) && e.absolute) {
    // Android `deviceorientationabsolute`: alpha is 0 when device top points
    // north, increases counter-clockwise → invert to compass.
    return (360 - e.alpha) % 360;
  }
  return null;
}

export function useDeviceHeading(): UseDeviceHeading {
  const [heading, setHeading] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>('idle');
  const [live, setLive] = useState(false);

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
      setHeading(smoothedHeadingRef.current);

      // beta=0 → screen flat face up, back of phone points down → alt -90.
      // beta=90 → phone upright, back points at horizon → alt 0.
      // beta=180 → phone tilted backward, back points up → alt +90.
      if (e.beta != null && !Number.isNaN(e.beta)) {
        const rawAlt = Math.max(-90, Math.min(90, e.beta - 90));
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
    setHeading(null);
    setAltitude(null);
    smoothedHeadingRef.current = null;
    smoothedAltRef.current = null;
    setStatus('idle');
  }, [detach]);

  useEffect(() => detach, [detach]);

  return { heading, altitude, live, status, accuracy, request, stop };
}

/** Signed shortest difference between two compass directions, in degrees [-180..+180]. */
export function headingDelta(targetAz: number, fromAz: number): number {
  return ((targetAz - fromAz + 540) % 360) - 180;
}
