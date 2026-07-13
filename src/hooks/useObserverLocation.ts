'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_OBSERVER, STELLAR_LOCATION_KEY, LOCATION_UPDATED_EVENT } from '@/lib/observer-location';
import { parseStoredLocation } from '@/lib/observer-location';
import type { UserLocation } from '@/lib/location';

export interface UseObserverLocationReturn {
  lat: number;
  lng: number;
  location?: UserLocation | null;
  loading: boolean;
}

/** Hook to get the observer's current location (GPS if available, stored, or default Tbilisi). */
export function useObserverLocation(): UseObserverLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get stored location
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STELLAR_LOCATION_KEY);
      const parsed = parseStoredLocation(stored);
      if (parsed) {
        setLocation(parsed);
        setLoading(false);
        return;
      }
    }

    // Fallback to default
    setLocation(DEFAULT_OBSERVER);
    setLoading(false);
  }, []);

  // Listen for location updates
  useEffect(() => {
    const handleLocationUpdate = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STELLAR_LOCATION_KEY);
        const parsed = parseStoredLocation(stored);
        if (parsed) {
          setLocation(parsed);
        }
      }
    };

    window.addEventListener(LOCATION_UPDATED_EVENT, handleLocationUpdate);
    return () => window.removeEventListener(LOCATION_UPDATED_EVENT, handleLocationUpdate);
  }, []);

  const finalLocation = location || DEFAULT_OBSERVER;
  return {
    lat: finalLocation.lat,
    lng: finalLocation.lon,
    location: finalLocation,
    loading,
  };
}
