import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Backdrop from '@/components/discovery/Backdrop';
import CountdownTimer from '@/components/discovery/CountdownTimer';
import RevealedCard from '@/components/discovery/RevealedCard';
import SealedObject from '@/components/discovery/SealedObject';
import Starfield from '@/components/discovery/Starfield';
import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { parsePassId, type PassRef } from '@/lib/discovery/passId';
import { determineObject } from '@/lib/discovery/rarityEngine';
import { revealCardFromDraw } from '@/lib/discovery/revealCard';

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
      {/* The one discovery page a stranger lands on cold. It was the only one
          without a photograph behind it, which left the shared link the
          flattest surface in the funnel. */}
      <Backdrop src="/images/dso/m51.jpg" intensity={0.2} />
      <Starfield />

      <div className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-8 sm:py-10">
        {object ? (
          /* The same card the holder was handed at reveal, animation and all —
             a shared link should land on the artifact, not on a flat picture
             of it. Everything the card already states (name, instrument,
             reward, odds, coordinates) is deliberately absent below it. */
          <div className="mx-auto flex w-full max-w-[420px] flex-col">
            <RevealedCard object={revealCardFromDraw(object)} passNumber={ref.passNumber} />

            <div className="mt-8">
              <Detail label="Pass" value={`#${ref.passNumber}`} />
              <Detail label="Holder" value={shortWallet(ref.wallet)} />
            </div>

            <Cta />
          </div>
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
