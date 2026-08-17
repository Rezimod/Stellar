import ObjectVisual from '@/components/discovery/ObjectVisual';
import { OBJECT_TYPE_LABEL, type RevealedObject } from '@/lib/discovery/mockReveal';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

const fmt = (n: number) => n.toLocaleString('en-US');

/** "Full Astroman Telescope + 50,000 STRLLR" */
export function rewardLine(tier: RevealedObject['tier']): string {
  const t = TIER_BY_ID[tier];
  return t.physical ? `${t.physical} + ${fmt(t.strllr)} STRLLR` : `${fmt(t.strllr)} STRLLR`;
}

export default function RevealedCard({ object }: { object: RevealedObject }) {
  const tier = TIER_BY_ID[object.tier];

  return (
    <div
      className="dsc-glass w-full max-w-[420px] p-5"
      style={{ '--dsc-tier': tier.color } as React.CSSProperties}
    >
      <ObjectVisual object={object} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="dsc-badge dsc-badge--type">{OBJECT_TYPE_LABEL[object.type]}</span>
        <span
          className={
            object.tier === 'legendary'
              ? 'dsc-badge dsc-badge--rarity dsc-badge--legendary'
              : 'dsc-badge dsc-badge--rarity'
          }
        >
          {tier.name}
        </span>
      </div>

      <h1
        className="mt-3 text-[22px] sm:text-[26px]"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          lineHeight: 1.18,
          letterSpacing: '-0.02em',
          color: 'var(--dsc-text)',
          margin: '12px 0 0',
        }}
      >
        {object.catalog} &middot; {object.name}
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.04em',
          color: 'var(--dsc-ghost-dim)',
          marginTop: 7,
        }}
      >
        {object.constellation} &middot; {fmt(object.distanceLy)} light years
      </p>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--dsc-ghost)',
          marginTop: 12,
        }}
      >
        {object.blurb}
      </p>

      <div className="dsc-prize mt-5">
        <span className="dsc-prize-label">You won</span>
        <p className="dsc-prize-value">{rewardLine(object.tier)}</p>
      </div>
    </div>
  );
}
