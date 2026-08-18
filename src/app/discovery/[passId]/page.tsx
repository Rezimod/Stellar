import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CountdownTimer from '@/components/discovery/CountdownTimer';
import SealedObject from '@/components/discovery/SealedObject';
import ShareCard, { SHARE_CARD_WIDTH } from '@/components/discovery/ShareCard';
import ShareCardFrame from '@/components/discovery/ShareCardFrame';
import Starfield from '@/components/discovery/Starfield';
import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { parsePassId, type PassRef } from '@/lib/discovery/passId';
import { OBJECT_TYPE_LABEL, RARITY_TO_TIER, determineObject } from '@/lib/discovery/rarityEngine';
import { TIER_BY_ID, rewardLine } from '@/lib/discovery/tiers';

/**
 * The public page for one pass — what a shared link on X resolves to.
 *
 * There is no lookup: the pass id carries the wallet and the pass number, and
 * the draw is derived from that pair, so this page is a pure function of its
 * URL.
 *
 * Before REVEAL_AT_MS it deliberately shows the sealed state and nothing else.
 * The draw is deterministic and this page is public, so resolving it early
 * would hand every outcome to anyone who could guess a URL — the same reason
 * /api/discovery/share-card refuses to draw before reveal. See the security
 * note at the top of rarityEngine.ts.
 */

// Pre-reveal the page flips to the revealed state on a clock, so it must not
// sit in the full route cache indefinitely. After reveal the content is fixed.
export const revalidate = 300;

/** 4…4, matching how the app truncates addresses everywhere else. */
const shortWallet = (wallet: string) => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

type Params = { params: Promise<{ passId: string }> };

function shareCardUrl({ wallet, passNumber }: PassRef): string {
  return `/api/discovery/share-card?wallet=${wallet}&pass=${passNumber}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { passId } = await params;
  const ref = parsePassId(passId);
  if (!ref) return { title: 'Discovery Not Found — Stellarr' };

  const revealed = Date.now() >= REVEAL_AT_MS;
  const object = revealed ? determineObject(ref.wallet, ref.passNumber) : null;

  const title = object
    ? `${object.name} — a ${object.rarity.toLowerCase()} discovery on Stellarr`
    : `Pass #${ref.passNumber} — Sealed until October 21`;
  const description = object
    ? `${object.description} Discovered with Cosmic Discovery Pass #${ref.passNumber}.`
    : '10,000 cosmic objects. Some are worth a real telescope. Reveal: Oct 21, 2026.';
  const image = shareCardUrl(ref);

  return {
    title,
    description,
    alternates: { canonical: `/discovery/${passId}` },
    openGraph: {
      title,
      description,
      url: `https://stellarr.club/discovery/${passId}`,
      siteName: 'Stellar',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="dsc-detail-row">
      <span className="dsc-detail-label">{label}</span>
      <span className="dsc-detail-value">{value}</span>
    </div>
  );
}

function Cta() {
  return (
    <div className="mt-9 flex flex-col items-start gap-3">
      <Link
        href="/discovery/mint"
        className="dsc-cta flex max-w-[360px] items-center justify-center"
        style={{ textDecoration: 'none' }}
      >
        Get Your Own Discovery Pass
      </Link>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11.5,
          lineHeight: 1.55,
          color: 'var(--dsc-ghost-dim)',
          maxWidth: 360,
          margin: 0,
        }}
      >
        Every pass reveals a celestial object on October 21, 2026 — the peak of the Orionids.
      </p>
    </div>
  );
}

export default async function DiscoveryPassPage({ params }: Params) {
  const { passId } = await params;
  const ref = parsePassId(passId);
  if (!ref) notFound();

  const revealed = Date.now() >= REVEAL_AT_MS;
  const object = revealed ? determineObject(ref.wallet, ref.passNumber) : null;

  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-8 sm:py-10">
        {object ? (
          <>
            <ShareCardFrame cardWidth={SHARE_CARD_WIDTH}>
              <ShareCard object={object} />
            </ShareCardFrame>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="dsc-badge dsc-badge--type">{OBJECT_TYPE_LABEL[object.type]}</span>
              <span
                className={
                  object.rarity === 'LEGENDARY'
                    ? 'dsc-badge dsc-badge--rarity dsc-badge--legendary'
                    : 'dsc-badge dsc-badge--rarity'
                }
                style={{ '--dsc-tier': object.rarityColor } as React.CSSProperties}
              >
                {TIER_BY_ID[RARITY_TO_TIER[object.rarity]].name}
              </span>
            </div>

            <h1
              className="text-[28px] sm:text-[38px]"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                color: 'var(--dsc-text)',
                margin: '14px 0 0',
              }}
            >
              {object.name}
            </h1>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--dsc-ghost)',
                maxWidth: 560,
                margin: '14px 0 0',
              }}
            >
              {object.description}
            </p>

            <div className="mt-8">
              <Detail label="Pass" value={`#${ref.passNumber}`} />
              <Detail label="Holder" value={shortWallet(ref.wallet)} />
              <Detail
                label="Coordinates"
                value={`${object.coordinates.ra} / ${object.coordinates.dec}`}
              />
              <Detail label="Reward" value={rewardLine(RARITY_TO_TIER[object.rarity])} />
            </div>

            <Cta />
          </>
        ) : (
          <div className="flex flex-col items-center gap-7 py-6 text-center">
            <SealedObject size={220} />

            <div className="flex flex-col items-center gap-3">
              <h1
                className="text-[26px] sm:text-[32px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  lineHeight: 1.14,
                  letterSpacing: '-0.02em',
                  color: 'var(--dsc-text)',
                  margin: 0,
                }}
              >
                Pass #{ref.passNumber} is sealed
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--dsc-ghost)',
                  maxWidth: 420,
                  margin: 0,
                }}
              >
                Held by {shortWallet(ref.wallet)}. Nobody knows what is inside — not the holder,
                not us — until every pass opens at once on October 21, 2026.
              </p>
            </div>

            <CountdownTimer targetMs={REVEAL_AT_MS} />

            <div className="w-full max-w-[360px] text-left">
              <Cta />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
