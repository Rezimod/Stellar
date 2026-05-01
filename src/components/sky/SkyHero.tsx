// src/components/sky/SkyHero.tsx
'use client';

import type { ObservationScore } from '@/lib/use-sky-data';

interface SkyHeroProps {
  score: ObservationScore | null;
  location: { city: string; lat: number; lon: number; bortle: number } | null;
  loading?: boolean;
}

export function SkyHero({ score, location, loading }: SkyHeroProps) {
  if (loading || !score || !location) {
    return (
      <section className="hero" style={{ minHeight: 92 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading sky conditions…</div>
      </section>
    );
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference * (1 - score.score / 100);

  return (
    <section className="hero">
      <div className="score-ring">
        <svg viewBox="0 0 72 72">
          <circle className="track" cx="36" cy="36" r="32" />
          <circle
            className="fill"
            cx="36"
            cy="36"
            r="32"
            style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
          />
        </svg>
        <div className="score-num">
          <span className="n">{score.score}</span>
          <span className="d">/100</span>
        </div>
      </div>

      <div className="hero-body">
        <h1>{score.headline}</h1>
        <p>{score.summary}</p>
        <div className="hero-meta">
          <span className="city">{location.city}</span>
          <span className="sep">·</span>
          <span>{location.lat.toFixed(2)}°N {location.lon.toFixed(2)}°E</span>
          <span className="sep">·</span>
          <span>Bortle {location.bortle}</span>
          <span className="sep">·</span>
          <span>{dateLabel}</span>
        </div>
      </div>
    </section>
  );
}
