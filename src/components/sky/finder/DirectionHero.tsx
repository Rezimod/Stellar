'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PlanetIcon } from './PlanetIcon';
import { fistsToKey, moonPhaseKey, type CompassDir } from '@/lib/sky/directions';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import type { SkyObject } from './types';

interface DirectionHeroProps {
  object: SkyObject;
}

function fmtHHmm(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

const PLANET_TAILS = new Set([
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
]);

export function DirectionHero({ object }: DirectionHeroProps) {
  const t = useTranslations('sky');
  const locale = useLocale();

  const compass = object.compassDirection as CompassDir;
  const fists = fistsToKey(object.fistsAboveHorizon);
  const setLabel = fmtHHmm(object.setTime);
  const riseLabel = fmtHHmm(object.riseTime);

  const directionText = t(`directions.compass.${compass}`);
  const fistsText = fists.values
    ? t(`directions.fists.${fists.key}`, fists.values)
    : t(`directions.fists.${fists.key}`);

  // Tail copy: planets/sun/moon have hand-written hints; catalog targets fall
  // back to a per-type generic line.
  let tail: string;
  if (object.id === 'moon') {
    const phaseText = t(`moonPhase.${moonPhaseKey(object.phase ?? 0.5)}`);
    tail = t('hero.tail.moon', { phase: phaseText });
  } else if (PLANET_TAILS.has(object.id)) {
    tail = t(`hero.tail.${object.id}`);
  } else if (object.constellation) {
    tail = t(`hero.tailType.${object.type}WithConstellation`, { constellation: object.constellation });
  } else {
    tail = t(`hero.tailType.${object.type}`);
  }

  const equipLabel =
    object.instrument === 'binoculars' ? t('hero.binoculars')
    : object.instrument === 'telescope' ? t('hero.telescope')
    : t('hero.nakedEye');

  const difficultyLabel = t(`hero.difficulty.${object.difficulty}`);

  const statusLine = object.visible
    ? `${t('hero.visibleNow')} · ${equipLabel} · ${t('hero.magnitude')} ${object.magnitude.toFixed(1)}`
    : object.circumpolar
      ? `${t('hero.circumpolar')} · ${equipLabel} · ${t('hero.magnitude')} ${object.magnitude.toFixed(1)}`
      : riseLabel
        ? `${t('hero.belowHorizon')} · ${t('hero.rises')} ${riseLabel}`
        : t('hero.belowHorizon');

  const bottomMeta = object.visible
    ? [
        `${t('hero.bearing')} ${Math.round(object.azimuth)}° · ${compass}`,
        `${t('hero.altitude')} ${Math.round(object.altitude)}°`,
        setLabel ? `${t('hero.setsAt')} ${setLabel}` : t('hero.staysUpAllNight'),
      ]
    : [
        `${t('hero.bearing')} ${Math.round(object.azimuth)}° · ${compass}`,
        riseLabel ? `${t('hero.rises')} ${riseLabel}` : t('hero.staysUpAllNight'),
      ];

  return (
    <div className="finder-hero">
      <div className="finder-hero__top">
        <div className="finder-hero__planet">
          <TargetPortrait object={object} />
        </div>
        <div className="finder-hero__head">
          <div className="finder-hero__tags">
            <span className={`finder-hero__tag finder-hero__tag--${object.difficulty}`}>{difficultyLabel}</span>
            <span className="finder-hero__tag finder-hero__tag--type">{t(`hero.type.${object.type}`)}</span>
            {object.constellation && (
              <span className="finder-hero__tag finder-hero__tag--constellation">{object.constellation}</span>
            )}
          </div>
          <h2 className="finder-hero__name" lang={locale}>
            {object.name}
          </h2>
          <div className="finder-hero__status">{statusLine}</div>
        </div>
      </div>

      {object.visible ? (
        <p className="finder-hero__sentence" lang={locale}>
          {t('hero.face')}{' '}
          <span className="finder-hero__direction">{directionText}</span>
          {t('hero.thenLook')}{' '}
          <span className="finder-hero__fists">{fistsText}</span>{' '}
          {t('hero.aboveHorizon')}
          {' '}
          <span className="finder-hero__tail">{tail}</span>
        </p>
      ) : (
        <p className="finder-hero__sentence" lang={locale}>
          {object.name}{' '}
          {t('hero.belowSentenceA')}{' '}
          <span className="finder-hero__direction">{directionText}</span>
          {riseLabel ? (
            <>
              {' '}
              {t('hero.belowSentenceB')}{' '}
              <span className="finder-hero__fists">{riseLabel}</span>
              {'.'}
            </>
          ) : (
            '.'
          )}
        </p>
      )}

      <div className="finder-hero__meta">
        {bottomMeta.map((m, i) => (
          <span key={i} className="finder-hero__meta-item">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Hero portrait: prefer a real reference photo for the active target; fall
 * back to the synthesised PlanetIcon glyph for stars and on image error.
 */
function TargetPortrait({ object }: { object: SkyObject }) {
  const photo = getTargetPhoto(object.id);
  const [errored, setErrored] = useState(false);
  const showGlyph = !photo || errored;

  if (showGlyph) {
    return (
      <PlanetIcon
        id={object.id}
        type={object.type}
        magnitude={object.magnitude}
        size={88}
        phase={object.phase}
      />
    );
  }

  return (
    <figure className="finder-hero__portrait">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
      />
      <figcaption className="finder-hero__portrait-credit">{photo.credit}</figcaption>
    </figure>
  );
}
