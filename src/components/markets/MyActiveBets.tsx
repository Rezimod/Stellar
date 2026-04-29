'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import type { PublicKey } from '@solana/web3.js';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import {
  useReadOnlyProgram,
  useStellarSigner,
} from '@/lib/markets/privy-adapter';
import {
  getAllMarkets,
  getConfig,
  getUserPositions,
  findMetadataByMarketId,
  invalidateMarketsCache,
  type MarketOnChain,
  type MarketSide,
  type Position,
} from '@/lib/markets';
import { displayTitle } from '@/lib/markets/display';
import InlineBetPanel from '@/components/markets/InlineBetPanel';

interface CashoutRecord {
  id: string;
  wallet: string;
  marketId: number;
  side: 'yes' | 'no';
  originalStake: number;
  refundedAmount: number;
  refundTx: string | null;
  createdAt: string;
}

interface ActiveRow {
  position: Position;
  market: MarketOnChain;
  title: string;
  cashout: CashoutRecord | null;
  locked: boolean;
}

interface Props {
  /** Compact view used on /markets + /profile. Limits to 3 rows + "see all" link. */
  variant?: 'compact' | 'full';
  /** Optional title override. */
  title?: string;
}

const REFUND_BPS = 7000;

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function MyActiveBets({ variant = 'compact', title }: Props) {
  const { authenticated } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const program = useReadOnlyProgram();
  const signer = useStellarSigner();

  const [rows, setRows] = useState<ActiveRow[]>([]);
  const [mint, setMint] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [doubleDownId, setDoubleDownId] = useState<number | null>(null);
  const [cashOutId, setCashOutId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const wallet = signer.publicKey?.toBase58() ?? null;
  const balance = useStarsBalance(wallet);

  // Positions + cashouts. Mint comes from the same cached `getConfig` call so
  // we don't issue a separate RPC for it. `getUserPositions` internally uses
  // the cached `getAllMarkets` snapshot, so we don't need to fetch it again.
  useEffect(() => {
    let cancelled = false;
    if (!authenticated || !signer.publicKey) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const userPk = signer.publicKey;
    const addr = userPk.toBase58();
    Promise.all([
      getUserPositions(program, userPk),
      getAllMarkets(program),
      getConfig(program),
      fetch(`/api/markets/cashouts?address=${addr}`)
        .then((r) => r.json())
        .then((d) => (d?.cashouts ?? []) as CashoutRecord[])
        .catch(() => [] as CashoutRecord[]),
    ])
      .then(([positions, markets, cfg, cashouts]) => {
        if (!cancelled) setMint(cfg?.mint ?? null);
        if (cancelled) return;
        const byId = new Map<number, MarketOnChain>(
          markets.map((m) => [m.marketId, m]),
        );
        const cashoutKey = (mid: number, side: MarketSide) => `${mid}:${side}`;
        const cashoutByKey = new Map<string, CashoutRecord>(
          cashouts.map((c) => [cashoutKey(c.marketId, c.side), c]),
        );
        const out: ActiveRow[] = [];
        for (const p of positions) {
          if (p.claimed) continue;
          const m = byId.get(p.marketId);
          if (!m) continue;
          if (m.resolved || m.cancelled) continue;
          const meta = findMetadataByMarketId(p.marketId);
          out.push({
            position: p,
            market: m,
            title: meta ? displayTitle(meta) : m.question || `Market #${p.marketId}`,
            cashout: cashoutByKey.get(cashoutKey(p.marketId, p.side)) ?? null,
            locked: Date.now() >= m.resolutionTime.getTime(),
          });
        }
        out.sort((a, b) => {
          // Locked first (need attention), then by closest resolution time.
          if (a.locked !== b.locked) return a.locked ? -1 : 1;
          return a.market.resolutionTime.getTime() - b.market.resolutionTime.getTime();
        });
        setRows(out);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, signer.publicKey, program, refreshKey]);

  const onCashOut = useCallback(
    async (marketId: number, side: MarketSide) => {
      if (!wallet) return;
      setBusyId(marketId);
      setErrors((e) => ({ ...e, [marketId]: '' }));
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Sign in required');
        const res = await fetch('/api/markets/cash-out', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ walletAddress: wallet, marketId, side }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
        setCashOutId(null);
        // On-chain pools changed; clear cached snapshots so next reads are fresh.
        invalidateMarketsCache();
        setRefreshKey((k) => k + 1);
        // Tell other widgets (balance, etc.) to refresh.
        window.dispatchEvent(new Event('stellar:stars-synced'));
      } catch (err) {
        setErrors((e) => ({
          ...e,
          [marketId]: err instanceof Error ? err.message : 'Cash out failed',
        }));
      } finally {
        setBusyId(null);
      }
    },
    [wallet, getAccessToken],
  );

  const onDoubleDownSuccess = useCallback(() => {
    setDoubleDownId(null);
    invalidateMarketsCache();
    setRefreshKey((k) => k + 1);
  }, []);

  const visibleRows = useMemo(() => {
    if (variant === 'compact') return rows.slice(0, 3);
    return rows;
  }, [rows, variant]);

  if (!authenticated || (loading && rows.length === 0)) {
    if (variant === 'full') {
      // Render skeleton in full mode
      return (
        <section className="mab-section">
          <header className="mab-section-head">
            <h3 className="mab-section-title">{title ?? 'My active bets'}</h3>
          </header>
          {!authenticated ? (
            <div className="mab-empty">Sign in to view your bets.</div>
          ) : (
            <div className="mab-empty">Loading…</div>
          )}
        </section>
      );
    }
    // Compact: hide entirely until ready & non-empty
    return null;
  }

  if (rows.length === 0) {
    if (variant === 'full') {
      return (
        <section className="mab-section">
          <header className="mab-section-head">
            <h3 className="mab-section-title">{title ?? 'My active bets'}</h3>
          </header>
          <div className="mab-empty">
            No active bets.{' '}
            <Link href="/markets" className="mab-link">
              Browse markets →
            </Link>
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section className="mab-section">
      <header className="mab-section-head">
        <h3 className="mab-section-title">{title ?? 'My active bets'}</h3>
        <Link href="/my-positions" className="mab-link">
          See all →
        </Link>
      </header>

      <div className="mab-list">
        {visibleRows.map((row) => {
          const { position, market, title, cashout, locked } = row;
          const sideClass = position.side === 'yes' ? 'yes' : 'no';
          const cashedOut = !!cashout;
          const refundPreview = Math.floor((position.amount * REFUND_BPS) / 10000);
          const isDoubleDownOpen = doubleDownId === position.marketId;
          const isCashOutOpen = cashOutId === position.marketId;
          const busy = busyId === position.marketId;
          const err = errors[position.marketId];
          return (
            <article
              key={`${position.marketId}-${position.side}`}
              className={`mab-row${cashedOut ? ' cashed' : ''}`}
            >
              <div className="mab-row-head">
                <Link
                  href={`/markets/${position.marketId}`}
                  className="mab-row-title"
                >
                  {title}
                </Link>
                <span className={`mab-row-pill ${sideClass}`}>
                  {position.side.toUpperCase()} · {fmtInt(position.amount)} ✦
                </span>
              </div>

              <div className="mab-row-meta">
                {cashedOut ? (
                  <span className="mab-row-status cashed">
                    Cashed out · received {fmtInt(cashout.refundedAmount)} ✦
                  </span>
                ) : locked ? (
                  <span className="mab-row-status locked">
                    Locked · waiting on resolution
                  </span>
                ) : (
                  <span className="mab-row-status">
                    Projected payout {fmtInt(position.projectedPayout)} ✦
                  </span>
                )}
              </div>

              {!cashedOut && !locked && (
                <div className="mab-row-actions">
                  <button
                    type="button"
                    className="mab-btn ghost"
                    onClick={() =>
                      setDoubleDownId((cur) =>
                        cur === position.marketId ? null : position.marketId,
                      )
                    }
                    disabled={busy}
                  >
                    {isDoubleDownOpen ? 'Close' : 'Double down'}
                  </button>
                  <button
                    type="button"
                    className="mab-btn warn"
                    onClick={() =>
                      setCashOutId((cur) =>
                        cur === position.marketId ? null : position.marketId,
                      )
                    }
                    disabled={busy}
                  >
                    {isCashOutOpen ? 'Close' : `Cash out · ${fmtInt(refundPreview)} ✦`}
                  </button>
                </div>
              )}

              {isCashOutOpen && !cashedOut && !locked && (
                <div className="mab-confirm">
                  <p className="mab-confirm-text">
                    Get {fmtInt(refundPreview)} ✦ now and walk away. You forfeit{' '}
                    {fmtInt(position.amount - refundPreview)} ✦ as an exit fee — your
                    on-chain stake stays in the pool and is paid to the winning side.
                  </p>
                  <div className="mab-confirm-actions">
                    <button
                      type="button"
                      className="mab-btn ghost"
                      onClick={() => setCashOutId(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="mab-btn primary"
                      onClick={() => onCashOut(position.marketId, position.side)}
                      disabled={busy}
                    >
                      {busy ? 'Cashing out…' : `Confirm cash out`}
                    </button>
                  </div>
                </div>
              )}

              {isDoubleDownOpen && !cashedOut && !locked && (
                <div className="mab-bet-wrap">
                  <InlineBetPanel
                    onChain={market}
                    mint={mint}
                    balance={balance}
                    side={position.side}
                    locked={locked}
                    onClose={() => setDoubleDownId(null)}
                    onSuccess={onDoubleDownSuccess}
                  />
                </div>
              )}

              {err && <div className="mab-error">{err}</div>}
            </article>
          );
        })}
      </div>

      {variant === 'compact' && rows.length > visibleRows.length && (
        <div className="mab-foot">
          <Link href="/my-positions" className="mab-link">
            View {rows.length - visibleRows.length} more →
          </Link>
        </div>
      )}

      <style jsx>{`
        /* Theme-aware: --stl-text1/2/3 + --stl-bg2/3 + --stl-border come from
           .markets-page scope. Falls back to global dark tokens elsewhere. */
        .mab-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mab-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .mab-section-title {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--stl-text2, var(--stl-accent, var(--terracotta)));
          margin: 0;
        }
        .mab-link {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--stl-accent, var(--terracotta));
          text-decoration: none;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .mab-link:hover {
          text-decoration: underline;
        }
        .mab-empty {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--stl-text2, rgba(255, 255, 255, 0.5));
          padding: 14px 12px;
          background: var(--stl-bg2, rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stl-border, rgba(255, 255, 255, 0.06));
          border-radius: 10px;
        }
        .mab-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mab-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 14px 12px;
          border-radius: 12px;
          background: var(--stl-bg2, rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stl-border2, var(--stl-border, rgba(255, 255, 255, 0.08)));
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
        }
        .mab-row.cashed {
          opacity: 0.65;
        }
        .mab-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mab-row-title {
          font-family: var(--font-display, serif);
          font-size: 15px;
          font-weight: 600;
          color: var(--stl-text1, var(--stl-text-bright, var(--text)));
          text-decoration: none;
          line-height: 1.25;
          letter-spacing: -0.005em;
        }
        .mab-row-title:hover {
          text-decoration: underline;
        }
        .mab-row-pill {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 3px 7px;
          border-radius: 4px;
          line-height: 1;
          white-space: nowrap;
        }
        .mab-row-pill.yes {
          color: var(--stl-green, var(--seafoam));
          background: var(--stl-green-bg, rgba(94, 234, 212, 0.1));
          border: 1px solid var(--stl-green, rgba(94, 234, 212, 0.45));
        }
        .mab-row-pill.no {
          color: var(--stl-red, var(--negative));
          background: var(--stl-red-bg, rgba(251, 113, 133, 0.1));
          border: 1px solid var(--stl-red, rgba(251, 113, 133, 0.45));
        }
        .mab-row-meta {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--stl-text2, rgba(255, 255, 255, 0.7));
        }
        .mab-row-status {
          font-weight: 500;
        }
        .mab-row-status.cashed {
          color: var(--stl-amber, rgba(232, 130, 107, 0.85));
        }
        .mab-row-status.locked {
          color: var(--stl-text2, rgba(255, 255, 255, 0.7));
        }
        .mab-row-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mab-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          line-height: 1;
        }
        .mab-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .mab-btn.ghost {
          background: transparent;
          color: var(--stl-text1, rgba(255, 255, 255, 0.85));
          border: 1px solid var(--stl-border2, var(--stl-border, rgba(255, 255, 255, 0.18)));
        }
        .mab-btn.ghost:hover:not(:disabled) {
          background: var(--stl-bg-hover, rgba(255, 255, 255, 0.04));
          border-color: var(--stl-text2, rgba(255, 255, 255, 0.3));
        }
        .mab-btn.primary {
          background: var(--stl-accent, var(--terracotta));
          color: #fff;
          border: 1px solid var(--stl-accent, rgba(232, 130, 107, 0.5));
        }
        .mab-btn.warn {
          background: transparent;
          color: var(--stl-red, rgba(251, 113, 133, 0.95));
          border: 1px solid var(--stl-red, rgba(251, 113, 133, 0.45));
        }
        .mab-btn.warn:hover:not(:disabled) {
          background: var(--stl-red-bg, rgba(251, 113, 133, 0.08));
        }
        .mab-confirm {
          padding: 10px;
          border-radius: 8px;
          background: var(--stl-red-bg, rgba(251, 113, 133, 0.06));
          border: 1px solid var(--stl-red, rgba(251, 113, 133, 0.2));
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mab-confirm-text {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-text1, rgba(255, 255, 255, 0.85));
          line-height: 1.5;
        }
        .mab-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .mab-bet-wrap {
          /* InlineBetPanel brings its own styling */
        }
        .mab-error {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-red, var(--negative));
        }
        .mab-foot {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </section>
  );
}
