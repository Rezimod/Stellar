import Image from 'next/image';
import { formatTierValueUSD } from '@/lib/discovery/passValue';
import type { RevealCard } from '@/lib/discovery/revealCard';
import { TIER_BY_ID, rewardLine } from '@/lib/discovery/tiers';

/**
 * The card you are left holding once a pass opens.
 *
 * It is the pass card — same material, same bevel and contact shadow, same
 * four blocks in the same order (rail, plate, specimen label, value block) —
 * at 420px instead of 208px. That is the entire point: the artifact that lands
 * at the end of the reveal has to be the object you were comparing in the
 * gallery, not a different card showing the same result. Geometry lives in
 * `.dsc-pass--lg`; everything else is shared with <PassCard>.
 *
 * On LEGENDARY the card also carries a one-shot gold sweep (`.dsc-reveal-flash`)
 * that crosses the face once as it lands and then hands off to the same slow
 * specular loop every other tier runs.
 *
 * The prose below the card is deliberately outside it. A slab has a placard,
 * not a paragraph.
 */
export default function RevealedCard({
  object,
  passNumber,
}: {
  object: RevealCard;
  /** Shown in the rail where a gallery card shows its position in the set. */
  passNumber: number;
}) {
  const tier = TIER_BY_ID[object.tier];

  return (
    <div className="flex w-full max-w-[420px] flex-col items-stretch gap-5">
      <div className="dsc-pass-tilt">
        <article
          className="dsc-pass dsc-pass--lg dsc-mat"
          data-tier={object.tier}
          style={{ '--dsc-tier': tier.color } as React.CSSProperties}
        >
          {/* Not a heading, unlike the gallery card's rail: the page's one h1
              is the object name below, and a tier label above it would put an
              h2 in front of the h1 in reading order. */}
          <header className="dsc-pass-rail">
            <p className="dsc-pass-tier">{tier.name}</p>
            <span className="dsc-pass-serial">{`Pass #${passNumber.toLocaleString('en-US')}`}</span>
          </header>

          <div className="dsc-pass-plate">
            {object.photo ? (
              <Image
                src={object.photo.src}
                alt={object.photo.alt}
                fill
                sizes="420px"
                className="dsc-pass-photo"
                style={{ transform: `scale(${object.photo.scale})` }}
                priority
              />
            ) : (
              <span
                className="dsc-pass-fallback"
                role="img"
                aria-label={`Rendering of ${object.name}`}
                style={{ background: object.fallback }}
              />
            )}
          </div>

          <div className="dsc-pass-label">
            <p className="dsc-pass-object">{object.name}</p>
            <p className="dsc-pass-instrument">{object.provenance}</p>
          </div>

          <div className="dsc-pass-values">
            <span className="dsc-pass-vlabel">You won</span>
            <p className="dsc-pass-value">{formatTierValueUSD(object.tier)}</p>
            <p className="dsc-pass-reward">{rewardLine(object.tier)}</p>
            <div className="dsc-pass-odds">
              <span>{tier.odds.toFixed(1)}% odds</span>
              <span>{tier.count.toLocaleString('en-US')} / 10,000</span>
            </div>
          </div>

          <span className="dsc-pass-sweep" aria-hidden="true" />
          {object.tier === 'legendary' && (
            <span className="dsc-reveal-flash" aria-hidden="true" />
          )}
        </article>
      </div>

      <div>
        <h1
          className="text-[22px] sm:text-[26px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            color: 'var(--dsc-text)',
            margin: 0,
          }}
        >
          {object.name}
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
            color: 'var(--dsc-ghost-dim)',
            margin: '7px 0 0',
          }}
        >
          {object.meta}
        </p>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--dsc-ghost)',
            margin: '12px 0 0',
          }}
        >
          {object.blurb}
        </p>
      </div>
    </div>
  );
}
