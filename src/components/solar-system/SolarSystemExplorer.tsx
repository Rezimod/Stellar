'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SolarSystemCanvas } from '@/components/solar-system/SolarSystemCanvas';
import { PlayerShip } from '@/components/solar-system/PlayerShip';
import { MoonSurface } from '@/components/solar-system/MoonSurface';
import { CosmicLoader } from '@/components/solar-system/CosmicLoader';
import { createFlightSession, type FlightSession } from '@/lib/solar-system/player-ship';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

const SPEED_STEPS = [
  { id: 'realtime', rate: 1 },
  { id: '10m', rate: 600 },
  { id: '1h', rate: 3600 },
  { id: '1d', rate: 86400 },
] as const;

export default function SolarSystemExplorer() {
  const t = useTranslations('solarSystem');
  const format = useFormatter();
  // The loading screen stays up until the canvas has drawn its first frame,
  // so the jump from the button to the scene never shows an empty black page.
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    const giveUp = window.setTimeout(() => setSceneReady(true), 30000);
    return () => window.clearTimeout(giveUp);
  }, []);
  const router = useRouter();
  const [epochMs, setEpochMs] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<SolarBodyId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [flightActive, setFlightActive] = useState(false);
  const [landed, setLanded] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [zoomTo, setZoomTo] = useState<number | null>(null);
  const flightRef = useRef<FlightSession | null>(null);
  if (!flightRef.current) flightRef.current = createFlightSession();
  const zoomToSun = useCallback(() => { setSelectedId(null); setZoomTo(26); }, []);
  const consumeZoom = useCallback(() => setZoomTo(null), []);

  useEffect(() => {
    document.body.setAttribute('data-solar-immersive', '1');
    return () => document.body.removeAttribute('data-solar-immersive');
  }, []);
  // Development only: `?moon` opens straight onto the surface, for the capture harness.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('moon')) setLanded(true);
  }, []);
  // The turned viewport has new sides; the renderer refits on the resize it
  // would otherwise never hear about.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [landscape]);
  useEffect(() => {
    if (!playing || flightActive) return;
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
  }, [playing, speedIdx, flightActive]);

  return (
    <div className="solar-system solar-system--immersive" data-flying={flightActive} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onSelect={(e) => e.preventDefault()}>
      {!flightActive && <div className="solar-system__chrome-float">
        <button type="button" className="solar-system__fab solar-system__fab--close" onClick={() => router.push('/sky')} aria-label={t('immersive.exit')}>
          <X size={20} aria-hidden />
        </button>
        <span className="solar-system__mini-clock">
          {selectedId ? t(`bodies.${selectedId}.name`) : format.dateTime(new Date(epochMs), { month: 'short', day: 'numeric' })}
        </span>
      </div>}
      <div className="solar-system__viewport solar-system__viewport--fill" data-rotate={landscape && flightActive ? 'cw' : undefined}>
        <SolarSystemCanvas epochMs={epochMs} scaleMode="orrery" includePluto selectedId={selectedId} focusBodyId={selectedId}
          onSelect={setSelectedId} onZoomToSun={zoomToSun} zoomTo={zoomTo} onZoomToConsumed={consumeZoom} flight={flightRef.current} suspended={landed}
          onReady={onSceneReady} />
        <PlayerShip session={flightRef.current} onActiveChange={setFlightActive} onLand={() => { setLandscape(false); setLanded(true); }} landed={landed}
          landscape={landscape} onLandscape={setLandscape} />
        {landed && <MoonSurface onReturn={() => setLanded(false)} />}
      </div>
      {/* Straight onto the Moon, the orbit scene never draws: the Moon has its own screen. */}
      <CosmicLoader className={sceneReady || landed ? 'solar-system__loader is-done' : 'solar-system__loader'}
        label={t('loading.title')} detail={t('loading.detail')} />
      {!flightActive && <div className="solar-system__dockbar" role="group" aria-label={t('time.title')}>
        <button type="button" className="solar-system__dockbtn" onClick={() => setPlaying((p) => !p)} aria-label={t(playing ? 'time.pause' : 'time.play')}>
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <button type="button" className="solar-system__chip solar-system__ratebtn" onClick={() => setSpeedIdx((i) => (i + 1) % SPEED_STEPS.length)} aria-label={t('time.speedAria')}>
          {t(`time.speed.${SPEED_STEPS[speedIdx].id}`)}
        </button>
        <button type="button" className="solar-system__dockbtn" onClick={() => { setEpochMs(Date.now()); zoomToSun(); }} aria-label={t('time.now')}>
          <RotateCcw size={16} aria-hidden />
        </button>
      </div>}
    </div>
  );
}
