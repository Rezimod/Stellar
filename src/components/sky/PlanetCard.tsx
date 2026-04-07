'use client';

import { useTranslations } from 'next-intl';
import { PlanetInfo } from '@/lib/planets';

interface Props {
  planet: PlanetInfo;
}

const DOT_COLOR: Record<string, string> = {
  moon:    'bg-slate-400',
  mercury: 'bg-blue-400',
  venus:   'bg-white',
  mars:    'bg-red-500',
  jupiter: 'bg-amber-400',
  saturn:  'bg-yellow-300',
};

function hhmm(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PlanetCard({ planet }: Props) {
  const t = useTranslations('planets');

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[planet.key] ?? 'bg-slate-400'}`} />
          <span className="text-white text-sm font-semibold truncate">{t(planet.key as Parameters<typeof t>[0])}</span>
        </div>
        {planet.visible ? (
          <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40">
            {t('visibleNow')}
          </span>
        ) : (
          <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-[#0F1F3D] text-slate-400 border-[rgba(56,240,255,0.12)] whitespace-nowrap">
            {t('risesAt')} {hhmm(planet.rise)}
          </span>
        )}
      </div>

      {/* Alt / Az */}
      <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
        <span>{planet.altitude}° alt</span>
        <span>{planet.azimuth}° {planet.azimuthDir}</span>
        <span>mag {planet.magnitude}</span>
      </div>

      {/* Rise / Transit / Set */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {(['rise', 'transit', 'set'] as const).map(label => (
          <div key={label}>
            <p className="text-[var(--text-dim)] text-[9px] uppercase tracking-wide">{label}</p>
            <p className="text-white text-xs font-medium">{hhmm(planet[label])}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
