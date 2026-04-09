'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { PlanetInfo } from "@/lib/planets";

interface Props {
  planet: PlanetInfo;
}

const PLANET_EMOJI: Record<string, string> = {
  moon:    '🌕',
  mercury: '☿',
  venus:   '♀',
  mars:    '♂',
  jupiter: '♃',
  saturn:  '♄',
};

function hhmm(d: Date | string | null, locale: string): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PlanetCard({ planet }: Props) {
  const t = useTranslations('planets');
  const locale = useLocale();

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0 leading-none">{PLANET_EMOJI[planet.key] ?? '✦'}</span>
          <span className="text-white text-sm font-semibold truncate">{t(planet.key as Parameters<typeof t>[0])}</span>
        </div>
        {planet.visible ? (
          <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40">
            {t('visibleNow')}
          </span>
        ) : (
          <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-[#0F1F3D] text-slate-400 border-[rgba(56,240,255,0.12)] whitespace-nowrap">
            {planet.rise
              ? `${PLANET_EMOJI[planet.key] ?? ''} rises ${hhmm(planet.rise, locale)}`
              : 'Below horizon'}
          </span>
        )}
      </div>

      {/* Altitude bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
          <div
            className="h-1 rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, (planet.altitude / 90) * 100))}%`,
              background: planet.altitude > 30
                ? 'linear-gradient(90deg, #34d399, #38F0FF)'
                : planet.altitude > 10
                ? 'linear-gradient(90deg, #FFD166, #F59E0B)'
                : 'rgba(255,255,255,0.2)',
            }}
          />
        </div>
        <span className="text-[11px] text-slate-400 flex-shrink-0">{planet.altitude}°</span>
      </div>

      {/* Rise / Transit / Set */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {(['rise', 'transit', 'set'] as const).map(label => (
          <div key={label}>
            <p className="text-[var(--text-dim)] text-[9px] uppercase tracking-wide">{t(label as Parameters<typeof t>[0])}</p>
            <p className="text-white text-xs font-medium">{hhmm(planet[label], locale)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
