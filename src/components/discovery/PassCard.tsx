import { formatTierValueUSD } from '@/lib/discovery/passValue';
import { OBJECT_POOLS, generateVisualGradient, type Rarity } from '@/lib/discovery/rarityEngine';
import { TIER_BY_ID, rewardLine, type TierId } from '@/lib/discovery/tiers';

/**
 * One of the five passes, as a collectible card.
 *
 * Three things are on it that were not on the old tier row, and each answers
 * "what do I actually get":
 *
 *   1. A real object from that tier's pool, named. Not "Rare" in the abstract —
 *      Kepler-452b. The pools are the same ones the draw reads from, so the
 *      example is genuinely obtainable at that tier.
 *   2. That object's actual generated artwork, from the same function the
 *      reveal and the share card use. The picture on the pass is the picture
 *      you would get.
 *   3. A money figure, derived from the tier's STRLLR at the catalogue rate.
 *
 * `data-tier` drives the escalation in discovery.css — glow, ring, foil, and
 * finally movement — so the visual difference between tiers is structural
 * rather than five colours of the same card.
 */

const RARITY_OF: Record<TierId, Rarity> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

/** Rings appear from Rare up: one, then two. */
const RINGS: Record<TierId, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 1,
  legendary: 2,
};

/**
 * Fixed seeds, one per tier. The artwork has to be stable — a card that
 * reshuffles its own picture between renders is not a collectible — and these
 * were picked so the five sit next to each other without two reading as the
 * same hue.
 */
const SEED: Record<TierId, number> = {
  common: 1_802_411_733,
  uncommon: 733_115_902,
  rare: 2_411_907_558,
  epic: 3_190_442_017,
  legendary: 4_120_608_756,
};

export default function PassCard({ id, index }: { id: TierId; index: number }) {
  const tier = TIER_BY_ID[id];
  const rarity = RARITY_OF[id];
  const pool = OBJECT_POOLS[rarity];
  const example = pool[SEED[id] % pool.length];
  const rings = RINGS[id];

  return (
    <article
      className="dsc-pass"
      data-tier={id}
      style={{ '--dsc-tier': tier.color } as React.CSSProperties}
    >
      <header className="dsc-pass-head">
        <h3 className="dsc-pass-tier">{tier.name}</h3>
        <span className="dsc-pass-serial">
          {String(index + 1).padStart(2, '0')} / 05
        </span>
      </header>

      <div className="dsc-pass-stage">
        {rings > 1 && <span className="dsc-pass-ring dsc-pass-ring--outer" aria-hidden="true" />}
        {rings > 0 && <span className="dsc-pass-ring dsc-pass-ring--inner" aria-hidden="true" />}
        <div
          className="dsc-pass-orb"
          role="img"
          aria-label={`${tier.name} example: ${example.name}`}
          style={{ background: generateVisualGradient(SEED[id], rarity) }}
        />
      </div>

      <p className="dsc-pass-example">e.g. {example.name}</p>

      <div className="dsc-pass-foot">
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
