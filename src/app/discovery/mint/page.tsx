import type { Metadata } from 'next';
import Backdrop from '@/components/discovery/Backdrop';
import MintActions from '@/components/discovery/MintActions';
import MintCard from '@/components/discovery/MintCard';
import MintProgress from '@/components/discovery/MintProgress';
import MintTierList from '@/components/discovery/MintTierList';
import PassGallery from '@/components/discovery/PassGallery';
import Starfield from '@/components/discovery/Starfield';
import { PASS_PRICE_SOL } from '@/lib/discovery/constants';

export const metadata: Metadata = {
  title: 'Mint a Cosmic Discovery Pass — Stellarr',
  description:
    'Claim a Cosmic Discovery Pass for 0.5 SOL. Every pass reveals a celestial object on 21 October 2026, at the peak of the Orionids.',
  alternates: { canonical: '/discovery/mint' },
};

export default function MintPage() {
  return (
    <div className="dsc-root">
      <Backdrop src="/images/dso/m17-omega.jpg" intensity={0.18} />
      <Starfield />

      <div className="relative z-10 mx-auto w-full max-w-[1080px] px-5 py-8 sm:py-10">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[400px_1fr] lg:gap-14">
          {/* ── Left: the pack, on an empty stage ── */}
          <div className="flex justify-center lg:sticky lg:top-10">
            <MintCard />
          </div>

          {/* ── Right: the offer ── */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3.5">
              <h1
                className="text-[26px] sm:text-[34px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  lineHeight: 1.14,
                  letterSpacing: '-0.02em',
                  color: 'var(--dsc-text)',
                  margin: 0,
                }}
              >
                Discover Your Piece of the Universe
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--dsc-ghost)',
                  maxWidth: 520,
                  margin: 0,
                }}
              >
                On October 21 &mdash; Orionids peak &mdash; your pass reveals a celestial object.
                Legendary holders receive a real Astroman telescope, shipped anywhere. Yours to own,
                forever on Solana.
              </p>
            </div>

            <MintProgress claimed={0} />

            <div className="flex flex-col gap-4">
              <div className="flex items-baseline gap-2.5">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 28,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: 'var(--dsc-text)',
                  }}
                >
                  {PASS_PRICE_SOL} SOL
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--dsc-ghost-dim)',
                  }}
                >
                  per pass
                </span>
              </div>

              <MintActions />
            </div>

            <div className="max-w-[420px]">
              <MintTierList />
            </div>

            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.6,
                color: 'var(--dsc-ghost-dim)',
                maxWidth: 480,
                margin: 0,
              }}
            >
              Reveal date is fixed and cannot change. Physical rewards shipped within 30 days of
              reveal.
            </p>
          </div>
        </div>

        {/* Full width, not inside the right column: five cards at column width
            clip their own value and reward lines. */}
        <div className="mt-14 flex flex-col gap-4">
          {/* Body face, not the display one. The display face is spent on the
              three things that earn it — a tier name, the pack front, and a
              page hero — and a section label is none of them. */}
          <h2
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--dsc-ghost)',
              margin: 0,
            }}
          >
            What a pass can reveal
          </h2>
          <PassGallery />
        </div>
      </div>
    </div>
  );
}
