'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import type { TargetResult } from '@/app/api/sky/targets/route';

export default function BestTargets() {
  const { location, loading: locationLoading } = useLocation();
  const { lat, lon: lng, source } = location;
  const ready = !locationLoading && source !== 'default';
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
      <div>
        <h2 className="text-lg text-white" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
          Best targets tonight
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Based on your location and current sky conditions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {targets.map(target => {
          const eqColor = target.equipment === 'naked_eye' ? '#34d399'
            : target.equipment === 'binoculars' ? '#FFD166'
            : '#38F0FF';
          const eqBg = target.equipment === 'naked_eye' ? 'rgba(52,211,153,0.1)'
            : target.equipment === 'binoculars' ? 'rgba(255,209,102,0.1)'
            : 'rgba(56,240,255,0.1)';
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
                <span className="text-sm font-bold flex-shrink-0" style={{ color: '#FFD166' }}>
                  +{target.stars} ✦
                </span>
              </div>

              <p className="text-xs" style={{ color: target.visible ? '#34d399' : 'var(--color-text-muted)' }}>
                {target.reason}
              </p>

              {target.visible && (
                <Link href="/missions" className="text-xs font-medium" style={{ color: '#FFD166' }}>
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
