'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SolarSystemCanvas, type CosmicView } from '@/components/solar-system/SolarSystemCanvas';
import { PlanetDetailPanel } from '@/components/solar-system/PlanetDetailPanel';
import {
  MEAN_RADIUS_KM,
  type ScaleMode,
  type SolarBodyId,
} from '@/lib/solar-system/ephemeris';

const SPEED_STEPS = [
  { id: 'realtime', simSecPerRealSec: 1 },
  { id: '1h', simSecPerRealSec: 3600 },
  { id: '6h', simSecPerRealSec: 3600 * 6 },
  { id: '1d', simSecPerRealSec: 86400 },
  { id: '7d', simSecPerRealSec: 86400 * 7 },
] as const;

export default function SolarSystemExplorer() {
  const t = useTranslations('solarSystem');
  const format = useFormatter();
  const router = useRouter();

  const [epochMs, setEpochMs] = useState(() => Date.now());
  const [scaleMode, setScaleMode] = useState<ScaleMode>('orrery');
  const [includePluto, setIncludePluto] = useState(true);
  const [selectedId, setSelectedId] = useState<SolarBodyId | null>(null);
  const [focusId, setFocusId] = useState<SolarBodyId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [cosmic, setCosmic] = useState<CosmicView>({
    solar: 1, stellar: 0, galactic: 0, universe: 0, web: 0,
    sunScreen: null, milkyWayScreen: null,
  });
  const [zoomTo, setZoomTo] = useState<number | null>(null);
  const handleZoomToSun = useCallback(() => {
    // Snap back into the solar system tier — same default radius as load.
    setZoomTo(26);
  }, []);
  const consumeZoomTo = useCallback(() => setZoomTo(null), []);

  const simRate = SPEED_STEPS[speedIdx].simSecPerRealSec;

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
      setEpochMs((e) => e + simRate * dt * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, simRate]);

  const dateLabel = useMemo(() => {
    try {
      return format.dateTime(new Date(epochMs), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(epochMs).toISOString();
    }
  }, [epochMs, format]);

  const resetNow = useCallback(() => {
    setEpochMs(Date.now());
    setPlaying(false);
  }, []);

  const handleBodyPick = useCallback((id: SolarBodyId | null) => {
    setSelectedId(id);
    if (id) setFocusId(id);
    else setFocusId(null);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    /* Keep focus so the camera stays on the body; user can zoom out and pick another. */
  }, []);

  const exitToSky = useCallback(() => {
    router.push('/sky');
  }, [router]);

  const bodyCopy = useMemo(() => {
    const ids: SolarBodyId[] = [
      'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn',
      'uranus', 'neptune', 'pluto',
    ];
    const o = {} as Record<SolarBodyId, { name: string; blurb: string }>;
    for (const id of ids) {
      o[id] = {
        name: t(`bodies.${id}.name` as 'bodies.sun.name'),
        blurb: t(`bodies.${id}.blurb` as 'bodies.sun.blurb'),
      };
    }
    return o;
  }, [t]);

  const radiusLabel = (id: SolarBodyId) => {
    const km = MEAN_RADIUS_KM[id];
    if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}×10⁶ km`;
    if (km >= 1000) return `${(km / 1000).toFixed(1)}×10³ km`;
    return `${km} km`;
  };

  return (
    <div className="solar-system solar-system--immersive">
      <div className="solar-system__chrome-float">
        <button
          type="button"
          className="solar-system__fab solar-system__fab--close"
          onClick={exitToSky}
          aria-label={t('immersive.exit')}
        >
          <X size={20} strokeWidth={2.2} aria-hidden />
        </button>
        <span className="solar-system__mini-clock" aria-live="polite">{dateLabel}</span>
      </div>

      <div className="solar-system__viewport solar-system__viewport--fill">
        <SolarSystemCanvas
          epochMs={epochMs}
          scaleMode={scaleMode}
          includePluto={includePluto}
          selectedId={selectedId}
          focusBodyId={focusId}
          onSelect={handleBodyPick}
          onCosmicView={setCosmic}
          onZoomToSun={handleZoomToSun}
          zoomTo={zoomTo}
          onZoomToConsumed={consumeZoomTo}
        />
        <CosmicOverlay cosmic={cosmic} onZoomToSun={handleZoomToSun} />
        <div className="solar-system__viewport-hint solar-system__viewport-hint--compact">
          <Orbit size={14} aria-hidden />
          <span>{t('dragHint')}</span>
        </div>
      </div>

      <div className="solar-system__dock">
        <div className="solar-system__dock-row solar-system__dock-row--controls">
          <button
            type="button"
            className="solar-system__btn solar-system__btn--primary solar-system__btn--grow"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            {playing ? t('time.pause') : t('time.play')}
          </button>
          <button type="button" className="solar-system__btn" onClick={resetNow}>
            <RotateCcw size={18} aria-hidden />
            {t('time.now')}
          </button>
          <button
            type="button"
            className={`solar-system__iconbtn${viewOpen ? ' is-active' : ''}`}
            onClick={() => setViewOpen((o) => !o)}
            aria-expanded={viewOpen}
            aria-label={t('view.title')}
          >
            <Settings2 size={20} aria-hidden />
          </button>
        </div>

        <label className="solar-system__dock-label" htmlFor="solar-epoch-range">
          {t('time.scrub')}
        </label>
        <input
          id="solar-epoch-range"
          className="solar-system__range"
          type="range"
          min={Date.now() - 1000 * 86400 * 365 * 2}
          max={Date.now() + 1000 * 86400 * 365 * 2}
          step={3600000}
          value={epochMs}
          onChange={(e) => {
            setEpochMs(Number(e.target.value));
            setPlaying(false);
          }}
        />

        <div className="solar-system__speeds-wrap">
          <div className="solar-system__speeds" role="tablist" aria-label={t('time.speedAria')}>
            {SPEED_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                className={`solar-system__chip${i === speedIdx ? ' is-active' : ''}`}
                onClick={() => setSpeedIdx(i)}
              >
                {t(`time.speed.${s.id}`)}
              </button>
            ))}
          </div>
        </div>

        {viewOpen && (
          <div className="solar-system__view-pop">
            <div className="solar-system__view-pop-head">
              <Sparkles size={14} aria-hidden />
              <span>{t('view.title')}</span>
            </div>
            <div className="solar-system__seg solar-system__seg--full">
              <button
                type="button"
                className={scaleMode === 'orrery' ? 'is-active' : ''}
                onClick={() => setScaleMode('orrery')}
              >
                {t('view.orrery')}
              </button>
              <button
                type="button"
                className={scaleMode === 'linear' ? 'is-active' : ''}
                onClick={() => setScaleMode('linear')}
              >
                {t('view.linear')}
              </button>
            </div>
            <label className="solar-system__check">
              <input
                type="checkbox"
                checked={includePluto}
                onChange={(e) => setIncludePluto(e.target.checked)}
              />
              {t('view.pluto')}
            </label>
          </div>
        )}
      </div>

      {selectedId && (
        <PlanetDetailPanel
          bodyId={selectedId}
          bodyName={bodyCopy[selectedId].name}
          bodyBlurb={bodyCopy[selectedId].blurb}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}

/** Floating HTML labels driven by the per-frame projected positions:
 *   - "Sun" pin appears once the user zooms past the solar tier.
 *   - "Milky Way" chip appears at the galactic tier and is the only
 *     selectable backdrop — tapping it eases the camera back to the Sun.
 *
 *  Rendered as siblings of the WebGL canvas so the DOM picks up clicks
 *  cleanly without competing with three.js raycasting. */
function CosmicOverlay({
  cosmic,
  onZoomToSun,
}: {
  cosmic: CosmicView;
  onZoomToSun: () => void;
}) {
  const sunOpacity = Math.min(1, cosmic.stellar * 1.2);
  const mwOpacity = Math.min(1, cosmic.galactic * 1.1);
  return (
    <>
      {cosmic.sunScreen && sunOpacity > 0.05 && (
        <div
          className="cosmic-label cosmic-label--sun"
          style={{
            left: cosmic.sunScreen.x,
            top: cosmic.sunScreen.y,
            opacity: sunOpacity,
          }}
          aria-hidden="true"
        >
          <span className="cosmic-label__pin" />
          <span className="cosmic-label__text">Sun</span>
        </div>
      )}
      {cosmic.milkyWayScreen && mwOpacity > 0.05 && (
        <button
          type="button"
          className="cosmic-label cosmic-label--mw"
          style={{
            left: cosmic.milkyWayScreen.x,
            top: cosmic.milkyWayScreen.y,
            opacity: mwOpacity,
          }}
          onClick={onZoomToSun}
        >
          <span className="cosmic-label__pin cosmic-label__pin--mw" />
          <span className="cosmic-label__text cosmic-label__text--mw">
            Milky Way
            <span className="cosmic-label__hint">tap to zoom in</span>
          </span>
        </button>
      )}
    </>
  );
}
