'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
  label?: string;
  sublabel?: string;
  animate?: boolean;
  showPercent?: boolean;
  children?: React.ReactNode;
}

export default function ScoreRing({
  value,
  max = 100,
  size = 160,
  strokeWidth = 8,
  color = 'gradient',
  glowColor = 'rgba(99, 102, 241, 0.25)',
  label,
  sublabel,
  animate = true,
  showPercent = false,
  children,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const [dashOffset, setDashOffset] = useState(animate ? circumference : circumference * (1 - value / max));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      setDashOffset(circumference * (1 - value / max));
      return;
    }

    const start = performance.now();
    const duration = 1200;
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = easeOutExpo(elapsed);
      const current = Math.round(eased * value);
      setDisplayValue(current);
      setDashOffset(circumference * (1 - (eased * value) / max));
      if (elapsed < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, max, circumference, animate]);

  const strokeColor = color === 'gradient' ? 'url(#scoreGradient)' : color;
  const fontSize = Math.round(size / 4);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', filter: `drop-shadow(0 0 8px ${glowColor})` }}
      >
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: animate ? undefined : 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: strokeWidth + 4,
        }}
      >
        {children ?? (
          <>
            <span
              style={{
                fontSize,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {displayValue}{showPercent ? '%' : ''}
            </span>
            {label && (
              <span
                style={{
                  fontSize: Math.max(9, Math.round(size / 14)),
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  marginTop: 2,
                  lineHeight: 1.2,
                }}
              >
                {label}
              </span>
            )}
            {sublabel && (
              <span
                style={{
                  fontSize: Math.max(8, Math.round(size / 16)),
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  marginTop: 1,
                  lineHeight: 1.2,
                }}
              >
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
