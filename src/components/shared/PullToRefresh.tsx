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
  const scale = 0.7 + progress * 0.3;
  const drift = Math.min(pullY * 0.35, 28);

  return (
    <>
      <style>{`
        @keyframes ptrBands    { from { transform: translateX(0); } to { transform: translateX(-44px); } }
        @keyframes ptrSpinFast { to { transform: rotate(360deg); } }
        @keyframes ptrFloat    { 0%,100% { transform: translateY(-50%) translateX(-50%) scale(var(--s,1)) translateY(0); } 50% { transform: translateY(-50%) translateX(-50%) scale(var(--s,1)) translateY(-2px); } }
        @keyframes ptrLabel    { 0%,100% { opacity: 0.7 } 50% { opacity: 1 } }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '18vh',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${drift}px) scale(${scale})`,
          zIndex: 200,
          pointerEvents: 'none',
          transition: refreshing ? 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)' : 'transform 0.08s linear',
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            position: 'relative',
            filter: `drop-shadow(0 6px 18px rgba(232,168,104,${0.35 * progress})) drop-shadow(0 0 ${20 * progress}px rgba(255,180,80,${0.4 * progress}))`,
          }}
        >
          <svg width={56} height={56} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="ptrJBody" cx="0.35" cy="0.32" r="0.78">
                <stop offset="0" stopColor="#FFE6BC" />
                <stop offset="0.35" stopColor="#E8A868" />
                <stop offset="0.75" stopColor="#A45A28" />
                <stop offset="1" stopColor="#3D1A0A" />
              </radialGradient>
              <radialGradient id="ptrJHalo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0.55" stopColor="#FFB84A" stopOpacity="0.35" />
                <stop offset="1" stopColor="#FFB84A" stopOpacity="0" />
              </radialGradient>
              <clipPath id="ptrJClip">
                <circle cx="28" cy="28" r="22" />
              </clipPath>
              <linearGradient id="ptrJRim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFF4C4" stopOpacity="0.5" />
                <stop offset="0.5" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#1A0A04" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            <circle cx="28" cy="28" r="27" fill="url(#ptrJHalo)" />
            <circle cx="28" cy="28" r="22" fill="url(#ptrJBody)" />

            <g clipPath="url(#ptrJClip)">
              <g opacity="0.55">
                <ellipse cx="28" cy="15" rx="24" ry="1.4" fill="#6B3E1A" opacity="0.55" />
                <ellipse cx="28" cy="19" rx="24" ry="1.1" fill="#F4D9A8" opacity="0.4" />
                <ellipse cx="28" cy="24" rx="24" ry="1.5" fill="#8B5A2B" opacity="0.55" />
                <ellipse cx="28" cy="29" rx="24" ry="1.2" fill="#F4D9A8" opacity="0.3" />
                <ellipse cx="28" cy="34" rx="24" ry="1.6" fill="#6B3E1A" opacity="0.55" />
                <ellipse cx="28" cy="39" rx="24" ry="1.2" fill="#F4D9A8" opacity="0.3" />
                <ellipse cx="28" cy="43" rx="24" ry="1.3" fill="#6B3E1A" opacity="0.45" />
              </g>

              <g
                style={{
                  animation: refreshing
                    ? 'ptrBands 0.9s linear infinite'
                    : `ptrBands ${3.2 - progress * 1.5}s linear infinite`,
                }}
              >
                <g>
                  <ellipse cx="20" cy="22" rx="4" ry="1" fill="#F4D9A8" opacity="0.55" />
                  <ellipse cx="38" cy="29" rx="3" ry="0.9" fill="#FFE4B5" opacity="0.45" />
                  <ellipse cx="22" cy="34" rx="4.2" ry="1.9" fill="#B8391E" opacity="0.9" />
                  <ellipse cx="22" cy="34" rx="2.4" ry="1.1" fill="#7A1E0E" opacity="0.7" />
                  <ellipse cx="40" cy="39" rx="2.5" ry="0.8" fill="#6B3E1A" opacity="0.6" />
                </g>
                <g transform="translate(44 0)">
                  <ellipse cx="20" cy="22" rx="4" ry="1" fill="#F4D9A8" opacity="0.55" />
                  <ellipse cx="38" cy="29" rx="3" ry="0.9" fill="#FFE4B5" opacity="0.45" />
                  <ellipse cx="22" cy="34" rx="4.2" ry="1.9" fill="#B8391E" opacity="0.9" />
                  <ellipse cx="22" cy="34" rx="2.4" ry="1.1" fill="#7A1E0E" opacity="0.7" />
                  <ellipse cx="40" cy="39" rx="2.5" ry="0.8" fill="#6B3E1A" opacity="0.6" />
                </g>
              </g>
            </g>

            <circle cx="28" cy="28" r="22" fill="none" stroke="url(#ptrJRim)" strokeWidth="1.2" />
            <ellipse cx="20" cy="18" rx="6" ry="3" fill="#FFF4C4" opacity="0.18" />
          </svg>
        </div>

        {progress >= 0.9 && (
          <span
            style={{
              color: '#FFD9A8',
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              opacity: refreshing ? 1 : progress,
              animation: refreshing ? 'ptrLabel 1.2s ease-in-out infinite' : undefined,
              textShadow: '0 0 12px rgba(255,184,74,0.4)',
            }}
          >
            {refreshing ? 'Refreshing' : 'Release'}
          </span>
        )}
      </div>
    </>
  );
}
