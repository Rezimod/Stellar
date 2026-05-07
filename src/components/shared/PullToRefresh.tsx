'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const THRESHOLD = 72;

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const router = useRouter();

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      const pull = Math.min(Math.pow(delta, 0.75) * 2.2, THRESHOLD + 24);
      setPullY(pull);
    } else if (delta <= 0) {
      setPullY(0);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    pulling.current = false;
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      setTimeout(() => router.refresh(), 300);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
      }, 1100);
    } else {
      setPullY(0);
    }
    startY.current = 0;
  }, [pullY, refreshing, router]);

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  if (pullY === 0 && !refreshing) return null;

  const progress = Math.min(pullY / THRESHOLD, 1);
  const drift = Math.min(pullY * 0.35, 28);

  const RING = 26;
  const STROKE = 1.5;
  const R = (RING - STROKE) / 2;
  const C = 2 * Math.PI * R;

  return (
    <>
      <style>{`
        @keyframes ptrSpin  { to { transform: rotate(360deg); } }
        @keyframes ptrLabel { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '14vh',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${drift}px)`,
          zIndex: 200,
          pointerEvents: 'none',
          transition: refreshing ? 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)' : 'transform 0.08s linear',
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg
          width={RING}
          height={RING}
          viewBox={`0 0 ${RING} ${RING}`}
          style={{
            animation: refreshing ? 'ptrSpin 0.9s linear infinite' : undefined,
            opacity: refreshing ? 1 : 0.5 + progress * 0.5,
          }}
        >
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            fill="none"
            stroke="#FFB347"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={refreshing ? C * 0.7 : C * (1 - progress)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </svg>

        {progress >= 0.9 && (
          <span
            style={{
              color: '#FFB347',
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              opacity: refreshing ? 1 : progress,
              animation: refreshing ? 'ptrLabel 1.2s ease-in-out infinite' : undefined,
            }}
          >
            {refreshing ? 'Refreshing' : 'Release'}
          </span>
        )}
      </div>
    </>
  );
}
