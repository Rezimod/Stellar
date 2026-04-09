'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PlanetInfo } from "@/lib/planets";
import PlanetCard from './PlanetCard';
import PlanetDetail from './PlanetDetail';
import { useLocation } from '@/hooks/useLocation';

export default function PlanetGrid() {
  const t = useTranslations('sky');
  const { lat, lng, ready } = useLocation();
  const [planets, setPlanets] = useState<PlanetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
      .then(r => r.json() as Promise<PlanetInfo[]>)
      .then(data => { setPlanets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ready, lat, lng]);

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
        <p className="text-[var(--text-secondary)] text-sm">{t('noPlanets')}</p>
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
