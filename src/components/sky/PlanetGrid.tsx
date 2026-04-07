'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getVisiblePlanets, PlanetInfo } from '@/lib/planets';
import PlanetCard from './PlanetCard';

const TBILISI = { lat: 41.6941, lng: 44.8337 };

export default function PlanetGrid() {
  const t = useTranslations('sky');
  const [planets, setPlanets] = useState<PlanetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function calc(lat: number, lng: number) {
      const result = getVisiblePlanets(lat, lng, new Date());
      setPlanets(result);
      setLoading(false);
    }

    if (!navigator.geolocation) {
      calc(TBILISI.lat, TBILISI.lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => calc(pos.coords.latitude, pos.coords.longitude),
      ()  => calc(TBILISI.lat, TBILISI.lng),
      { timeout: 5000 },
    );
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (planets.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-[var(--text-secondary)] text-sm">
        No planet data available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {planets.map(p => <PlanetCard key={p.key} planet={p} />)}
    </div>
  );
}
