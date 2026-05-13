'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Gauge,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SolarSystemCanvas } from '@/components/solar-system/SolarSystemCanvas';
import {
  GALILEAN_MEAN_RADIUS_KM,
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

  const [epochMs, setEpochMs] = useState(() => Date.now());
  const [scaleMode, setScaleMode] = useState<ScaleMode>('orrery');
  const [includePluto, setIncludePluto] = useState(true);
  const [selectedId, setSelectedId] = useState<SolarBodyId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2);

  const simRate = SPEED_STEPS[speedIdx].simSecPerRealSec;

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
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return new Date(epochMs).toISOString();
    }
  }, [epochMs, format]);

  const resetNow = useCallback(() => {
    setEpochMs(Date.now());
    setPlaying(false);
  }, []);

  const bodyCopy = useMemo(() => {
    const ids: SolarBodyId[] = [
      'sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn',
      'uranus', 'neptune', 'pluto', 'io', 'europa', 'ganymede', 'callisto',
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
    if (id === 'io' || id === 'europa' || id === 'ganymede' || id === 'callisto') {
      const km = GALILEAN_MEAN_RADIUS_KM[id];
      return `${km} km`;
    }
    const km = MEAN_RADIUS_KM[id as keyof typeof MEAN_RADIUS_KM];
    if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}×10⁶ km`;
    if (km >= 1000) return `${(km / 1000).toFixed(1)}×10³ km`;
    return `${km} km`;
  };

  return (
    <div className="solar-system">
      <header className="solar-system__header">
        <Link href="/sky" className="solar-system__back" aria-label={t('backSky')}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
        </Link>
        <div className="solar-system__headline">
          <h1 className="solar-system__title">{t('title')}</h1>
          <p className="solar-system__subtitle">{t('subtitle')}</p>
        </div>
        <div className="solar-system__header-meta" aria-live="polite">
          <span className="solar-system__clock">{dateLabel}</span>
        </div>
      </header>

      <div className="solar-system__main">
        <div className="solar-system__viewport">
          <SolarSystemCanvas
            epochMs={epochMs}
            scaleMode={scaleMode}
            includePluto={includePluto}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="solar-system__viewport-hint">
            <Orbit size={14} aria-hidden />
            <span>{t('dragHint')}</span>
          </div>
        </div>

        <aside className="solar-system__panel" aria-label={t('controlsAria')}>
          <section className="solar-system__section">
            <h2 className="solar-system__section-title">
              <Gauge size={14} aria-hidden />
              {t('time.title')}
            </h2>
            <label className="solar-system__label" htmlFor="solar-epoch-range">
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
            <div className="solar-system__row">
              <button
                type="button"
                className="solar-system__btn solar-system__btn--primary"
                onClick={() => setPlaying((p) => !p)}
                aria-pressed={playing}
              >
                {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                {playing ? t('time.pause') : t('time.play')}
              </button>
              <button type="button" className="solar-system__btn" onClick={resetNow}>
                <RotateCcw size={16} aria-hidden />
                {t('time.now')}
              </button>
            </div>
            <div className="solar-system__speeds">
              {SPEED_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`solar-system__chip${i === speedIdx ? ' is-active' : ''}`}
                  onClick={() => setSpeedIdx(i)}
                >
                  {t(`time.speed.${s.id}`)}
                </button>
              ))}
            </div>
          </section>

          <section className="solar-system__section">
            <h2 className="solar-system__section-title">
              <Sparkles size={14} aria-hidden />
              {t('view.title')}
            </h2>
            <div className="solar-system__toggle-row">
              <span className="solar-system__label">{t('view.scale')}</span>
              <div className="solar-system__seg">
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
            </div>
            <label className="solar-system__check">
              <input
                type="checkbox"
                checked={includePluto}
                onChange={(e) => setIncludePluto(e.target.checked)}
              />
              {t('view.pluto')}
            </label>
          </section>

          <section className="solar-system__section solar-system__section--detail">
            <h2 className="solar-system__section-title">{t('detail.title')}</h2>
            {selectedId ? (
              <div className="solar-system__detail">
                <p className="solar-system__detail-name">{bodyCopy[selectedId].name}</p>
                <p className="solar-system__detail-blurb">{bodyCopy[selectedId].blurb}</p>
                <dl className="solar-system__dl">
                  <div>
                    <dt>{t('detail.meanRadius')}</dt>
                    <dd>{radiusLabel(selectedId)}</dd>
                  </div>
                </dl>
                <button type="button" className="solar-system__linkish" onClick={() => setSelectedId(null)}>
                  {t('detail.clear')}
                </button>
              </div>
            ) : (
              <p className="solar-system__placeholder">{t('detail.placeholder')}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
