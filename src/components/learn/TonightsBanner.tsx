'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  // Skeleton
  if (!loaded) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          height: '70px',
        }}
      >
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 9, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ height: 7, width: '38%', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
          </div>
        </div>
      </div>
    );
  }

  const planetEntry = best ? PLANETS.find(p => p.key === best.key) : null;

  // No visible target — simple forecast nudge
  if (!best || !planetEntry) {
    return (
      <Link
        href="/sky"
        className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 179, 71,0.05), rgba(94, 234, 212,0.02))',
          border: '1px solid rgba(255, 179, 71,0.1)',
        }}
      >
        <span className="text-xl">🌙</span>
        <p className="text-text-muted text-xs leading-snug flex-1">
          {locale === 'ka'
            ? '맑은 ცა? შეამოწმე ღამის ამინდი →'
            : "Clear skies? Check the sky forecast for tonight's targets →"}
        </p>
      </Link>
    );
  }

  // Live planet banner
  const img = (planetEntry as { img?: string }).img;
  const color = (planetEntry as { color?: string }).color ?? 'var(--terracotta)';

  return (
    <>
      <style>{`
        @keyframes liveRing {
          0%   { transform:scale(1);   opacity:.7; }
          100% { transform:scale(2.4); opacity:0; }
        }
        @keyframes bannerIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes altitudePulse {
          0%,100% { opacity:.7; }
          50%      { opacity:1; }
        }
      `}</style>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.07) 0%, rgba(8,11,26,0.95) 60%)`,
          border: `1px solid rgba(${hexToRgb(color)},0.2)`,
          boxShadow: `0 0 0 1px rgba(${hexToRgb(color)},0.06), 0 8px 32px rgba(0,0,0,0.5)`,
          animation: 'bannerIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Top color seam */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${color}88 40%, ${color}44 100%)`,
        }} />

        <div className="flex items-center gap-3 px-4 py-3.5" style={{ position: 'relative', zIndex: 1 }}>
          {/* Planet image */}
          {img && (
            <div
              className="relative flex-shrink-0"
              style={{
                width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                border: `1.5px solid ${color}40`,
                boxShadow: `0 0 16px ${color}30`,
              }}
            >
              <Image src={img} alt={planetEntry.name[locale]} fill className="object-cover" sizes="42px" />
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            {/* Live label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7, flexShrink: 0 }}>
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'var(--success)',
                  animation: 'liveRing 1.8s ease-out infinite',
                  opacity: 0,
                }} />
                <span style={{
                  position: 'relative', width: 7, height: 7, borderRadius: '50%', background: 'var(--success)',
                  boxShadow: '0 0 6px var(--seafoam)',
                  display: 'block',
                }} />
              </span>
              <span style={{ fontSize: '9px', color: 'var(--success)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                {locale === 'ka' ? 'ახლა ხილვადია' : 'Visible now'}
              </span>
            </div>

            <p className="text-text-primary font-semibold text-sm leading-snug">
              {locale === 'ka'
                ? `${planetEntry.name.ka} ახლა ცაზეა`
                : `${planetEntry.name.en} is up tonight`}
            </p>
            <p style={{
              fontSize: '11px', color: color, opacity: 0.8,
              animation: 'altitudePulse 3s ease-in-out infinite',
            }}>
              {best.altitude}° {locale === 'ka' ? 'სიმაღლეზე' : 'altitude'}
            </p>
          </div>

          {/* Mission CTA */}
          <Link
            href="/missions"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 active:scale-95"
            style={{
              background: `rgba(${hexToRgb(color)},0.12)`,
              color: color,
              border: `1px solid rgba(${hexToRgb(color)},0.25)`,
              boxShadow: `0 0 12px rgba(${hexToRgb(color)},0.1)`,
            }}
          >
            {locale === 'ka' ? 'მისია →' : 'Mission →'}
          </Link>
        </div>
      </div>
    </>
  );
}

// Hex → "r,g,b" for rgba() usage
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '99,102,241';
  return `${r},${g},${b}`;
}
