'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SolarSystemCanvas } from '@/components/solar-system/SolarSystemCanvas';
import { PlayerShip, type LandingSite } from '@/components/solar-system/PlayerShip';
import { MoonSurface } from '@/components/solar-system/MoonSurface';
import { WorldSurface } from '@/components/solar-system/WorldSurface';
import { isWorldId } from '@/lib/solar-system/world-profiles';
import { CosmicLoader } from '@/components/solar-system/CosmicLoader';
import { useLoadingTips } from '@/components/solar-system/useLoadingTips';
import { createFlightSession, type FlightSession } from '@/lib/solar-system/player-ship';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

/** The climb back to orbit stays up at least this long, and until the deck has flown a few frames. */
const ASCENT_MIN_MS = 1600;
const ASCENT_FRAMES = 2;

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
  const tips = useLoadingTips();
  /** The way back up from a surface: the orbit scene refits its buffers and
   *  the deck resumes, and the screen covers that rather than showing it. */
  const [ascent, setAscent] = useState<'off' | 'on' | 'fading'>('off');
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
  const [landed, setLanded] = useState<LandingSite | null>(null);
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
  // Development only: `?moon` or `?land=mars|proximaB` opens straight onto that surface, for the capture harness.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const q = new URLSearchParams(window.location.search);
    const site = q.get('land') ?? '';
    if (q.has('moon')) setLanded('moon');
    else if (isWorldId(site)) setLanded(site);
  }, []);
  useEffect(() => {
    if (ascent === 'off') return;
    if (ascent === 'fading') {
      const id = window.setTimeout(() => setAscent('off'), 700);
      return () => window.clearTimeout(id);
    }
    const session = flightRef.current!;
    const from = session.telemetry.frame;
    const t0 = performance.now();
    let raf = 0;
    const wait = () => {
      const flown = !session.active || session.paused || session.telemetry.frame - from >= ASCENT_FRAMES;
      if (flown && performance.now() - t0 >= ASCENT_MIN_MS) setAscent('fading');
      else raf = requestAnimationFrame(wait);
    };
    raf = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(raf);
  }, [ascent]);
  const returnToOrbit = useCallback(() => { setAscent('on'); setLanded(null); }, []);
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
          onSelect={setSelectedId} onZoomToSun={zoomToSun} zoomTo={zoomTo} onZoomToConsumed={consumeZoom} flight={flightRef.current} suspended={landed !== null}
          onReady={onSceneReady} />
        <PlayerShip session={flightRef.current} onActiveChange={setFlightActive} onLand={(site) => { setLandscape(false); setLanded(site); }} landed={landed !== null}
          landscape={landscape} onLandscape={setLandscape} />
        {landed === 'moon' && <MoonSurface onReturn={returnToOrbit} />}
        {landed !== null && landed !== 'moon' && <WorldSurface world={landed} onReturn={returnToOrbit} />}
      </div>
      {/* Straight onto a surface, the orbit scene never draws: the surface has its own screen. */}
      <CosmicLoader className={sceneReady || landed !== null ? 'solar-system__loader is-done' : 'solar-system__loader'}
        label={t('loading.title')} detail={t('loading.detail')} tips={tips} />
      {ascent !== 'off' && (
        <CosmicLoader className={ascent === 'fading' ? 'solar-system__loader is-done' : 'solar-system__loader'} variant="ascent"
          label={t('loading.ascent')} detail={t('loading.ascentDetail')} tips={tips} />
      )}
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
