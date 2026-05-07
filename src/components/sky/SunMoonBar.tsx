'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useLocation } from '@/lib/location';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';

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

function timeToPercent(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Math.max(0, Math.min(100, ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100));
}

function nowPercent(): number {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
}

// Sun icon SVG
function SunMarker() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" style={{ display: 'block' }}>
      <circle cx={7} cy={7} r={3} fill="var(--terracotta)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 7 + 4.5 * Math.cos(rad);
        const y1 = 7 + 4.5 * Math.sin(rad);
        const x2 = 7 + 6.2 * Math.cos(rad);
        const y2 = 7 + 6.2 * Math.sin(rad);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--terracotta)" strokeWidth="1.2" strokeLinecap="round" />;
      })}
    </svg>
  );
}

// Current time marker (animated pulse)
function NowMarker({ percent }: { percent: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${percent}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      {/* Pulse ring */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '1.5px solid rgba(255, 179, 71,0.4)',
          animation: 'pulse-glow 2s ease-in-out infinite',
          position: 'absolute',
          inset: -3,
        }}
      />
      {/* Center dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--color-nebula-teal, var(--terracotta))',
          boxShadow: '0 0 6px rgba(255, 179, 71,0.6)',
          position: 'relative',
        }}
      />
    </div>
  );
}

export default function SunMoonBar() {
  const locale = useLocale();
  const { location } = useLocation();
  const { lat, lon: lng } = location;
  const [data, setData] = useState<SunMoonData | null>(null);
  const [now, setNow] = useState(nowPercent);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/sky/sun-moon?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [lat, lng]);

  // Update "now" marker every minute (only while tab is visible)
  useVisibleInterval(() => setNow(nowPercent()), 60_000);

  if (error) {
    return null;
  }

  if (!data) {
    return (
      <div className="glass-card p-4 animate-pulse h-16" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
    );
  }

  const risePercent = timeToPercent(data.sunRise);
  const setPercent  = timeToPercent(data.sunSet);

  // Night gradient: dark from 0–sunrise, sky-blue midday, dark again after sunset
  // We'll build a simple 5-stop gradient
  const nightColor   = 'var(--canvas)';
  const twilightColor = 'rgba(180,80,20,0.5)';
  const dayColor     = 'rgba(30,80,160,0.25)';

  let gradient = `linear-gradient(to right, ${nightColor} 0%, ${nightColor} 100%)`;
  if (risePercent !== null && setPercent !== null) {
    const rP = risePercent.toFixed(1);
    const sP = setPercent.toFixed(1);
    const rPre = Math.max(0, risePercent - 4).toFixed(1);
    const rPost = Math.min(100, risePercent + 4).toFixed(1);
    const sPost = Math.min(100, setPercent + 4).toFixed(1);
    const sPre  = Math.max(0, setPercent - 4).toFixed(1);
    gradient = `linear-gradient(to right,
      ${nightColor} 0%,
      ${nightColor} ${rPre}%,
      ${twilightColor} ${rP}%,
      ${dayColor} ${rPost}%,
      ${dayColor} ${sPre}%,
      ${twilightColor} ${sP}%,
      ${nightColor} ${sPost}%,
      ${nightColor} 100%
    )`;
  }

  const hourLabels = [
    { label: '00:00', pct: 0 },
    { label: '06:00', pct: 25 },
    { label: '12:00', pct: 50 },
    { label: '18:00', pct: 75 },
    { label: '24:00', pct: 100 },
  ];

  return (
    <div className="glass-card px-4 py-3" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Bar */}
      <div className="relative h-5 rounded-lg overflow-visible mb-1" style={{ background: gradient, border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Sunrise marker */}
        {risePercent !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${risePercent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
            title={`Sunrise ${hhmm(data.sunRise, locale)}`}
          >
            <SunMarker />
          </div>
        )}
        {/* Sunset marker */}
        {setPercent !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${setPercent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
            title={`Sunset ${hhmm(data.sunSet, locale)}`}
          >
            <SunMarker />
          </div>
        )}
        {/* Now marker */}
        <NowMarker percent={now} />
      </div>

      {/* Hour labels */}
      <div className="relative h-4 mb-2">
        {hourLabels.map(({ label, pct }) => (
          <span
            key={label}
            style={{
              position: 'absolute',
              left: `${pct}%`,
              transform: pct === 0 ? 'none' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: 9,
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Sun rise/set + moon info */}
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          {/* Sunrise */}
          {data.sunRise && (
            <div className="flex items-center gap-1.5">
              <svg width={10} height={10} viewBox="0 0 10 10">
                <path d="M5 7 L5 3 M2.5 5.5 L5 3 L7.5 5.5" stroke="var(--terracotta)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <line x1="1" y1="8" x2="9" y2="8" stroke="var(--terracotta)" strokeWidth="0.8" />
              </svg>
              <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {hhmm(data.sunRise, locale)}
              </span>
            </div>
          )}
          {/* Sunset */}
          {data.sunSet && (
            <div className="flex items-center gap-1.5">
              <svg width={10} height={10} viewBox="0 0 10 10">
                <path d="M5 3 L5 7 M2.5 4.5 L5 7 L7.5 4.5" stroke="var(--terracotta)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <line x1="1" y1="2" x2="9" y2="2" stroke="var(--terracotta)" strokeWidth="0.8" />
              </svg>
              <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {hhmm(data.sunSet, locale)}
              </span>
            </div>
          )}
        </div>

        {/* Moon info */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <svg width={12} height={12} viewBox="0 0 12 12" style={{ display: 'block' }}>
            <path
              d="M 9 6 A 4 4 0 1 1 6 2 A 3 3 0 0 0 9 6"
              fill="rgba(220,215,200,0.75)"
            />
          </svg>
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {data.illuminationPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
