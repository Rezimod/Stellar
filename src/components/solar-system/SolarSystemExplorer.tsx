'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Rocket, RotateCcw, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { SolarSystemCanvas } from '@/components/solar-system/SolarSystemCanvas';
import { CosmicLoader } from '@/components/solar-system/CosmicLoader';
import { useLoadingTips } from '@/components/solar-system/useLoadingTips';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

const SPEED_STEPS = [
  { id: 'realtime', rate: 1 },
  { id: '10m', rate: 600 },
  { id: '1h', rate: 3600 },
  { id: '1d', rate: 86400 },
] as const;

/** The guide: the orrery, its clock, and the way into the game. Flight and
 *  the surfaces live in Stellar Explore at /play. */
export default function SolarSystemExplorer() {
  const t = useTranslations('solarSystem');
  const format = useFormatter();
  const router = useRouter();
  // The loading screen stays up until the canvas has drawn its first frame,
  // so the jump from the button to the scene never shows an empty black page.
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const tips = useLoadingTips();
  useEffect(() => {
    const giveUp = window.setTimeout(() => setSceneReady(true), 30000);
    return () => window.clearTimeout(giveUp);
  }, []);
  const [epochMs, setEpochMs] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<SolarBodyId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [zoomTo, setZoomTo] = useState<number | null>(null);
  const zoomToSun = useCallback(() => { setSelectedId(null); setZoomTo(26); }, []);
  const consumeZoom = useCallback(() => setZoomTo(null), []);

  useEffect(() => {
    document.body.setAttribute('data-solar-immersive', '1');
    return () => document.body.removeAttribute('data-solar-immersive');
  }, []);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setEpochMs((e) => e + SPEED_STEPS[speedIdx].rate * dt * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speedIdx]);

  return (
    <div className="solar-system solar-system--immersive" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onSelect={(e) => e.preventDefault()}>
      <div className="solar-system__chrome-float">
        <button type="button" className="solar-system__fab solar-system__fab--close" onClick={() => router.push('/sky')} aria-label={t('immersive.exit')}>
          <X size={20} aria-hidden />
        </button>
        <span className="solar-system__mini-clock">
          {selectedId ? t(`bodies.${selectedId}.name`) : format.dateTime(new Date(epochMs), { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <div className="solar-system__viewport solar-system__viewport--fill">
        <SolarSystemCanvas epochMs={epochMs} scaleMode="orrery" includePluto selectedId={selectedId} focusBodyId={selectedId}
          onSelect={setSelectedId} onZoomToSun={zoomToSun} zoomTo={zoomTo} onZoomToConsumed={consumeZoom} onReady={onSceneReady} />
      </div>
      {/* The game has its own document: a full navigation, so fullscreen and the locks start clean there. */}
      <a className="solar-system__launch" href="/play">
        <Rocket size={18} aria-hidden />
        <span className="solar-system__launch-text">
          <span className="solar-system__launch-title">{t('launch')}</span>
          <span className="solar-system__launch-sub">{t('launchSub')}</span>
        </span>
      </a>
      <CosmicLoader className={sceneReady ? 'solar-system__loader is-done' : 'solar-system__loader'}
        label={t('loading.title')} detail={t('loading.detail')} tips={tips} />
      <div className="solar-system__dockbar" role="group" aria-label={t('time.title')}>
        <button type="button" className="solar-system__dockbtn" onClick={() => setPlaying((p) => !p)} aria-label={t(playing ? 'time.pause' : 'time.play')}>
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <button type="button" className="solar-system__chip solar-system__ratebtn" onClick={() => setSpeedIdx((i) => (i + 1) % SPEED_STEPS.length)} aria-label={t('time.speedAria')}>
          {t(`time.speed.${SPEED_STEPS[speedIdx].id}`)}
        </button>
        <button type="button" className="solar-system__dockbtn" onClick={() => { setEpochMs(Date.now()); zoomToSun(); }} aria-label={t('time.now')}>
          <RotateCcw size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
