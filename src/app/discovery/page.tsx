import CountdownTimer from '@/components/discovery/CountdownTimer';
import EmailCapture from '@/components/discovery/EmailCapture';
import SealedObject from '@/components/discovery/SealedObject';
import Starfield from '@/components/discovery/Starfield';
import { PASS_PRICE_SOL, REVEAL_AT_MS, TOTAL_PASSES } from '@/lib/discovery/constants';

/**
 * Phase 1 — the dark teaser. One screen, one object, one date.
 *
 * Server component: only the countdown and the email field need to be client
 * components, so the rest of the page ships as static markup.
 */
export default function DiscoveryPage() {
  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 flex min-h-dvh flex-col items-center px-5 py-8 sm:py-10">
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: 'var(--dsc-cyan)',
            margin: 0,
          }}
        >
          Stellarr
        </p>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-12 sm:gap-8">
          <SealedObject />

          <div className="flex flex-col items-center gap-3.5">
            <h1
              className="text-center text-[24px] sm:text-[32px]"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                color: 'var(--dsc-text)',
                lineHeight: 1.18,
                // Set caps per spec. Uppercase needs neutral-to-open tracking —
                // the negative values that suit lowercase headlines jam it up.
                textTransform: 'uppercase',
                letterSpacing: '0.015em',
                margin: 0,
                maxWidth: 520,
              }}
            >
              The universe is being revealed
            </h1>

            <p
              className="text-center"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--dsc-ghost)',
                maxWidth: 480,
                margin: 0,
              }}
            >
              {TOTAL_PASSES.toLocaleString('en-US')} cosmic objects. One reveal date. Some are
              worth a telescope.
            </p>
          </div>

          <CountdownTimer targetMs={REVEAL_AT_MS} />

          <EmailCapture />
        </div>

        <p
          className="text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10.5,
            letterSpacing: '0.04em',
            color: 'var(--dsc-ghost-dim)',
            margin: 0,
          }}
        >
          {TOTAL_PASSES.toLocaleString('en-US')} passes &middot; {PASS_PRICE_SOL} SOL each &middot;
          Reveal: Oct 21 &middot; stellarr.club
        </p>
      </div>
    </div>
  );
}
