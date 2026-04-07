'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PlanetInfo } from "@/lib/planets";
import PlanetCard from './PlanetCard';
import PlanetDetail from './PlanetDetail';

const TBILISI = { lat: 41.6941, lng: 44.8337 };

export default function PlanetGrid() {
  const t = useTranslations('sky');
  const [planets, setPlanets] = useState<PlanetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);

  useEffect(() => {
    function load(lat: number, lng: number) {
      fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
        .then(r => r.json() as Promise<PlanetInfo[]>)
        .then(data => { setPlanets(data); setLoading(false); })
        .catch(() => setLoading(false));
    }

    if (!navigator.geolocation) {
      load(TBILISI.lat, TBILISI.lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => load(pos.coords.latitude, pos.coords.longitude),
      ()  => load(TBILISI.lat, TBILISI.lng),
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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {planets.map(p => (
          <button key={p.key} className="text-left" onClick={() => setSelectedPlanet(p)}>
            <PlanetCard planet={p} />
          </button>
        ))}
      </div>
      {selectedPlanet && (
        <PlanetDetail planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}
    </>
  );
}
