'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import type { TargetResult } from '@/app/api/sky/targets/route';

export default function BestTargets() {
  const { location, loading: locationLoading } = useLocation();
  const { lat, lon: lng, source } = location;
  const isDefault = source === 'default';
  const ready = !locationLoading;
  const [targets, setTargets] = useState<TargetResult[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    fetch(`/api/sky/targets?lat=${lat}&lon=${lng}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: TargetResult[]) => setTargets(data))
      .catch(() => setError(true));
  }, [ready, lat, lng]);

  if (error) return null;

  if (!targets) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    );
  }

  const visible = targets.filter(t => t.visible);
  if (targets.length === 0 || visible.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
        No targets visible from your location right now
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] -mt-2 mb-1 max-w-[60ch]" style={{ color: 'oklch(0.94 0.015 80 / 0.55)' }}>
        {isDefault ? 'Showing Tbilisi — change location above' : 'Based on your location and current sky conditions'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {targets.map(target => {
          const eqColor = target.equipment === 'naked_eye' ? 'var(--success)'
            : target.equipment === 'binoculars' ? 'var(--stars)'
            : '#818cf8';
          const eqBg = target.equipment === 'naked_eye' ? 'rgba(52,211,153,0.1)'
            : target.equipment === 'binoculars' ? 'rgba(255,209,102,0.1)'
            : 'rgba(99,102,241,0.1)';
          const eqLabel = target.equipment === 'naked_eye' ? '👁 Naked Eye'
            : target.equipment === 'binoculars' ? '🔭 Binoculars'
            : '🔭 Telescope';

          return (
            <div
              key={target.missionId}
              className="glass-card p-4 flex flex-col gap-2.5"
              style={{
                borderLeft: target.visible
                  ? '2px solid rgba(52,211,153,0.4)'
                  : '2px solid rgba(255,255,255,0.06)',
                opacity: target.visible ? 1 : 0.5,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{target.emoji}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{target.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                        background: eqBg,
                        border: `1px solid ${eqColor}25`,
                        color: eqColor,
                      }}>
                        {eqLabel}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {target.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--stars)' }}>
                  +{target.stars} ✦
                </span>
              </div>

              <p className="text-xs" style={{ color: target.visible ? 'var(--success)' : 'var(--color-text-muted)' }}>
                {target.reason}
              </p>

              {target.visible && (
                <Link href="/missions" className="text-xs font-medium" style={{ color: 'var(--stars)' }}>
                  Start mission →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
