'use client';

import { useState, useEffect } from 'react';

const TBILISI = { lat: 41.6941, lng: 44.8337 };
let cachedLocation: { lat: number; lng: number } | null = null;
let pendingCallbacks: ((loc: { lat: number; lng: number }) => void)[] = [];
let requested = false;

export function useLocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    cachedLocation
  );

  useEffect(() => {
    if (cachedLocation) { setLoc(cachedLocation); return; }
    pendingCallbacks.push(setLoc);
    if (requested) return;
    requested = true;

    if (!navigator.geolocation) {
      const fb = TBILISI;
      cachedLocation = fb;
      pendingCallbacks.forEach(cb => cb(fb));
      pendingCallbacks = [];
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const result = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cachedLocation = result;
        pendingCallbacks.forEach(cb => cb(result));
        pendingCallbacks = [];
      },
      () => {
        cachedLocation = TBILISI;
        pendingCallbacks.forEach(cb => cb(TBILISI));
        pendingCallbacks = [];
      },
      { timeout: 5000 }
    );
  }, []);

  return { ...(loc ?? TBILISI), ready: loc !== null };
}
