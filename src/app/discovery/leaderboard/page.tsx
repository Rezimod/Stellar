import type { Metadata } from 'next';
import LeaderboardLocked from '@/components/discovery/LeaderboardLocked';
import LeaderboardTabs from '@/components/discovery/LeaderboardTabs';
import Starfield from '@/components/discovery/Starfield';
import { REVEAL_AT_MS } from '@/lib/discovery/constants';

export const metadata: Metadata = {
  title: 'Discovery Leaderboard — Stellarr',
  description:
    'The rarest objects found and the largest collections held. Cosmic Discovery Passes reveal on 21 October 2026, at the peak of the Orionids.',
  alternates: { canonical: '/discovery/leaderboard' },
};

export default async function DiscoveryLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.preview;
  // Without this the board is unreachable until 21 October 2026, so there would
  // be no way to review or demo it. Same escape hatch as /discovery/reveal.
  const preview = (Array.isArray(raw) ? raw[0] : raw) === '1';
  const revealed = preview || Date.now() >= REVEAL_AT_MS;

  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-8 sm:py-10">
        {preview && (
          <p
            className="mb-7 text-right"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--dsc-amber)',
              margin: '0 0 28px',
            }}
          >
            Preview &middot; mock data
          </p>
        )}

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
          Leaderboard
        </h1>

        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14.5,
            lineHeight: 1.6,
            color: 'var(--dsc-ghost)',
            maxWidth: 480,
            margin: '12px 0 0',
          }}
        >
          The rarest objects found, and the collections holding them.
        </p>

        <div className="mt-8">{revealed ? <LeaderboardTabs /> : <LeaderboardLocked />}</div>
      </div>
    </div>
  );
}
