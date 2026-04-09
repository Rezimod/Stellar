'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { PlanetInfo } from "@/lib/planets";

interface Props {
  planet: PlanetInfo;
  onClose: () => void;
}

const PLANET_EMOJI: Record<string, string> = {
  moon: '🌕', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};

const CONSTELLATION: Record<string, string> = {
  moon: 'varies', mercury: 'Aries', venus: 'Taurus',
  mars: 'Gemini', jupiter: 'Taurus', saturn: 'Aquarius',
};

const VIEWING_TIP: Record<string, string> = {
  moon:    'Look for craters along the terminator line',
  mercury: 'Best seen near the horizon just after sunset or before sunrise',
  venus:   'Brightest natural object after the Sun and Moon',
  mars:    'Look for the reddish hue — disc visible in telescopes',
  jupiter: 'Four Galilean moons visible in binoculars',
  saturn:  'Rings clearly visible in any telescope',
};

const DIR_LABELS: Record<string, string> = {
  N: 'North', NE: 'Northeast', E: 'East', SE: 'Southeast',
  S: 'South', SW: 'Southwest', W: 'West', NW: 'Northwest',
};

function hhmm(d: Date | string | null, locale: string): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function magnitudeLabel(mag: number): string {
  if (mag < -2) return 'very bright';
  if (mag < 0)  return 'bright';
  if (mag < 2)  return 'moderate';
  return 'faint';
}

export default function PlanetDetail({ planet, onClose }: Props) {
  const t = useTranslations('planets');
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const rows: { label: string; value: string }[] = [
    {
      label: t('status'),
      value: planet.visible ? 'Visible Now' : 'Below Horizon',
    },
    {
      label: t('altitudeLabel'),
      value: `${planet.altitude}° above horizon`,
    },
    {
      label: t('azimuthLabel'),
      value: `${planet.azimuth}° ${planet.azimuthDir} — look ${DIR_LABELS[planet.azimuthDir] ?? planet.azimuthDir}`,
    },
    {
      label: t('magnitudeLabel'),
      value: `${planet.magnitude > 0 ? '+' : ''}${planet.magnitude.toFixed(1)} (${magnitudeLabel(planet.magnitude)})`,
    },
    {
      label: t('risesAt'),
      value: hhmm(planet.rise, locale),
    },
    {
      label: t('highestAt'),
      value: hhmm(planet.transit, locale),
    },
    {
      label: t('setsAt'),
      value: hhmm(planet.set, locale),
    },
    {
      label: t('constellation'),
      value: CONSTELLATION[planet.key] ?? '—',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className={`
          w-full sm:max-w-sm sm:mx-auto sm:rounded-2xl
          bg-[#0F1827]
          border-t sm:border border-[#38F0FF]/10
          transition-transform duration-300
          ${visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-4'}
          rounded-t-2xl sm:rounded-2xl
          max-h-[85dvh] overflow-y-auto
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none">{PLANET_EMOJI[planet.key] ?? '✦'}</span>
            <h2 className="text-white text-lg font-bold" style={{ fontFamily: 'Georgia, serif' }}>
              {t(planet.key as Parameters<typeof t>[0])}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rows */}
        <div className="px-5 pb-4 flex flex-col divide-y divide-white/5">
          {rows.map(row => (
            <div key={row.label} className="flex items-baseline justify-between py-2.5 gap-4">
              <span className="text-slate-500 text-xs flex-shrink-0">{row.label}</span>
              <span className={`text-sm text-right ${
                row.label === t('status')
                  ? planet.visible ? 'text-[#34d399] font-medium' : 'text-slate-400'
                  : 'text-slate-200'
              }`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{t('viewingTip')}</p>
          <p className="text-slate-300 text-xs leading-relaxed">{VIEWING_TIP[planet.key]}</p>
        </div>
      </div>
    </div>
  );
}
