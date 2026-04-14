'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLANETS } from '@/lib/learn-data';
import { MISSIONS } from '@/lib/constants';

interface PlanetInfo {
  key: string;
  altitude: number;
  visible: boolean;
}

interface Props {
  locale: 'en' | 'ka';
}

export default function TonightsBanner({ locale }: Props) {
  const [best, setBest] = useState<{ key: string; altitude: number; missionId: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/sky/planets')
      .then(r => r.json())
      .then((planets: PlanetInfo[]) => {
        const missionKeys = new Set(MISSIONS.map(m => m.id));
        const planetData = PLANETS.filter(p => 'missionId' in p && p.missionId);

        const candidate = planets
          .filter(p => p.visible && p.altitude > 10)
          .filter(p => planetData.some(pd => pd.key === p.key && 'missionId' in pd))
          .sort((a, b) => b.altitude - a.altitude)[0];

        if (candidate) {
          const match = planetData.find(pd => pd.key === candidate.key);
          if (match && 'missionId' in match && match.missionId && missionKeys.has(match.missionId)) {
            setBest({ key: candidate.key, altitude: Math.round(candidate.altitude), missionId: match.missionId });
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const planetEntry = best ? PLANETS.find(p => p.key === best.key) : null;

  if (!best || !planetEntry) {
    return (
      <Link
        href="/sky"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:border-white/15"
        style={{
          background: 'linear-gradient(135deg, rgba(56,240,255,0.04), rgba(20,184,166,0.02))',
          border: '1px solid rgba(56,240,255,0.1)',
        }}
      >
        <span className="text-xl">🌙</span>
        <p className="text-slate-400 text-xs">
          {locale === 'ka'
            ? '맑은 ცა? შეამოწმე ღამის ამინდი →'
            : 'Clear skies? Check the sky forecast for tonight\'s targets →'}
        </p>
      </Link>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(56,240,255,0.06), rgba(20,184,166,0.03))',
        border: '1px solid rgba(56,240,255,0.15)',
      }}
    >
      <span className="text-2xl flex-shrink-0">{planetEntry.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold">
          {locale === 'ka'
            ? `${planetEntry.name.ka} ახლა ცაზეა — ${best.altitude}° სიმაღლეზე`
            : `${planetEntry.name.en} is up tonight at ${best.altitude}° altitude`}
        </p>
      </div>
      <Link
        href="/missions"
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: 'rgba(56,240,255,0.12)', color: '#38F0FF', border: '1px solid rgba(56,240,255,0.2)' }}
      >
        {locale === 'ka' ? 'მისია →' : 'Start Mission →'}
      </Link>
    </div>
  );
}
