import Link from 'next/link';
import ShareCard, { SHARE_CARD_WIDTH } from '@/components/discovery/ShareCard';
import ShareCardFrame from '@/components/discovery/ShareCardFrame';
import { DEMO_PASS, DEMO_WALLET } from '@/lib/discovery/demo';
import { passIdFor } from '@/lib/discovery/passId';
import {
  OBJECT_TYPE_LABEL,
  RARITY_TO_TIER,
  determineObject,
} from '@/lib/discovery/rarityEngine';
import { TIER_BY_ID, rewardLine } from '@/lib/discovery/tiers';

/**
 * The demo reveal: the legendary outcome, rendered from the real rarity engine
 * rather than a fixture.
 *
 * Server component on purpose. It is handed to <RevealSequence> as children,
 * so the animation stays a client concern while the 110-object catalogue in
 * rarityEngine never reaches the browser bundle.
 */
export default function DemoReveal() {
  const object = determineObject(DEMO_WALLET, DEMO_PASS);
  const tier = TIER_BY_ID[RARITY_TO_TIER[object.rarity]];
  const passId = passIdFor(DEMO_WALLET, DEMO_PASS);

  const shareText =
    `I just discovered ${object.name} on @stellarr_club. ` +
    `It's ${object.rarity}. See you on Oct 21. stellarr.club/discovery`;

  return (
    <div
      className="flex w-full flex-col items-center gap-5"
      style={{ '--dsc-tier': object.rarityColor } as React.CSSProperties}
    >
      <ShareCardFrame cardWidth={SHARE_CARD_WIDTH}>
        <ShareCard object={object} passNumber={DEMO_PASS} />
      </ShareCardFrame>

      <div className="flex w-full flex-col items-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dsc-badge dsc-badge--type">{OBJECT_TYPE_LABEL[object.type]}</span>
          <span className="dsc-badge dsc-badge--rarity dsc-badge--legendary">{tier.name}</span>
        </div>

        <h2
          className="text-[26px] sm:text-[32px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            color: 'var(--dsc-text)',
            margin: 0,
          }}
        >
          {object.name}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--dsc-ghost)',
            margin: 0,
          }}
        >
          {object.description}
        </p>

        <div className="dsc-prize mt-2 w-full">
          <span className="dsc-prize-label">You won</span>
          <p className="dsc-prize-value">{rewardLine(RARITY_TO_TIER[object.rarity])}</p>
        </div>
      </div>

      <div className="flex w-full max-w-[420px] flex-col gap-3">
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="dsc-cta flex items-center justify-center"
          style={{ textDecoration: 'none' }}
        >
          Share Your Discovery
        </a>

        <Link
          href={`/discovery/${passId}`}
          className="dsc-cta dsc-cta--ghost flex items-center justify-center"
          style={{ textDecoration: 'none' }}
        >
          View the Public Page
        </Link>
      </div>
    </div>
  );
}
