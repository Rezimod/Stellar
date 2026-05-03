'use client';

import { useTranslations, useLocale } from 'next-intl';
import { PlanetIcon } from './PlanetIcon';
import { fistsToKey, moonPhaseKey, type CompassDir } from '@/lib/sky/directions';
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

function equipmentClass(mag: number): 'nakedEye' | 'binoculars' | 'telescope' {
  if (mag <= 6) return 'nakedEye';
  if (mag <= 10) return 'binoculars';
  return 'telescope';
}

export function DirectionHero({ object }: DirectionHeroProps) {
  const t = useTranslations('sky');
  const locale = useLocale();

  const compass = object.compassDirection as CompassDir;
  const fists = fistsToKey(object.fistsAboveHorizon);
  const equip = equipmentClass(object.magnitude);
  const setLabel = fmtHHmm(object.setTime);
  const riseLabel = fmtHHmm(object.riseTime);

  const directionText = t(`directions.compass.${compass}`);
  const fistsText = fists.values
    ? t(`directions.fists.${fists.key}`, fists.values)
    : t(`directions.fists.${fists.key}`);

  const phaseText = object.id === 'moon' ? t(`moonPhase.${moonPhaseKey(object.phase ?? 0.5)}`) : '';
  const tail =
    object.id === 'moon'
      ? t('hero.tail.moon', { phase: phaseText })
      : t(`hero.tail.${object.id}`);

  const equipLabel =
    equip === 'nakedEye' ? t('hero.nakedEye') : equip === 'binoculars' ? t('hero.binoculars') : t('hero.telescope');

  const statusLine = object.visible
    ? `${t('hero.visibleNow')} · ${equipLabel} · ${t('hero.magnitude')} ${object.magnitude.toFixed(1)}`
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
          <PlanetIcon id={object.id} size={88} phase={object.phase} />
        </div>
        <div className="finder-hero__head">
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
