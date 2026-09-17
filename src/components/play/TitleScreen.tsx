'use client';

import { useEffect, useState } from 'react';
import { LogOut, Play, Settings, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { game } from '@/game/state';
import { readCheckpoint, type GameScene } from '@/game/save';
import { GameMenu } from './GameMenu';

interface TitleScreenProps {
  onStart: (scene: GameScene) => void;
}

/** The front of the game: a still starfield with the small orrery turning
 *  in it, the wordmark, and four things to do. No WebGL until Continue. */
export function TitleScreen({ onStart }: TitleScreenProps) {
  const t = useTranslations('play');
  // Read after mount: the server has no checkpoint, and the first paint must match it.
  const [checkpoint, setCheckpoint] = useState<GameScene | null>(null);
  useEffect(() => { setCheckpoint(readCheckpoint()?.scene ?? null); }, []);
  const scene = checkpoint ?? 'moon';
  return (
    <GameMenu className="game-title" ariaLabel={t('title')}>
      <div className="game-title__mark">
        <p className="game-title__brand">Stellar</p>
        <h1 className="game-title__name font-display">{t('title')}</h1>
        <p className="game-title__tagline">{t('tagline')}</p>
      </div>
      <div className="game-menu__list">
        <button type="button" className="game-menu__item game-menu__item--primary" onClick={() => onStart(scene)}>
          <Play size={18} aria-hidden />
          <span className="game-menu__text">
            <span>{t(checkpoint ? 'continue' : 'begin')}</span>
            <small>{t(`at.${scene}`)}</small>
          </span>
        </button>
        <button type="button" className="game-menu__item" onClick={() => game.openOverlay('missions')}><Trophy size={18} aria-hidden /><span>{t('missions')}</span></button>
        <button type="button" className="game-menu__item" onClick={() => game.openOverlay('settings')}><Settings size={18} aria-hidden /><span>{t('settings')}</span></button>
        <button type="button" className="game-menu__item game-menu__item--exit" onClick={game.exit}><LogOut size={18} aria-hidden /><span>{t('exit')}</span></button>
      </div>
    </GameMenu>
  );
}
