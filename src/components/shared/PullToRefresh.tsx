'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const THRESHOLD = 72; // px to pull before triggering

export default function PullToRefresh() {
  const [pullY, setPullY]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY    = useRef(0);
  const pulling   = useRef(false);
  const router    = useRouter();

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
      // Rubber-band: diminishing returns
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
      // Refresh then reset
      setTimeout(() => {
        router.refresh();
      }, 300);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
      }, 1100);
    } else {
      // Snap back
      setPullY(0);
    }
    startY.current = 0;
  }, [pullY, refreshing, router]);

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: true });
    document.addEventListener('touchend',   onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  if (pullY === 0 && !refreshing) return null;

  const progress = Math.min(pullY / THRESHOLD, 1);
  const scale    = 0.5 + progress * 0.5;

  return (
    <>
      <style>{`
        @keyframes ptrSpin  { to { transform: rotate(360deg); } }
        @keyframes ptrPulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: '50%',
          transform: `translateX(-50%) translateY(${Math.max(pullY - 32, 0)}px) scale(${scale})`,
          zIndex: 200,
          pointerEvents: 'none',
          transition: refreshing ? 'none' : 'transform 0.05s linear',
          willChange: 'transform',
        }}
      >
        {/* Ring */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: `rgba(52,211,153,${0.08 + progress * 0.1})`,
          border: `2px solid rgba(52,211,153,${0.25 + progress * 0.55})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 ${16 * progress}px rgba(52,211,153,${0.3 * progress})`,
          animation: refreshing ? 'ptrSpin 0.7s linear infinite' : undefined,
        }}>
          {/* Star */}
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              display: 'block',
              transform: `rotate(${progress * 180}deg)`,
              transition: refreshing ? 'none' : 'transform 0.05s linear',
              animation: refreshing ? 'ptrPulse 0.7s ease-in-out infinite' : undefined,
              filter: `drop-shadow(0 0 ${6 * progress}px rgba(52,211,153,0.8))`,
            }}
          >
            ✦
          </span>
        </div>

        {/* Label */}
        {progress >= 0.9 && (
          <p style={{
            color: '#34d399',
            fontSize: 10,
            fontWeight: 600,
            textAlign: 'center',
            marginTop: 4,
            whiteSpace: 'nowrap',
            letterSpacing: '0.08em',
            opacity: refreshing ? 1 : progress,
            animation: refreshing ? 'ptrPulse 0.7s ease-in-out infinite' : undefined,
          }}>
            {refreshing ? 'Refreshing…' : 'Release'}
          </p>
        )}
      </div>
    </>
  );
}
