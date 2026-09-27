'use client';

import type { ReactNode } from 'react';
import { CosmicSky, CosmicSystem } from '@/components/solar-system/CosmicLoader';

interface GameMenuProps {
  className: string;
  ariaLabel: string;
  children: ReactNode;
}

/** The sky behind every full-screen menu: the loader's own starfield with
 *  the Earth and the Moon turning in it, all CSS, no canvas. */
export function GameMenu({ className, ariaLabel, children }: GameMenuProps) {
  return (
    <div className={`game-menu ${className}`} role="dialog" aria-label={ariaLabel}>
      <CosmicSky />
      <CosmicSystem className="game-menu__orrery" />
      <div className="game-menu__panel">{children}</div>
    </div>
  );
}
