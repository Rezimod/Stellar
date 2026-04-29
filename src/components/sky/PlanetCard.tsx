'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { PlanetInfo } from "@/lib/planets";

interface Props {
  planet: PlanetInfo;
}

// ── Planet SVG icons ──────────────────────────────────────────────────────────

function PlanetIcon({ planetKey, size = 36 }: { planetKey: string; size?: number }) {
  const r = size / 2;
  const R = r - 1;

  switch (planetKey) {
    case 'moon': {
      // Simple waxing crescent — looks consistent, not dependent on phase data here
      const litR = R - 1;
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <circle cx={r} cy={r} r={R} fill="#0d1f3a" />
          {/* Crescent: right half lit */}
          <clipPath id={`moon-clip-${size}`}>
            <circle cx={r} cy={r} r={R} />
          </clipPath>
          <g clipPath={`url(#moon-clip-${size})`}>
            <rect x={r} y={r - R} width={R} height={R * 2} fill="rgba(220,215,200,0.85)" />
            <ellipse cx={r} cy={r} rx={litR * 0.55} ry={litR} fill="#0d1f3a" />
          </g>
          <circle cx={r} cy={r} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.75" />
        </svg>
      );
    }
    case 'mercury': {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`merc-grad-${size}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#C4A882" />
              <stop offset="60%" stopColor="#9E8A6F" />
              <stop offset="100%" stopColor="#6B5E4E" />
            </radialGradient>
          </defs>
          <circle cx={r} cy={r} r={R} fill={`url(#merc-grad-${size})`} />
          {/* Crater dots */}
          <circle cx={r - 4} cy={r - 3} r={1.5} fill="rgba(0,0,0,0.2)" />
          <circle cx={r + 3} cy={r + 2} r={1} fill="rgba(0,0,0,0.2)" />
          <circle cx={r - 1} cy={r + 4} r={1} fill="rgba(0,0,0,0.15)" />
          <circle cx={r} cy={r} r={R} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
        </svg>
      );
    }
    case 'venus': {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`venus-grad-${size}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFF4CC" />
              <stop offset="50%" stopColor="#F5D87A" />
              <stop offset="100%" stopColor="#C9A228" />
            </radialGradient>
          </defs>
          <circle cx={r} cy={r} r={R} fill={`url(#venus-grad-${size})`} />
          {/* Atmosphere glow */}
          <circle cx={r} cy={r} r={R + 1.5} fill="none" stroke="rgba(245,216,122,0.25)" strokeWidth="2" />
        </svg>
      );
    }
    case 'mars': {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`mars-grad-${size}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#F4A460" />
              <stop offset="55%" stopColor="#CD4A1A" />
              <stop offset="100%" stopColor="#8B2500" />
            </radialGradient>
          </defs>
          <circle cx={r} cy={r} r={R} fill={`url(#mars-grad-${size})`} />
          {/* Polar ice cap */}
          <ellipse cx={r} cy={r - R + 3} rx={4} ry={2} fill="rgba(255,255,255,0.35)" />
        </svg>
      );
    }
    case 'jupiter': {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`jup-grad-${size}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#F5E0B0" />
              <stop offset="100%" stopColor="#C8A050" />
            </radialGradient>
            <clipPath id={`jup-clip-${size}`}>
              <circle cx={r} cy={r} r={R} />
            </clipPath>
          </defs>
          <circle cx={r} cy={r} r={R} fill={`url(#jup-grad-${size})`} />
          {/* Cloud bands */}
          <g clipPath={`url(#jup-clip-${size})`}>
            <rect x={0} y={r - 4} width={size} height={2.5} fill="rgba(160,100,30,0.4)" />
            <rect x={0} y={r + 1} width={size} height={2} fill="rgba(160,100,30,0.3)" />
            <rect x={0} y={r - 9} width={size} height={1.5} fill="rgba(160,100,30,0.25)" />
            <rect x={0} y={r + 6} width={size} height={1.5} fill="rgba(160,100,30,0.25)" />
            {/* Great Red Spot */}
            <ellipse cx={r + 4} cy={r - 2} rx={4} ry={2.5} fill="rgba(180,60,40,0.5)" />
          </g>
        </svg>
      );
    }
    case 'saturn': {
      const ringRx = R * 1.65;
      const ringRy = R * 0.38;
      return (
        <svg
          width={size * 1.8}
          height={size * 1.2}
          viewBox={`${-size * 0.4} ${-size * 0.1} ${size * 1.8} ${size * 1.2}`}
          style={{ display: 'block' }}
        >
          <defs>
            <radialGradient id={`sat-grad-${size}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#F5DDAA" />
              <stop offset="100%" stopColor="#C8A060" />
            </radialGradient>
            <clipPath id={`sat-clip-${size}`}>
              <circle cx={r} cy={r} r={R} />
            </clipPath>
          </defs>
          {/* Back ring arc */}
          <ellipse
            cx={r} cy={r}
            rx={ringRx} ry={ringRy}
            fill="none"
            stroke="rgba(200,160,80,0.5)"
            strokeWidth="3"
            strokeDasharray="0"
          />
          {/* Planet */}
          <circle cx={r} cy={r} r={R} fill={`url(#sat-grad-${size})`} />
          {/* Front ring arc (over planet) */}
          <path
            d={`M ${r - ringRx} ${r} A ${ringRx} ${ringRy} 0 0 1 ${r + ringRx} ${r}`}
            fill="none"
            stroke="rgba(220,180,90,0.7)"
            strokeWidth="3"
          />
        </svg>
      );
    }
    default: {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          <circle cx={r} cy={r} r={R} fill="rgba(232, 130, 107,0.2)" stroke="rgba(232, 130, 107,0.4)" strokeWidth="1" />
          <circle cx={r} cy={r} r={R * 0.4} fill="rgba(232, 130, 107,0.5)" />
        </svg>
      );
    }
  }
}

// ── Altitude Arc ──────────────────────────────────────────────────────────────

function AltitudeArc({ altitude, size = 44 }: { altitude: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 3;
  const clampedAlt = Math.max(0, Math.min(90, altitude));

  // Map altitude 0-90 to angle 0-PI/2 (right edge to top of semicircle)
  const theta = (clampedAlt / 90) * (Math.PI / 2);
  const dotX = cx + R * Math.cos(theta);
  const dotY = cy - R * Math.sin(theta);

  const dotColor = altitude > 30 ? 'var(--success)' : altitude > 10 ? 'var(--terracotta)' : 'rgba(255,255,255,0.3)';
  const arcStroke = altitude > 30 ? 'rgba(94, 234, 212,0.2)' : altitude > 10 ? 'rgba(232, 130, 107,0.2)' : 'rgba(255,255,255,0.08)';

  return (
    <svg
      width={size}
      height={size / 2 + 4}
      viewBox={`0 0 ${size} ${size / 2 + 4}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Dome arc */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke={arcStroke}
        strokeWidth="1.5"
      />
      {/* Horizon line */}
      <line
        x1={cx - R - 2} y1={cy} x2={cx + R + 2} y2={cy}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.75"
        strokeDasharray="2 2"
      />
      {/* Altitude dot */}
      {altitude >= 0 && (
        <circle cx={dotX} cy={dotY} r={2.5} fill={dotColor} />
      )}
    </svg>
  );
}

// ── Planet Card ───────────────────────────────────────────────────────────────

const PLANET_ACCENT: Record<string, string> = {
  moon:    'var(--text-muted)',
  mercury: 'var(--terracotta)',
  venus:   'var(--terracotta)',
  mars:    'var(--negative)',
  jupiter: 'var(--terracotta)',
  saturn:  '#FDE68A',
};

const PLANET_EQUIPMENT: Record<string, { icon: string; label: string; detail: string; color: string }> = {
  moon:    { icon: '👁', label: 'Naked Eye', detail: 'Craters visible with binoculars', color: 'var(--success)' },
  mercury: { icon: '👁', label: 'Naked Eye', detail: 'Low on horizon at dusk/dawn', color: 'var(--success)' },
  venus:   { icon: '👁', label: 'Naked Eye', detail: 'Phases visible in small telescope', color: 'var(--success)' },
  mars:    { icon: '🔭', label: 'Telescope', detail: 'Surface detail at opposition', color: 'var(--terracotta)' },
  jupiter: { icon: '🔭', label: 'Binoculars+', detail: '4 moons in binoculars, bands in scope', color: 'var(--stars)' },
  saturn:  { icon: '🔭', label: 'Telescope', detail: 'Rings visible at 40× magnification', color: 'var(--terracotta)' },
};

function hhmm(d: Date | string | null, locale: string): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PlanetCard({ planet }: Props) {
  const t = useTranslations('planets');
  const locale = useLocale();
  const accentColor = PLANET_ACCENT[planet.key] ?? 'var(--color-nebula-teal)';
  const isSaturn = planet.key === 'saturn';

  return (
    <div
      className="glass-card p-4 flex flex-col gap-3"
      style={{ borderLeft: `2px solid ${accentColor}40`, paddingLeft: 14 }}
    >
      {/* Header: planet icon + name + status */}
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0" style={{ width: isSaturn ? 52 : 32, height: 32, display: 'flex', alignItems: 'center' }}>
          <PlanetIcon planetKey={planet.key} size={32} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-semibold text-text-primary text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {t(planet.key as Parameters<typeof t>[0])}
          </span>
          {planet.visible ? (
            <span
              className="inline-flex items-center self-start px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
              style={{ background: 'rgba(94, 234, 212,0.1)', border: '1px solid rgba(94, 234, 212,0.25)', color: 'var(--success)' }}
            >
              <span className="w-1 h-1 rounded-full bg-[var(--seafoam)] mr-1 animate-pulse" />
              {t('visibleNow')}
            </span>
          ) : (
            <span
              className="inline-flex items-center self-start text-[9px] font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {planet.rise ? `rises ${hhmm(planet.rise, locale)}` : 'Below horizon'}
            </span>
          )}
        </div>
      </div>

      {/* Altitude arc + value */}
      <div className="flex items-end justify-between">
        <AltitudeArc altitude={planet.altitude} size={44} />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Altitude</p>
          <p
            className="text-sm font-bold font-mono"
            style={{
              color: planet.altitude > 30 ? 'var(--success)' : planet.altitude > 10 ? 'var(--terracotta)' : 'rgba(255,255,255,0.3)',
            }}
          >
            {planet.altitude}°
          </p>
        </div>
      </div>

      {/* Equipment badge */}
      {(() => {
        const eq = PLANET_EQUIPMENT[planet.key];
        if (!eq) return null;
        return (
          <div className="flex items-center gap-2" style={{ paddingTop: 4 }}>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: `${eq.color}10`,
              border: `1px solid ${eq.color}25`,
              color: eq.color,
            }}>
              {eq.icon} {eq.label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {eq.detail}
            </span>
          </div>
        );
      })()}

      {/* Rise / Transit / Set */}
      <div className="grid grid-cols-3 gap-1 text-center pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {(['rise', 'transit', 'set'] as const).map(label => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t(label as Parameters<typeof t>[0])}
            </p>
            <p className="text-xs font-mono text-text-primary">{hhmm(planet[label], locale)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
