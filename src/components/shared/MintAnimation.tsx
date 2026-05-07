'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MintAnimationProps {
  done?: boolean;
  slowMsg?: boolean;
  title?: string;
  subtitle?: string;
  doneTitle?: string;
  doneSubtitle?: string;
}

export default function MintAnimation({
  done = false,
  slowMsg,
  title = 'Sealing Observation',
  subtitle = 'Writing to Solana devnet',
  doneTitle = 'Sealed on Solana ✦',
  doneSubtitle = 'Proof recorded on-chain',
}: MintAnimationProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 sm:gap-8 px-6 text-center"
      style={{
        background: 'rgba(7,11,20,0.96)',
        backdropFilter: 'blur(12px)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >

      {/* Ring stack */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>

        {/* Pulse ring */}
        {!done && (
          <div className="absolute rounded-full animate-ping" style={{
            width: 160, height: 160,
            border: '1px solid rgba(255, 179, 71,0.07)',
            animationDuration: '2.4s',
          }} />
        )}

        {/* Outer ring — slow spin with tick dots */}
        <div
          className={`absolute rounded-full ${!done ? 'animate-spin' : ''}`}
          style={{
            width: 140, height: 140,
            border: `1px solid ${done ? 'rgba(94, 234, 212,0.25)' : 'rgba(255, 179, 71,0.14)'}`,
            animationDuration: '9s',
            transition: 'border-color 0.6s',
          }}
        >
          {!done && [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 2, height: 2, borderRadius: '50%',
              background: 'rgba(255, 179, 71,0.25)',
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateY(-69px) translate(-50%,-50%)`,
            }} />
          ))}
        </div>

        {/* Mid ring — fast conic arc */}
        {!done ? (
          <div
            className="absolute rounded-full animate-spin"
            style={{
              width: 112, height: 112,
              animationDuration: '1.4s',
              background: 'conic-gradient(from 0deg, transparent 65%, rgba(255, 179, 71,0.95) 83%, rgba(255, 179, 71,0.6) 100%)',
              WebkitMask: 'radial-gradient(circle, transparent 51px, black 52px)',
              mask: 'radial-gradient(circle, transparent 51px, black 52px)',
            }}
          />
        ) : (
          <div className="absolute rounded-full" style={{
            width: 112, height: 112,
            border: '1.5px solid rgba(94, 234, 212,0.45)',
            boxShadow: '0 0 28px rgba(94, 234, 212,0.18), inset 0 0 16px rgba(94, 234, 212,0.06)',
          }} />
        )}

        {/* Counter-spin thin ring */}
        {!done && (
          <div
            className="absolute rounded-full animate-spin"
            style={{
              width: 90, height: 90,
              animationDuration: '3s',
              animationDirection: 'reverse',
              background: 'conic-gradient(from 180deg, transparent 80%, rgba(255, 179, 71,0.4) 100%)',
              WebkitMask: 'radial-gradient(circle, transparent 42px, black 43px)',
              mask: 'radial-gradient(circle, transparent 42px, black 43px)',
            }}
          />
        )}

        {/* Inner static ring */}
        <div className="absolute rounded-full" style={{ width: 74, height: 74, border: '1px solid rgba(255,255,255,0.04)' }} />

        {/* Glow */}
        <div className="absolute rounded-full" style={{
          width: 56, height: 56,
          background: done
            ? 'radial-gradient(circle, rgba(94, 234, 212,0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255, 179, 71,0.14) 0%, transparent 70%)',
          transition: 'background 0.8s ease',
        }} />

        {/* Center */}
        <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(94, 234, 212,0.9))' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <div className="animate-pulse rounded-full" style={{
              width: 10, height: 10, background: 'var(--stars)',
              boxShadow: '0 0 20px rgba(255, 179, 71,0.9), 0 0 40px rgba(255, 179, 71,0.35)',
            }} />
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-text-primary font-semibold text-lg tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
          {done ? doneTitle : title}
        </p>
        <p className="text-text-muted text-[11px] tracking-widest uppercase">
          {done ? doneSubtitle : subtitle}
        </p>
        {!done && (
          <div className="flex justify-center gap-1.5 mt-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                style={{ background: 'rgba(255, 179, 71,0.5)', animationDelay: `${i * 180}ms` }} />
            ))}
          </div>
        )}
        {slowMsg && !done && (
          <p className="text-text-muted text-[11px] mt-3 text-center max-w-[220px] leading-relaxed">
            Still sealing — Solana devnet can be slow. Don&apos;t close the app.
          </p>
        )}
      </div>

    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
