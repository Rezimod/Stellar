import Image from 'next/image';
import { PASS_ART } from '@/lib/discovery/passArt';
import { formatTierValueUSD } from '@/lib/discovery/passValue';
import { TIER_BY_ID, rewardLine, type TierId } from '@/lib/discovery/tiers';

/**
 * One pass, as a collectible card.
 *
 * The five are deliberately different objects, not one template in five
 * colours — that was the flaw in the previous version. Each tier gets its own
 * `data-art` architecture:
 *
 *   plate    (common)     a small circular aperture in a wide black field
 *   window   (uncommon)   a rounded window across the upper two thirds
 *   aperture (rare)       a circular port with instrument ticks and an orbit
 *   bleed    (epic)       full-bleed photograph under a scrim
 *   framed   (legendary)  full bleed, gold inner frame, moving foil
 *
 * Restraint escalates with rarity. Common is mostly empty black on purpose; if
 * it were pretty there would be nowhere for Legendary to go.
 */

const ART_STYLE: Record<TierId, 'plate' | 'window' | 'aperture' | 'bleed' | 'framed'> = {
  common: 'plate',
  uncommon: 'window',
  rare: 'aperture',
  epic: 'bleed',
  legendary: 'framed',
};

export default function PassCard({ id, index }: { id: TierId; index: number }) {
  const tier = TIER_BY_ID[id];
  const art = PASS_ART[id];
  const style = ART_STYLE[id];
  const bleed = style === 'bleed' || style === 'framed';

  const photo = (
    <Image
      src={art.src}
      alt={`${art.objectName}, imaged by ${art.instrument}`}
      fill
      sizes="(max-width: 720px) 45vw, 20vw"
      className="dsc-pass-photo"
      style={{
        objectPosition: `${art.focus.x}% ${art.focus.y}%`,
        transform: `scale(${art.scale})`,
      }}
    />
  );

  return (
    <article
      className="dsc-pass"
      data-tier={id}
      data-art={style}
      style={{ '--dsc-tier': tier.color } as React.CSSProperties}
    >
      {/* Full-bleed tiers put the photograph behind everything; the contained
          tiers frame it inside the stage instead. */}
      {bleed && (
        <div className="dsc-pass-bleed" aria-hidden={false}>
          {photo}
          <span className="dsc-pass-scrim" aria-hidden="true" />
        </div>
      )}

      <header className="dsc-pass-head">
        <h3 className="dsc-pass-tier">{tier.name}</h3>
        <span className="dsc-pass-serial">{String(index + 1).padStart(2, '0')} / 05</span>
      </header>

      {!bleed && (
        <div className="dsc-pass-stage">
          {style === 'aperture' && (
            <>
              <span className="dsc-pass-orbit" aria-hidden="true" />
              <span className="dsc-pass-ticks" aria-hidden="true" />
            </>
          )}
          <div className="dsc-pass-frame">{photo}</div>
        </div>
      )}

      <div className="dsc-pass-foot">
        <p className="dsc-pass-example">
          {art.objectName}
          <span className="dsc-pass-instrument"> · {art.instrument}</span>
        </p>

        <span className="dsc-pass-value">
          <b>{formatTierValueUSD(id)}</b>
        </span>

        <p className="dsc-pass-reward">{rewardLine(id)}</p>

        <div className="dsc-pass-odds">
          <span>{tier.odds}% odds</span>
          <span>{tier.count.toLocaleString('en-US')} / 10,000</span>
        </div>
      </div>
    </article>
  );
}
