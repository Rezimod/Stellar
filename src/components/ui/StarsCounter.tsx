'use client';

import React, { useEffect, useRef, useState } from 'react';

type CounterSize = 'sm' | 'md' | 'lg';

interface StarsCounterProps {
  count: number;
  size?: CounterSize;
  animated?: boolean;
  showDelta?: boolean;
  className?: string;
}

const sizeConfig: Record<CounterSize, { fontSize: number; iconSize: number; gap: number }> = {
  sm: { fontSize: 12, iconSize: 11, gap: 3 },
  md: { fontSize: 15, iconSize: 13, gap: 4 },
  lg: { fontSize: 20, iconSize: 16, gap: 5 },
};

export function StarsCounter({
  count,
  size = 'md',
  animated = true,
  showDelta = true,
  className = '',
}: StarsCounterProps) {
  const prevCount = useRef(count);
  const [displayed, setDisplayed] = useState(count);
  const [delta, setDelta] = useState<number | null>(null);
  const [glowing, setGlowing] = useState(false);
  const cfg = sizeConfig[size];

  useEffect(() => {
    const diff = count - prevCount.current;
    if (diff === 0) return;

    prevCount.current = count;

    if (animated) {
      const start = displayed;
      const end = count;
      const duration = Math.min(800, Math.abs(diff) * 8 + 200);
      const startTime = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      setDisplayed(count);
    }

    if (showDelta && diff > 0) {
      setDelta(diff);
      setGlowing(true);
      const t1 = setTimeout(() => setDelta(null), 1400);
      const t2 = setTimeout(() => setGlowing(false), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: cfg.gap,
        position: 'relative',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        color: '#FFD166',
        fontSize: cfg.fontSize,
        transition: 'box-shadow 300ms ease-out',
        boxShadow: glowing ? '0 0 12px rgba(255,209,102,0.4)' : undefined,
      }}
    >
      <span
        style={{
          fontSize: cfg.iconSize,
          transition: 'filter 300ms ease-out',
          filter: glowing ? 'drop-shadow(0 0 4px #FFD166)' : undefined,
        }}
      >
        ✦
      </span>
      <span>{displayed.toLocaleString()}</span>

      {delta !== null && (
        <span
          key={delta + Date.now()}
          style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#FFD166',
            fontSize: cfg.fontSize * 0.85,
            fontWeight: 700,
            pointerEvents: 'none',
            animation: 'fade-in-up 1.4s ease-out forwards',
            whiteSpace: 'nowrap',
          }}
        >
          +{delta}
        </span>
      )}
    </span>
  );
}
