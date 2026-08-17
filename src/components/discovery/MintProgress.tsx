import { TOTAL_PASSES } from '@/lib/discovery/constants';

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Claim progress. `claimed` is 0 until the mint is wired to chain state — the
 * bar renders an honest empty track rather than a decorative partial fill.
 */
export default function MintProgress({ claimed = 0 }: { claimed?: number }) {
  const pct = Math.min(100, (claimed / TOTAL_PASSES) * 100);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--dsc-ghost)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt(claimed)} / {fmt(TOTAL_PASSES)} passes claimed
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--dsc-ghost-dim)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>

      <div
        className="dsc-progress-track"
        role="progressbar"
        aria-label="Passes claimed"
        aria-valuenow={claimed}
        aria-valuemin={0}
        aria-valuemax={TOTAL_PASSES}
      >
        <div className="dsc-progress-fill" style={{ '--dsc-pct': `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}
