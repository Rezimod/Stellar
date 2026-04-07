'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SkyDay } from '@/lib/sky-data';
import type { PlanetInfo } from "@/lib/planets";

const TBILISI = { lat: 41.6941, lng: 44.8337 };

function eveningBestWindow(hours: SkyDay['hours']): { cloudCover: number; window: string } {
  const evening = hours.filter(h => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 19 && hr <= 23;
  });
  const pool = evening.length > 0 ? evening : hours;
  const best = pool.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
  const clear = pool.filter(h => h.cloudCover < 30);
  const window = clear.length > 0
    ? `${clear[0].time.slice(11, 16)}–${clear[clear.length - 1].time.slice(11, 16)}`
    : '';
  return { cloudCover: best.cloudCover, window };
}

function nextClearDate(days: SkyDay[]): string {
  const next = days.slice(1).find(d => {
    const best = d.hours.reduce((a, b) => a.cloudCover <= b.cloudCover ? a : b);
    return best.cloudCover < 30;
  });
  if (!next) return '';
  return new Date(next.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function TonightHighlights() {
  const t = useTranslations('sky');
  const pt = useTranslations('planets');
  const [headline, setHeadline] = useState('');
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async (lat: number, lng: number) => {
    try {
      const r = await fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`);
      const days = await r.json() as SkyDay[];
      if (!days.length) { setLoading(false); return; }

      const today = days[0];
      const { cloudCover, window } = eveningBestWindow(today.hours);

      if (cloudCover < 30) {
        const planetsRes = await fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`);
        const planets = await planetsRes.json() as PlanetInfo[];
        const top = planets.find(p => p.visible);
        const planetPart = top
          ? `${pt(top.key as Parameters<typeof pt>[0])} at ${top.altitude}°`
          : 'clear skies';
        const timePart = window ? ` — clear skies ${window}` : '';
        setHeadline(`Best tonight: ${planetPart}${timePart}`);
      } else {
        const next = nextClearDate(days);
        setHeadline(next
          ? `Cloudy tonight — next clear window: ${next}`
          : 'Cloudy all week — keep checking back');
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [pt]);

  useEffect(() => {
    if (!navigator.geolocation) { compute(TBILISI.lat, TBILISI.lng); return; }
    navigator.geolocation.getCurrentPosition(
      pos => compute(pos.coords.latitude, pos.coords.longitude),
      ()  => compute(TBILISI.lat, TBILISI.lng),
      { timeout: 5000 },
    );
  }, [compute]);

  if (loading) {
    return <div className="glass-card p-5 border-[#FFD166]/20 animate-pulse h-20" />;
  }

  if (!headline) return null;

  return (
    <div className="glass-card p-5 border-[#FFD166]/20" style={{ boxShadow: '0 0 24px rgba(255,209,102,0.06)' }}>
      <p className="text-[#FFD166] text-[10px] font-medium tracking-widest uppercase mb-2">
        {t('tonightHighlight')}
      </p>
      <p className="text-white text-base font-semibold leading-snug">{headline}</p>
    </div>
  );
}
