'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface SunMoonData {
  sunRise: string | null;
  sunSet: string | null;
  illuminationPct: number;
  moonPhaseDeg: number;
}

function hhmm(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function moonEmoji(phaseDeg: number): string {
  // 0=new, 45=waxing crescent, 90=first qtr, 135=waxing gibbous
  // 180=full, 225=waning gibbous, 270=last qtr, 315=waning crescent
  if (phaseDeg < 22.5)  return '🌑';
  if (phaseDeg < 67.5)  return '🌒';
  if (phaseDeg < 112.5) return '🌓';
  if (phaseDeg < 157.5) return '🌔';
  if (phaseDeg < 202.5) return '🌕';
  if (phaseDeg < 247.5) return '🌖';
  if (phaseDeg < 292.5) return '🌗';
  if (phaseDeg < 337.5) return '🌘';
  return '🌑';
}

function phaseName(phaseDeg: number, locale: string): string {
  const en: Record<string, string> = {
    new: 'New Moon', waxCrescent: 'Waxing Crescent', firstQtr: 'First Quarter',
    waxGibbous: 'Waxing Gibbous', full: 'Full Moon', wanGibbous: 'Waning Gibbous',
    lastQtr: 'Last Quarter', wanCrescent: 'Waning Crescent',
  };
  const ka: Record<string, string> = {
    new: 'ახალმთვარე', waxCrescent: 'მომატებული ნამგალა', firstQtr: 'პირველი მეოთხედი',
    waxGibbous: 'მომატებული გიბოსი', full: 'სავსემთვარე', wanGibbous: 'კლებადი გიბოსი',
    lastQtr: 'ბოლო მეოთხედი', wanCrescent: 'კლებადი ნამგალა',
  };
  const names = locale === 'ka' ? ka : en;
  if (phaseDeg < 22.5)  return names.new;
  if (phaseDeg < 67.5)  return names.waxCrescent;
  if (phaseDeg < 112.5) return names.firstQtr;
  if (phaseDeg < 157.5) return names.waxGibbous;
  if (phaseDeg < 202.5) return names.full;
  if (phaseDeg < 247.5) return names.wanGibbous;
  if (phaseDeg < 292.5) return names.lastQtr;
  if (phaseDeg < 337.5) return names.wanCrescent;
  return names.new;
}

export default function SunMoonBar() {
  const t = useTranslations('sky');
  const locale = useLocale();
  const [data, setData] = useState<SunMoonData | null>(null);

  useEffect(() => {
    fetch('/api/sky/sun-moon')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="glass-card p-3 flex items-center justify-between animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded" />
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card p-3 flex items-center justify-between gap-4 text-sm">
      {/* Sun */}
      <div className="flex items-center gap-2 text-amber-300/80 min-w-0">
        <span className="text-base flex-shrink-0">☀️</span>
        <span className="truncate">
          {t('sunRises')} {hhmm(data.sunRise, locale)} · {t('sunSets')} {hhmm(data.sunSet, locale)}
        </span>
      </div>
      {/* Moon */}
      <div className="flex items-center gap-2 text-slate-300 flex-shrink-0">
        <span className="text-base">{moonEmoji(data.moonPhaseDeg)}</span>
        <span className="text-xs text-right">
          <span className="text-white font-medium">{data.illuminationPct}%</span>
          <span className="text-slate-500 ml-1">{phaseName(data.moonPhaseDeg, locale)}</span>
        </span>
      </div>
    </div>
  );
}
