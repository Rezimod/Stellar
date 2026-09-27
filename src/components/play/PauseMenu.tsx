'use client';

import { Keyboard, LogOut, Play, RotateCcw, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { game } from '@/game/state';

interface PauseMenuProps {
  onResume: () => void;
}

/** Over the frozen scene: no starfield, just the panel. */
export function PauseMenu({ onResume }: PauseMenuProps) {
  const t = useTranslations('play');
  return (
    <div className="game-menu game-pause" role="dialog" aria-label={t('paused')}>
      <div className="game-menu__panel">
        <p className="game-pause__title font-display">{t('paused')}</p>
        <div className="game-menu__list">
          <button type="button" className="game-menu__item game-menu__item--primary" onClick={onResume} autoFocus><Play size={18} aria-hidden /><span>{t('resume')}</span></button>
          <button type="button" className="game-menu__item" onClick={() => game.openOverlay('settings')}><Settings size={18} aria-hidden /><span>{t('settings')}</span></button>
          <button type="button" className="game-menu__item" onClick={() => game.openOverlay('controls')}><Keyboard size={18} aria-hidden /><span>{t('controls')}</span></button>
          <button type="button" className="game-menu__item" onClick={game.restart}><RotateCcw size={18} aria-hidden /><span>{t('restart')}</span></button>
          <button type="button" className="game-menu__item game-menu__item--exit" onClick={game.exit}><LogOut size={18} aria-hidden /><span>{t('exit')}</span></button>
        </div>
      </div>
    </div>
  );
}
