import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { TARGET_PHOTOS } from '@/lib/sky/target-photos';
import { apparentDiameterArcsec, fieldOfView, resolvingPowerArcsec } from '@/lib/observatory/optics';
import type { Instrument } from '@/lib/observatory/types';

/**
 * The Moon, with this instrument's sensor drawn over it to scale.
 *
 * A spec sheet says 25.6′ × 14.5′ and means nothing to someone who has just
 * bought a telescope. A rectangle that plainly does not contain the Moon says
 * the same thing in one look — and Jupiter beside it, at its true size
 * tonight, says why a planet needs a Barlow. Every length here is computed
 * from the optics and the ephemeris for the moment the page rendered; nothing
 * is drawn for effect.
 */
export default function FieldPlate({
  instrument,
  at,
  variant = 'hero',
}: {
  instrument: Instrument;
  at: Date;
  variant?: 'hero' | 'full';
}) {
  const t = useTranslations('observatory.plate');
  const fov = fieldOfView(instrument);
  const moonArcmin = (apparentDiameterArcsec('moon', at) ?? 1860) / 60;
  const jupiterArcsec = apparentDiameterArcsec('jupiter', at) ?? 40;

  // The plate is a 100-unit square; the Moon is a disc of diameter 60 in it.
  const moon = 60;
  const sensorW = (fov.widthArcmin / moonArcmin) * moon;
  const sensorH = (fov.heightArcmin / moonArcmin) * moon;
  const jupiter = Math.max(0.6, (jupiterArcsec / 60 / moonArcmin) * moon);
  const photo = TARGET_PHOTOS.moon;

  return (
    <figure className={`obs-plate obs-plate--${variant}`} aria-label={t('aria')}>
      <div className="obs-plate__disc" style={{ width: `${moon}%`, height: `${moon}%` }}>
        <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 70vw, 34rem" priority />
      </div>

      <svg className="obs-plate__lines" viewBox="0 0 100 100" aria-hidden="true">
        {/* Orbit rings: one drawn, one turning. The instrument's own frame reference. */}
        <circle className="obs-plate__ring" cx="50" cy="50" r="36" />
        <circle className="obs-plate__ring obs-plate__ring--turning" cx="50" cy="50" r="42" />
        <g className="obs-plate__ticks">
          <line x1="50" y1="6" x2="50" y2="9" />
          <line x1="50" y1="91" x2="50" y2="94" />
          <line x1="6" y1="50" x2="9" y2="50" />
          <line x1="91" y1="50" x2="94" y2="50" />
        </g>

        {/* The sensor, centred on the disc. */}
        <rect
          className="obs-plate__sensor"
          x={50 - sensorW / 2}
          y={50 - sensorH / 2}
          width={sensorW}
          height={sensorH}
        />

        {/* Jupiter tonight, to the same scale. */}
        <circle className="obs-plate__jupiter" cx="86" cy="76" r={jupiter / 2} />
        <line className="obs-plate__leader" x1={86 + jupiter / 2 + 1} y1="76" x2="96" y2="76" />
      </svg>

      <figcaption className="obs-plate__notes">
        <span className="obs-plate__note obs-plate__note--sensor" style={{ top: `${50 - sensorH / 2}%` }}>
          <b>{fov.widthArcmin.toFixed(1)}′ × {fov.heightArcmin.toFixed(1)}′</b>
          {t('sensor')}
        </span>
        <span className="obs-plate__note obs-plate__note--moon">
          <b>{moonArcmin.toFixed(1)}′</b>
          {t('moon')}
        </span>
        <span className="obs-plate__note obs-plate__note--jupiter">
          <b>{jupiterArcsec.toFixed(0)}″</b>
          {t('jupiter')}
        </span>
        {variant === 'full' && (
          <span className="obs-plate__note obs-plate__note--optics">
            <b>{fov.plateScaleArcsecPx.toFixed(2)}″/px</b>
            {t('resolves', { arcsec: resolvingPowerArcsec(instrument).toFixed(2) })}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
