import type { Metadata } from 'next';
import LegendaryExport from '@/components/discovery/LegendaryExport';
import Starfield from '@/components/discovery/Starfield';
import { PASS_PRICE_SOL, TOTAL_PASSES } from '@/lib/discovery/constants';
import { MOCK_FINDS } from '@/lib/discovery/mockLeaderboard';
import { TIERS_BY_VALUE, rewardLine, type TierId } from '@/lib/discovery/tiers';

/**
 * Ops dashboard for the reveal.
 *
 * MOCK. Nothing here is read from chain — no pass has been minted and there is
 * no indexer yet. The numbers below are placeholders with the shape the real
 * ones will have, which is why every figure is derived from the sale constants
 * rather than typed in by hand: when this is wired up, only MINTED changes.
 *
 * NOTE: there is no auth on this route. It is noindex and unlinked, but that
 * is obscurity, not protection — anyone with the URL can open it. It holds no
 * secrets today; it must be gated before it reads real holder data.
 */

export const metadata: Metadata = {
  title: 'Discovery Ops — Stellarr',
  robots: { index: false, follow: false },
};

/** Mock: passes claimed so far. */
const MINTED = 847;

/**
 * Expected tier counts at `minted` passes.
 *
 * Largest remainder, so the column always sums to exactly `minted` — a
 * breakdown that does not add up is worse than no breakdown.
 */
function expectedCounts(minted: number): { id: TierId; name: string; count: number }[] {
  const exact = TIERS_BY_VALUE.map((tier) => ({
    id: tier.id,
    name: tier.name,
    exact: (minted * tier.odds) / 100,
  }));

  const rows = exact.map((row) => ({ ...row, count: Math.floor(row.exact) }));
  let remaining = minted - rows.reduce((sum, row) => sum + row.count, 0);

  // Hand the leftovers to the largest fractional parts first.
  const byRemainder = [...rows].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (const row of byRemainder) {
    if (remaining <= 0) break;
    row.count += 1;
    remaining -= 1;
  }

  return rows.map(({ id, name, count }) => ({ id, name, count }));
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="dsc-glass flex flex-col gap-1.5 p-5">
      <span className="dsc-detail-label">{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: 'var(--dsc-text)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11.5,
          color: 'var(--dsc-ghost-dim)',
        }}
      >
        {note}
      </span>
    </div>
  );
}

export default function DiscoveryAdminPage() {
  const raised = MINTED * PASS_PRICE_SOL;
  const counts = expectedCounts(MINTED);
  const legendaryHolders = MOCK_FINDS.filter((find) => find.tier === 'legendary');

  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            Discovery Ops
          </h1>
          <span className="dsc-badge dsc-badge--demo">Mock data</span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--dsc-ghost)',
            maxWidth: 520,
            margin: '12px 0 0',
          }}
        >
          No pass has been minted and there is no indexer yet, so every figure below is a
          placeholder. Not authenticated — do not link this page.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat
            label="Passes minted"
            value={MINTED.toLocaleString('en-US')}
            note={`of ${TOTAL_PASSES.toLocaleString('en-US')} · ${((MINTED / TOTAL_PASSES) * 100).toFixed(1)}% claimed`}
          />
          <Stat
            label="SOL raised"
            value={`${raised.toLocaleString('en-US', { minimumFractionDigits: 1 })} SOL`}
            note={`${MINTED.toLocaleString('en-US')} × ${PASS_PRICE_SOL} SOL`}
          />
        </div>

        <h2
          className="mt-10"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--dsc-ghost-dim)',
            margin: '40px 0 0',
          }}
        >
          Expected at reveal
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--dsc-ghost-dim)',
            maxWidth: 520,
            margin: '8px 0 0',
          }}
        >
          Rarity is not assigned until the draw, so these are the counts the published odds imply
          for {MINTED.toLocaleString('en-US')} passes — not results.
        </p>

        <div className="mt-4">
          {counts.map((row) => (
            <div key={row.id} className="dsc-detail-row">
              <span className="dsc-detail-label">{row.name}</span>
              <span className="dsc-detail-value">
                {row.count.toLocaleString('en-US')} · {rewardLine(row.id)}
              </span>
            </div>
          ))}
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--dsc-ghost-dim)',
            margin: '40px 0 0',
          }}
        >
          Physical fulfilment
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--dsc-ghost-dim)',
            maxWidth: 520,
            margin: '8px 0 16px',
          }}
        >
          Wallets owed a telescope, for the shipping list.
        </p>

        <LegendaryExport holders={legendaryHolders} reward={rewardLine('legendary')} />
      </div>
    </div>
  );
}
