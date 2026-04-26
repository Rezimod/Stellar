'use client';
import { useState, useEffect } from 'react';

interface Stats {
  totalObservations: number;
  totalStars: number;
  activeTonight: number;
}

export default function LiveStatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard?period=all&limit=100')
      .then(r => r.json())
      .then(data => {
        const lb = data.leaderboard ?? [];
        const totalObservations = lb.reduce((s: number, e: { observations: number }) => s + e.observations, 0);
        const totalStars = lb.reduce((s: number, e: { total_stars: number }) => s + e.total_stars, 0);
        setStats({ totalObservations, totalStars, activeTonight: lb.length });
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;
  if (stats.totalObservations === 0) return null;

  const items = [
    { value: stats.totalObservations.toLocaleString(), label: 'discoveries sealed on Solana' },
    { value: `${stats.totalStars.toLocaleString()} ✦`, label: 'Stars earned' },
    { value: stats.activeTonight.toLocaleString(), label: 'observers joined' },
  ];

  return (
    <div className="live-stats-bar">
      <div className="live-stats-inner">
        {items.map(item => (
          <div key={item.label} className="live-stats-cell">
            <span className="live-stats-num">{item.value}</span>
            <span className="live-stats-label">{item.label}</span>
          </div>
        ))}
        <div className="live-stats-live">
          <span className="live-led" aria-hidden />
          <span className="live-stats-live-label">Live</span>
        </div>
      </div>
      <style jsx>{`
        .live-stats-bar {
          width: 100%;
          background: rgba(52,211,153,0.04);
          border-top: 1px solid rgba(52,211,153,0.08);
          border-bottom: 1px solid rgba(52,211,153,0.08);
          padding: 10px 16px;
        }
        .live-stats-inner {
          max-width: 640px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 18px;
          align-items: center;
        }
        @media (min-width: 768px) {
          .live-stats-inner {
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: nowrap;
          }
        }
        .live-stats-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .live-stats-num {
          color: var(--color-success);
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .live-stats-label {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          line-height: 1.3;
        }
        .live-stats-live {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .live-stats-live-label {
          color: rgba(52,211,153,0.7);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}
