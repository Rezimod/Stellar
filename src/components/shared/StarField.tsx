'use client';
import { useMemo } from 'react';

export default function StarField() {
  const stars = useMemo(() => Array.from({ length: 140 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 1.5 + 0.3,
    duration: Math.random() * 5 + 4,
    delay: Math.random() * 8,
    drift: Math.random() * 20 - 10,
  })), []);

  const shootingStars = useMemo(() => [
    { top: 15, left: 10, delay: 0, duration: 12 },
    { top: 35, left: 60, delay: 7, duration: 15 },
    { top: 65, left: 30, delay: 13, duration: 18 },
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            '--duration': `${s.duration}s`,
            '--delay': `${s.delay}s`,
            '--drift': `${s.drift}px`,
          } as React.CSSProperties}
        />
      ))}
      {shootingStars.map((ss, i) => (
        <div
          key={`shoot-${i}`}
          className="shooting-star"
          style={{
            top: `${ss.top}%`,
            left: `${ss.left}%`,
            animationDuration: `${ss.duration}s`,
            animationDelay: `${ss.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
