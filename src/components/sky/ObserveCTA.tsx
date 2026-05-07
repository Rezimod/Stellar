'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import type { SkyScoreResult } from '@/lib/sky-score';

export default function ObserveCTA() {
  const { location, loading: locationLoading } = useLocation();
  const { lat, lon: lng, source } = location;
  const ready = !locationLoading && source !== 'default';
  const [scoreData, setScoreData] = useState<SkyScoreResult | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetch(`/api/sky/score?lat=${lat}&lon=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: SkyScoreResult | null) => {
        if (data && typeof data.score === 'number') setScoreData(data);
      })
      .catch(() => null);
  }, [ready, lat, lng]);

  if (!scoreData) return null;

  const { score, grade } = scoreData;

  if (score >= 50) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{
        background: 'linear-gradient(135deg, rgba(94, 234, 212,0.08), rgba(255, 179, 71,0.04))',
        border: '1px solid rgba(94, 234, 212,0.2)',
      }}>
        <p className="text-text-primary font-semibold text-sm mb-1">Clear skies tonight</p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Sky Score {score}/100 · {grade} conditions
        </p>
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
        >
          Start Observing →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 text-center" style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        Sky conditions are limited tonight
      </p>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        You can still observe the Moon and bright planets
      </p>
      <Link href="/missions" className="text-xs font-medium hover:underline" style={{ color: 'var(--terracotta)' }}>
        Browse missions →
      </Link>
    </div>
  );
}
