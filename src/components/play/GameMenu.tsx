'use client';

import type { ReactNode } from 'react';

interface GameMenuProps {
  className: string;
  ariaLabel: string;
  children: ReactNode;
}

/** Deterministic pseudo-random stars, the same on the server and the client. */
function starShadows(count: number, seed: number): string {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${Math.round(rnd() * 100)}vw ${Math.round(rnd() * 100)}vh 0 0 rgba(236, 240, 255, ${(0.25 + rnd() * 0.65).toFixed(2)})`);
  }
  return out.join(',');
}
const NEAR = starShadows(90, 7);
const FAR = starShadows(160, 131);

/** The sky behind every full-screen menu: the loader's own starfield with
 *  the small orrery turning in it, all CSS, no canvas. */
export function GameMenu({ className, ariaLabel, children }: GameMenuProps) {
  return (
    <div className={`game-menu ${className}`} role="dialog" aria-label={ariaLabel}>
      <span className="cosmic-loader__stars" style={{ boxShadow: FAR }} aria-hidden />
      <span className="cosmic-loader__stars cosmic-loader__stars--near" style={{ boxShadow: NEAR }} aria-hidden />
      <div className="cosmic-loader__system game-menu__orrery" aria-hidden>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--1"><i /></span>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--2"><i /></span>
        <span className="cosmic-loader__orbit cosmic-loader__orbit--3"><i /></span>
        <span className="cosmic-loader__sun" />
      </div>
      <div className="game-menu__panel">{children}</div>
    </div>
  );
}
