'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { moonPhaseKey } from '@/lib/sky/directions';
import { MoonGlyph } from './MoonGlyph';
import type { FinderResponse, SkyObject } from './types';

interface SkyStateStripProps {
  finder: FinderResponse | null;
  locationLabel: string;
  fallbackLocation: boolean;
  lat: number;
  lon: number;
}

type TwilightPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'dark';

function classifyPhase(sunAlt: number): TwilightPhase {
  if (sunAlt > 0) return 'day';
  if (sunAlt >= -6) return 'civil';
  if (sunAlt >= -12) return 'nautical';
  if (sunAlt >= -18) return 'astronomical';
  return 'dark';
}

function fmtHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function relMinutes(target: Date, now: Date): number {
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}

function fmtCountdown(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

function illuminationFromPhase(phase: number): number {
  // Cosine illumination model: 0 at new, 1 at full.
  return Math.round(((1 - Math.cos(2 * Math.PI * (((phase % 1) + 1) % 1))) / 2) * 100);
}

export function SkyStateStrip({
  finder,
  locationLabel,
  fallbackLocation,
  lat,
  lon,
}: SkyStateStripProps) {
  const t = useTranslations('sky.strip');
  const tMoon = useTranslations('sky.moonPhase');

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!finder) {
    return <SkyStateStripSkeleton />;
  }

  const sun = finder.objects.find((o) => o.id === 'sun') as SkyObject | undefined;
  const moon = finder.objects.find((o) => o.id === 'moon') as SkyObject | undefined;

  const sunAlt = sun?.altitude ?? -90;
  const phase = classifyPhase(sunAlt);

  // Subtitle line below the phase value.
  const tw = finder.twilight;
  let phaseSub = '';
  if (sun) {
    if (phase === 'day' && sun.setTime) {
      const d = new Date(sun.setTime);
      phaseSub = t('setsAt', { time: fmtHHmm(d) });
    } else if ((phase === 'civil' || phase === 'nautical') && tw?.astronomicalDusk) {
      phaseSub = t('darkIn', { dur: fmtCountdown(relMinutes(new Date(tw.astronomicalDusk), now)) });
    } else if (phase === 'astronomical') {
      const target = tw?.astronomicalDawn ? new Date(tw.astronomicalDawn) : null;
      if (target) phaseSub = t('dawnAt', { time: fmtHHmm(target) });
    } else if (phase === 'dark') {
      const target = tw?.astronomicalDawn ? new Date(tw.astronomicalDawn) : null;
      if (target) phaseSub = t('dawnIn', { dur: fmtCountdown(relMinutes(target, now)) });
    }
  }

  // Moon
  const moonPhase = moon?.phase ?? 0.5;
  const moonAlt = moon?.altitude ?? 0;
  const moonName = tMoon(moonPhaseKey(moonPhase));
  const illum = illuminationFromPhase(moonPhase);
  const moonSub =
    moonAlt > 0
      ? t('moonAbove', { illum, alt: Math.round(moonAlt) })
      : t('moonBelow', { illum });

  // Clouds
  const cloud = finder.conditions?.cloudCoverPct ?? null;
  const cloudWord =
    cloud == null
      ? null
      : cloud < 25
        ? t('clouds.clear')
        : cloud < 70
          ? t('clouds.partly')
          : t('clouds.overcast');
  const cloudColor =
    cloud == null
      ? 'var(--text-dim)'
      : cloud < 30
        ? 'var(--seafoam, #5EEAD4)'
        : cloud < 70
          ? 'var(--terracotta, #FFD166)'
          : 'var(--text-muted)';

  // Time
  const timeStr = fmtHHmm(now);
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Coordinates
  const coordsStr = `${lat.toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

  return (
    <div className="sky-strip" role="status" aria-label={t('a11y')}>
      <SkySegment label={t('labels.location')}>
        <div className="sky-strip__value">{locationLabel || '—'}</div>
        <div className="sky-strip__sub">
          {fallbackLocation ? <span className="sky-strip__sub--warn">{t('locationFallback')}</span> : coordsStr}
        </div>
      </SkySegment>

      <SkySegment label={t('labels.sky')}>
        <div className={`sky-strip__value sky-strip__phase sky-strip__phase--${phase}`}>
          {t(`phase.${phase}`)}
        </div>
        <div className="sky-strip__sub">{phaseSub || '—'}</div>
      </SkySegment>

      <SkySegment label={t('labels.moon')}>
        <div className="sky-strip__value sky-strip__moon-row">
          <MoonGlyph phase={moonPhase} size={20} />
          <span>{moonName}</span>
        </div>
        <div className="sky-strip__sub">{moonSub}</div>
      </SkySegment>

      <SkySegment label={t('labels.clouds')}>
        <div className="sky-strip__value">{cloud == null ? '—' : `${cloud}%`}</div>
        <div className="sky-strip__cloud-bar" aria-hidden="true">
          <span style={{ width: `${cloud ?? 0}%`, background: cloudColor }} />
        </div>
        {cloudWord && <div className="sky-strip__sub">{cloudWord}</div>}
      </SkySegment>

      <SkySegment label={t('labels.time')}>
        <div className="sky-strip__value sky-strip__time">{timeStr}</div>
        <div className="sky-strip__sub">{dateStr}</div>
      </SkySegment>
    </div>
  );
}

function SkySegment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sky-strip__segment">
      <div className="sky-strip__label">{label}</div>
      {children}
    </div>
  );
}

function SkyStateStripSkeleton() {
  return (
    <div className="sky-strip sky-strip--skel" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="sky-strip__segment">
          <div className="sky-strip__label sky-strip__skel-bar" style={{ width: 56 }} />
          <div className="sky-strip__skel-bar" style={{ width: 90, height: 14, marginTop: 6 }} />
          <div className="sky-strip__skel-bar" style={{ width: 70, height: 10, marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
