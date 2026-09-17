'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { game, STAGE_PROGRESS } from '@/game/state';
import { isGameScene, type GameScene } from '@/game/save';
import { attachConsoleGuards, enterFullscreen, exitFullscreen, unlockPointer } from '@/game/console';
import { exitToStellar } from '@/game/platform';
import { registerServiceWorker } from '@/game/sw';
import { CosmicLoader } from '@/components/solar-system/CosmicLoader';
import { useLoadingTips } from '@/components/solar-system/useLoadingTips';
import { GameWorld } from './GameWorld';
import { TitleScreen } from './TitleScreen';
import { PauseMenu } from './PauseMenu';
import { SettingsPanel } from './SettingsPanel';
import { ControlsPanel } from './ControlsPanel';
import { MissionsPanel } from './MissionsPanel';

/** A deep link straight onto a scene: /play?moon, ?land=mars, ?orbit. */
function sceneFromQuery(): GameScene | undefined {
  const q = new URLSearchParams(window.location.search);
  if (q.has('moon')) return 'moon';
  if (q.has('orbit')) return 'orbit';
  const site = q.get('land') ?? '';
  return isGameScene(site) ? site : undefined;
}

export default function GameShell() {
  const snap = useSyncExternalStore(game.subscribe, game.get, game.get);
  const t = useTranslations('play');
  const tips = useLoadingTips();
  const rootRef = useRef<HTMLDivElement>(null);
  const { state, scene, stage, overlay } = snap;

  useEffect(() => {
    document.body.setAttribute('data-solar-immersive', '1');
    game.boot(sceneFromQuery());
    void registerServiceWorker();
    const root = rootRef.current;
    const detach = root ? attachConsoleGuards(root) : undefined;
    // Esc pauses and resumes; it is taken in the capture phase so the flight
    // deck, which also listens for it, never sees it twice.
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const s = game.get();
      if (s.overlay !== 'none') game.closeOverlay();
      else if (s.state === 'playing') game.pause();
      else if (s.state === 'paused') game.resume();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    // A hidden tab or a closed fullscreen pauses; a lost pointer lock comes
    // up through the deck or the surface that held it.
    const onHidden = () => { if (document.hidden) game.pause(); };
    const onFullscreen = () => { if (!document.fullscreenElement) game.pause(); };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('visibilitychange', onHidden);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.body.removeAttribute('data-solar-immersive');
      detach?.();
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onHidden);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);
  useEffect(() => {
    if (state === 'paused') unlockPointer();
    if (state === 'exiting') void exitFullscreen().finally(exitToStellar);
  }, [state]);

  const start = (to: GameScene) => {
    void enterFullscreen(rootRef.current ?? undefined);
    game.start(to);
  };
  const resume = () => {
    void enterFullscreen(rootRef.current ?? undefined);
    game.resume();
  };
  const inWorld = state !== 'boot' && state !== 'title' && state !== 'exiting';

  return (
    <div ref={rootRef} className="game-shell" data-state={state}>
      {inWorld && <GameWorld key={snap.generation} scene={scene} state={state} />}
      {state === 'loading' && (
        <CosmicLoader className="game-shell__loader" variant={scene === 'orbit' ? 'orrery' : 'descent'}
          label={t(`loading.scene.${scene}`)} detail={t(`loading.${stage}`)} progress={STAGE_PROGRESS[stage]} tips={tips} />
      )}
      {state === 'title' && overlay === 'none' && <TitleScreen onStart={start} />}
      {state === 'paused' && overlay === 'none' && <PauseMenu onResume={resume} />}
      {overlay === 'settings' && <SettingsPanel onClose={game.closeOverlay} />}
      {overlay === 'controls' && <ControlsPanel onClose={game.closeOverlay} />}
      {overlay === 'missions' && <MissionsPanel onClose={game.closeOverlay} />}
    </div>
  );
}
