'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import type { PlanetInfo } from "@/lib/planets";
import PlanetCard from './PlanetCard';
import PlanetDetail from './PlanetDetail';
import { useLocation } from '@/hooks/useLocation';
import { MISSIONS } from '@/lib/constants';

const PLANET_MISSION_IDS = ['moon', 'jupiter', 'saturn', 'mars'];
const STATIC_PLANETS = MISSIONS.filter(m => PLANET_MISSION_IDS.includes(m.id));

export default function PlanetGrid() {
  const t = useTranslations('sky');
  const { lat, lng, ready } = useLocation();
  const router = useRouter();
  const { authenticated, login } = usePrivy();

  const handleObserve = () => {
    if (authenticated) {
      router.push('/missions');
    } else {
      login();
    }
  };
  const [planets, setPlanets] = useState<PlanetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);

  const load = (lat: number, lng: number) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<PlanetInfo[]>; })
      .then(data => { setPlanets(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    if (!ready) return;
    load(lat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lat, lng]);

  if (!ready || loading) {
    return (
      <div className="flex flex-col gap-3">
        {!ready && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full border border-[#34d399] border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-slate-500 text-xs">Detecting your location…</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || planets.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-center justify-between glass-card px-4 py-3"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-slate-400 text-sm">{t('forecastError')}</p>
            <button
              onClick={() => load(lat, lng)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STATIC_PLANETS.map(m => (
            <div key={m.id} className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="text-white text-sm font-semibold">{m.name}</span>
                </div>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-[#0F1F3D] text-slate-400 border-[rgba(56,240,255,0.12)]">
                  Check tonight
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]" />
              <div className="grid grid-cols-3 gap-1 text-center">
                {(['Rise', 'Transit', 'Set'] as const).map(label => (
                  <div key={label}>
                    <p className="text-[var(--text-dim)] text-[9px] uppercase tracking-wide">{label}</p>
                    <p className="text-slate-500 text-xs">—</p>
                  </div>
                ))}
              </div>
              <button
                onClick={handleObserve}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg mt-2"
              style={{ background: 'linear-gradient(to right, #FFD166, #CC9A33)', color: '#000' }}
            >
              Observe This
            </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {planets.map(p => (
          <div key={p.key} className="flex flex-col gap-2">
            <button className="text-left" onClick={() => setSelectedPlanet(p)}>
              <PlanetCard planet={p} />
            </button>
            <button
              onClick={handleObserve}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg w-full"
              style={{ background: 'linear-gradient(to right, #FFD166, #CC9A33)', color: '#000' }}
            >
              Observe This
            </button>
          </div>
        ))}
      </div>
      {selectedPlanet && (
        <PlanetDetail planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}
    </>
  );
}
