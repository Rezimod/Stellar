'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import BackButton from '@/components/shared/BackButton';
import { Eye } from 'lucide-react';
import { LOCATIONS } from '@/lib/darksky-locations';

const DarkSkyMap = dynamic(
  () => import('@/components/darksky/DarkSkyMap'),
  { ssr: false, loading: () => <div style={{ height: 400, background: '#0D1321', borderRadius: 0 }} /> }
);

function bortleColor(b: number): string {
  if (b <= 2) return '#34d399';
  if (b <= 4) return '#FFD166';
  if (b <= 6) return '#f97316';
  return '#ef4444';
}

function bortleLabel(b: number): string {
  if (b <= 2) return 'Pristine';
  if (b <= 4) return 'Rural';
  if (b <= 6) return 'Suburban';
  return 'City';
}

const STATS = [
  { label: 'Sites Mapped', value: '9' },
  { label: 'Dark Sites (Bortle ≤3)', value: '5' },
  { label: 'Countries', value: '3' },
];

export default function DarkSkyPage() {
  return (
    <div
      className="min-h-screen px-4 py-8 sm:py-12"
      style={{ background: '#070B14', fontFamily: 'Georgia, serif' }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <BackButton />
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye size={20} color="#34d399" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Dark Sky Network
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Community light pollution map — powered by Stellar observers
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(s => (
            <div
              key={s.label}
              className="rounded-2xl px-4 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-xl sm:text-2xl font-bold text-[#38F0FF]">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Global — Light Pollution Readings</span>
            <span className="text-[11px] text-slate-600">9 observer reports</span>
          </div>

          <DarkSkyMap />

          {/* Legend */}
          <div className="px-5 pb-5 pt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[
              { range: '1–2', color: '#34d399', label: 'Pristine' },
              { range: '3–4', color: '#FFD166', label: 'Rural' },
              { range: '5–6', color: '#f97316', label: 'Suburban' },
              { range: '7–9', color: '#ef4444', label: 'City' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-slate-400">
                  Bortle {item.range} — {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Location list */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
            Observer Reports
          </h2>
          {LOCATIONS.map(loc => {
            const color = bortleColor(loc.bortle);
            const label = bortleLabel(loc.bortle);
            return (
              <div
                key={loc.name}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1">
                  <span className="text-white text-sm font-semibold">{loc.name}</span>
                  <span className="text-slate-600 text-xs ml-2">{loc.region}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold" style={{ color }}>
                    Bortle {loc.bortle}
                  </span>
                  <span className="text-slate-600 text-xs ml-1.5">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.4))',
            border: '1px solid rgba(56,240,255,0.1)',
          }}
        >
          <p className="text-white font-semibold mb-1.5">Contribute to the map</p>
          <p className="text-slate-500 text-sm mb-5">
            Add your reading by completing a sky mission
          </p>
          <Link
            href="/missions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #38F0FF, #0ea5e9)', color: '#070B14' }}
          >
            Start a Mission →
          </Link>
        </div>

      </div>
    </div>
  );
}
