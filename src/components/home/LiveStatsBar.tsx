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
    <div style={{
      width: '100%',
      background: 'rgba(52,211,153,0.04)',
      borderTop: '1px solid rgba(52,211,153,0.08)',
      borderBottom: '1px solid rgba(52,211,153,0.08)',
      padding: '10px 16px',
    }}>
      <div style={{
        maxWidth: 640, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {item.value}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{item.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ color: 'rgba(52,211,153,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
        </div>
      </div>
    </div>
  );
}
