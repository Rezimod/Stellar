'use client';

import { useEffect, useState } from 'react';

export type LoaderVariant = 'orrery' | 'descent' | 'ascent' | 'hyperspace';

interface CosmicLoaderProps {
  label: string;
  detail?: string;
  className?: string;
  /** What turns in the middle: the small orrery, the Moon with a lander
   *  going down or up, or the star streaks of a ship getting under way. */
  variant?: LoaderVariant;
  /** Lines to hand the reader while they wait; one at a time, in order. */
  tips?: string[];
  /** 0..1 when the caller knows how far along it is; otherwise the bar just moves. */
  progress?: number;
}

/** Deterministic pseudo-random stars, so the server and the client draw the same sky. */
function starShadows(count: number, seed: number, size: number): string {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rnd() * 100);
    const y = Math.round(rnd() * 100);
    const a = (0.25 + rnd() * 0.65).toFixed(2);
    out.push(`${x}vw ${y}vh 0 ${size}px rgba(236, 240, 255, ${a})`);
  }
  return out.join(',');
}
const NEAR = starShadows(90, 7, 0);
const FAR = starShadows(160, 131, 0);
const STREAKS = Array.from({ length: 14 }, (_, i) => i);
/** How long each tip stays up. */
const TIP_MS = 3800;

/** The wait before a 3D scene: a starfield, something turning in the
 *  middle of it, and a line worth reading while the scene comes up. */
export function CosmicLoader({ label, detail, className, variant = 'orrery', tips, progress }: CosmicLoaderProps) {
  const [tip, setTip] = useState(0);
  const count = tips?.length ?? 0;
  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => setTip((i) => (i + 1) % count), TIP_MS);
    return () => window.clearInterval(id);
  }, [count]);
  return (
    <div className={className ? `cosmic-loader ${className}` : 'cosmic-loader'} data-variant={variant} role="status" aria-live="polite">
      <span className="cosmic-loader__stars" style={{ boxShadow: FAR }} aria-hidden />
      <span className="cosmic-loader__stars cosmic-loader__stars--near" style={{ boxShadow: NEAR }} aria-hidden />
      {variant === 'orrery' && (
        <div className="cosmic-loader__system" aria-hidden>
          <span className="cosmic-loader__orbit cosmic-loader__orbit--1"><i /></span>
          <span className="cosmic-loader__orbit cosmic-loader__orbit--2"><i /></span>
          <span className="cosmic-loader__orbit cosmic-loader__orbit--3"><i /></span>
          <span className="cosmic-loader__sun" />
        </div>
      )}
      {(variant === 'descent' || variant === 'ascent') && (
        <div className="cosmic-loader__moon-scene" aria-hidden>
          <span className="cosmic-loader__moon" />
          <span className="cosmic-loader__lander"><i /></span>
        </div>
      )}
      {variant === 'hyperspace' && (
        <div className="cosmic-loader__streaks" aria-hidden>
          {STREAKS.map((i) => <span key={i} style={{ '--i': i } as React.CSSProperties} />)}
          <b />
        </div>
      )}
      <p className="cosmic-loader__label">{label}</p>
      {detail && <p className="cosmic-loader__detail">{detail}</p>}
      <span className="cosmic-loader__bar" data-determinate={progress !== undefined ? '' : undefined} aria-hidden>
        <i style={progress !== undefined ? { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` } : undefined} />
      </span>
      {count > 0 && tips && <p key={tip} className="cosmic-loader__tip">{tips[tip]}</p>}
    </div>
  );
}
