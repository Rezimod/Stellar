'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  variant?: 'compact' | 'full' | 'strip';
  /** Optional title override. */
  title?: string;
}

const REFUND_BPS = 7000;
const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtResolveCountdown(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / MS_DAY);
  if (d >= 2) return `${d}d`;
  const h = Math.floor(ms / MS_HOUR);
  if (d === 1) return `1d ${h - 24}h`;
  if (h >= 1) return `${h}h`;
  const m = Math.max(1, Math.floor(ms / MS_MIN));
  return `${m}m`;
}

function fmtResolveDate(target: Date): string {
  return target.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MyActiveBets({ variant = 'compact', title }: Props) {
  const { authenticated } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const program = useReadOnlyProgram();
  const signer = useStellarSigner();
  const router = useRouter();

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

  if (variant === 'strip') {
    if (!authenticated || rows.length === 0) return null;
    return (
      <div className="mkt-active-band">
        <span className="mkt-active-band-label">Your bets</span>
        <div className="mab-strip" role="list">
          {rows.map((row) => {
            const sideClass = row.position.side === 'yes' ? 'yes' : 'no';
            return (
              <div
                key={`${row.position.marketId}-${row.position.side}`}
                role="listitem"
                className="mab-strip-chip"
                onClick={() => router.push(`/markets/${row.position.marketId}`)}
              >
                <span className={`mab-strip-side ${sideClass}`}>
                  {row.position.side.toUpperCase()}
                </span>
                <span className="mab-strip-title" title={row.title}>
                  {row.title}
                </span>
                <span className="mab-strip-payout">
                  {fmtInt(row.position.projectedPayout)} ✦
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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

  const isCompact = variant === 'compact';

  return (
    <section className={`mab-section${isCompact ? ' compact' : ''}`}>
      <header className="mab-section-head">
        <h3 className="mab-section-title">{title ?? 'My active bets'}</h3>
        <Link href="/my-positions" className="mab-link">
          See all →
        </Link>
      </header>

      <div className="mab-list">
        {visibleRows.map((row) => {
          const { position, market, title: rowTitle, cashout, locked } = row;
          const sideClass = position.side === 'yes' ? 'yes' : 'no';
          const cashedOut = !!cashout;
          const refundPreview = Math.floor((position.amount * REFUND_BPS) / 10000);
          const isDoubleDownOpen = doubleDownId === position.marketId;
          const isCashOutOpen = cashOutId === position.marketId;
          const busy = busyId === position.marketId;
          const err = errors[position.marketId];
          const resolveCountdown = fmtResolveCountdown(market.resolutionTime);
          const resolveDate = fmtResolveDate(market.resolutionTime);

          if (isCompact) {
            const potentialGain = Math.max(0, position.projectedPayout - position.amount);
            const gainPct = position.amount > 0
              ? Math.round((potentialGain / position.amount) * 100)
              : 0;
            return (
              <article
                key={`${position.marketId}-${position.side}`}
                className={`mab-card${cashedOut ? ' cashed' : ''}${locked ? ' locked' : ''}`}
              >
                <span className={`mab-card-stripe ${sideClass}`} aria-hidden />

                <div className="mab-card-head">
                  <span className={`mab-row-pill ${sideClass}`}>
                    {position.side.toUpperCase()}
                  </span>
                  <Link
                    href={`/markets/${position.marketId}`}
                    className="mab-card-title"
                    title={rowTitle}
                  >
                    {rowTitle}
                  </Link>
                  <span
                    className={`mab-card-status ${
                      cashedOut ? 'cashed' : locked ? 'locked' : 'live'
                    }`}
                  >
                    <span className="mab-status-dot" aria-hidden />
                    {cashedOut ? 'Cashed' : locked ? 'Awaiting' : `${resolveCountdown} left`}
                  </span>
                </div>

                <div className="mab-card-payout">
                  <div className="mab-payout-leg">
                    <span className="mab-payout-label">Stake</span>
                    <span className="mab-payout-value">{fmtInt(position.amount)} <span className="mab-payout-unit">✦</span></span>
                  </div>
                  <span className="mab-payout-arrow" aria-hidden>→</span>
                  <div className="mab-payout-leg">
                    <span className="mab-payout-label">
                      {cashedOut ? 'Refunded' : locked ? 'If wins' : 'Payout if win'}
                    </span>
                    <span
                      className={`mab-payout-value strong ${
                        cashedOut ? 'muted' : locked ? 'amber' : 'green'
                      }`}
                    >
                      {cashedOut
                        ? fmtInt(cashout.refundedAmount)
                        : fmtInt(position.projectedPayout)}{' '}
                      <span className="mab-payout-unit">✦</span>
                    </span>
                    {!cashedOut && !locked && potentialGain > 0 && (
                      <span className="mab-payout-delta">+{fmtInt(potentialGain)} ({gainPct}%)</span>
                    )}
                  </div>
                </div>

                {!cashedOut && !locked && (
                  <div className="mab-card-actions">
                    <button
                      type="button"
                      className={`mab-btn ghost${isDoubleDownOpen ? ' active' : ''}`}
                      onClick={() =>
                        setDoubleDownId((cur) =>
                          cur === position.marketId ? null : position.marketId,
                        )
                      }
                      disabled={busy}
                      aria-expanded={isDoubleDownOpen}
                    >
                      {isDoubleDownOpen ? 'Close' : 'Double down'}
                    </button>
                    <button
                      type="button"
                      className={`mab-btn warn${isCashOutOpen ? ' active' : ''}`}
                      onClick={() =>
                        setCashOutId((cur) =>
                          cur === position.marketId ? null : position.marketId,
                        )
                      }
                      disabled={busy}
                      aria-expanded={isCashOutOpen}
                    >
                      {isCashOutOpen ? 'Close' : `Cash out ${fmtInt(refundPreview)} ✦`}
                    </button>
                  </div>
                )}

                {locked && !cashedOut && (
                  <div className="mab-locked-note">
                    Locked at {market.resolutionTime.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} — oracle resolves shortly.
                  </div>
                )}

                {isCashOutOpen && !cashedOut && !locked && (
                  <div className="mab-confirm">
                    <p className="mab-confirm-text">
                      Take {fmtInt(refundPreview)} ✦ now, forfeit{' '}
                      {fmtInt(position.amount - refundPreview)} ✦ to the winning side.
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
                        {busy ? 'Cashing out…' : 'Confirm'}
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
          }

          return (
            <article
              key={`${position.marketId}-${position.side}`}
              className={`mab-row${cashedOut ? ' cashed' : ''}${locked ? ' locked' : ''}`}
            >
              <div className="mab-row-main">
                <span className={`mab-row-pill ${sideClass}`}>
                  {position.side.toUpperCase()} {fmtInt(position.amount)}
                </span>
                <Link
                  href={`/markets/${position.marketId}`}
                  className="mab-row-title"
                  title={rowTitle}
                >
                  {rowTitle}
                </Link>
                <span className="mab-row-stat">
                  {cashedOut
                    ? `+${fmtInt(cashout.refundedAmount)} ✦ cashed`
                    : locked
                    ? 'awaiting result'
                    : `${fmtInt(position.projectedPayout)} ✦ payout`}
                </span>
                <span
                  className="mab-row-resolve"
                  title={`Resolves ${market.resolutionTime.toLocaleString()}`}
                >
                  {locked ? 'locked' : `in ${resolveCountdown}`} · {resolveDate}
                </span>
                {!cashedOut && !locked && (
                  <div className="mab-row-actions">
                    <button
                      type="button"
                      className={`mab-btn ghost${isDoubleDownOpen ? ' active' : ''}`}
                      onClick={() =>
                        setDoubleDownId((cur) =>
                          cur === position.marketId ? null : position.marketId,
                        )
                      }
                      disabled={busy}
                      aria-expanded={isDoubleDownOpen}
                    >
                      {isDoubleDownOpen ? 'Close' : '+ Add'}
                    </button>
                    <button
                      type="button"
                      className={`mab-btn warn${isCashOutOpen ? ' active' : ''}`}
                      onClick={() =>
                        setCashOutId((cur) =>
                          cur === position.marketId ? null : position.marketId,
                        )
                      }
                      disabled={busy}
                      aria-expanded={isCashOutOpen}
                    >
                      {isCashOutOpen ? 'Close' : `Cash ${fmtInt(refundPreview)} ✦`}
                    </button>
                  </div>
                )}
              </div>

              {isCashOutOpen && !cashedOut && !locked && (
                <div className="mab-confirm">
                  <p className="mab-confirm-text">
                    Take {fmtInt(refundPreview)} ✦ now, forfeit{' '}
                    {fmtInt(position.amount - refundPreview)} ✦ to the winning side.
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
                      {busy ? 'Cashing out…' : 'Confirm cash out'}
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
          gap: 8px;
        }
        .mab-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .mab-section-title {
          font-family: var(--font-mono);
          font-size: 10.5px;
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
          padding: 12px;
          background: var(--stl-bg2, rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stl-border, rgba(255, 255, 255, 0.06));
          border-radius: 8px;
        }
        .mab-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mab-row {
          display: flex;
          flex-direction: column;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--stl-bg2, rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stl-border2, var(--stl-border, rgba(255, 255, 255, 0.08)));
        }
        .mab-section.compact .mab-list { gap: 10px; }

        /* Compact rich card used on /profile */
        .mab-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 14px 13px 16px;
          border-radius: 10px;
          background: var(--stl-bg2, rgba(255, 255, 255, 0.025));
          border: 1px solid var(--stl-border, rgba(255, 255, 255, 0.08));
          overflow: hidden;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .mab-card:hover {
          border-color: var(--stl-text3, rgba(255, 255, 255, 0.22));
        }
        .mab-card.cashed {
          opacity: 0.62;
        }
        .mab-card.locked {
          border-color: var(--stl-amber, rgba(255, 209, 102, 0.32));
          background: var(--stl-amber-bg, rgba(255, 209, 102, 0.04));
        }
        .mab-card-stripe {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
        }
        .mab-card-stripe.yes {
          background: var(--stl-green, var(--seafoam));
        }
        .mab-card-stripe.no {
          background: var(--stl-red, var(--negative));
        }
        .mab-card.cashed .mab-card-stripe,
        .mab-card.locked .mab-card-stripe {
          opacity: 0.55;
        }
        .mab-card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .mab-card-title {
          flex: 1 1 auto;
          min-width: 0;
          font-family: var(--font-display, var(--font-body, sans-serif));
          font-size: 14px;
          font-weight: 500;
          color: var(--stl-text1, var(--text));
          text-decoration: none;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mab-card-title:hover {
          text-decoration: underline;
        }
        .mab-card-status {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stl-text2, rgba(255, 255, 255, 0.7));
        }
        .mab-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: var(--stl-text3, rgba(255, 255, 255, 0.4));
        }
        .mab-card-status.live {
          color: var(--stl-green, var(--seafoam));
        }
        .mab-card-status.live .mab-status-dot {
          background: var(--stl-green, var(--seafoam));
          box-shadow: 0 0 0 2px rgba(94, 234, 212, 0.18);
          animation: mabPulse 1.6s ease-in-out infinite;
        }
        .mab-card-status.locked {
          color: var(--stl-amber, rgba(255, 209, 102, 0.95));
        }
        .mab-card-status.locked .mab-status-dot {
          background: var(--stl-amber, rgba(255, 209, 102, 0.95));
        }
        .mab-card-status.cashed {
          color: var(--stl-text3, rgba(255, 255, 255, 0.5));
        }
        @keyframes mabPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .mab-card-payout {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--stl-bg, rgba(0, 0, 0, 0.22));
          border: 1px solid var(--stl-border, rgba(255, 255, 255, 0.06));
        }
        .mab-payout-leg {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .mab-payout-leg:last-child {
          align-items: flex-end;
          text-align: right;
        }
        .mab-payout-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stl-text3, rgba(255, 255, 255, 0.45));
        }
        .mab-payout-value {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--stl-text1, var(--text));
          letter-spacing: 0.01em;
          line-height: 1.1;
        }
        .mab-payout-value.strong {
          font-size: 16px;
          font-weight: 700;
        }
        .mab-payout-value.green { color: var(--stl-green, var(--seafoam)); }
        .mab-payout-value.amber { color: var(--stl-amber, rgba(255, 209, 102, 0.95)); }
        .mab-payout-value.muted { color: var(--stl-text2, rgba(255, 255, 255, 0.55)); }
        .mab-payout-unit {
          font-size: 0.78em;
          opacity: 0.7;
          margin-left: 1px;
        }
        .mab-payout-arrow {
          font-family: var(--font-mono);
          font-size: 16px;
          color: var(--stl-text3, rgba(255, 255, 255, 0.32));
          line-height: 1;
        }
        .mab-payout-delta {
          margin-top: 2px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          color: var(--stl-green, var(--seafoam));
          letter-spacing: 0.02em;
        }
        .mab-locked-note {
          font-family: var(--font-mono);
          font-size: 10.5px;
          line-height: 1.4;
          color: var(--stl-text2, rgba(255, 255, 255, 0.6));
          letter-spacing: 0.02em;
        }
        .mab-card-actions {
          display: flex;
          gap: 8px;
        }
        .mab-card-actions .mab-btn {
          flex: 1 1 0;
          padding: 9px 10px;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-align: center;
        }
        .mab-row.cashed {
          opacity: 0.6;
        }
        .mab-row.locked .mab-row-stat {
          color: var(--stl-amber, rgba(255, 209, 102, 0.85));
        }
        .mab-row-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 28px;
        }
        .mab-row-title {
          flex: 1 1 auto;
          min-width: 0;
          font-family: var(--font-body, sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: var(--stl-text1, var(--text));
          text-decoration: none;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mab-row-title:hover {
          text-decoration: underline;
        }
        .mab-row-pill {
          flex-shrink: 0;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 3px 6px;
          border-radius: 3px;
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
        .mab-row-stat {
          flex-shrink: 0;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-text1, rgba(255, 255, 255, 0.85));
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .mab-row-resolve {
          flex-shrink: 0;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--stl-text3, rgba(255, 255, 255, 0.55));
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .mab-row-actions {
          flex-shrink: 0;
          display: flex;
          gap: 4px;
        }
        .mab-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 5px 8px;
          border-radius: 4px;
          cursor: pointer;
          line-height: 1;
          white-space: nowrap;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }
        .mab-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .mab-btn.ghost {
          background: transparent;
          color: var(--stl-text2, rgba(255, 255, 255, 0.7));
          border: 1px solid var(--stl-border2, var(--stl-border, rgba(255, 255, 255, 0.18)));
        }
        .mab-btn.ghost:hover:not(:disabled),
        .mab-btn.ghost.active {
          background: var(--stl-bg-hover, rgba(255, 255, 255, 0.04));
          color: var(--stl-text1, var(--text));
          border-color: var(--stl-text3, rgba(255, 255, 255, 0.3));
        }
        .mab-btn.primary {
          background: var(--stl-accent, var(--terracotta));
          color: #fff;
          border: 1px solid var(--stl-accent, rgba(255, 209, 102, 0.5));
        }
        .mab-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .mab-btn.warn {
          background: transparent;
          color: var(--stl-red, rgba(251, 113, 133, 0.95));
          border: 1px solid var(--stl-red, rgba(251, 113, 133, 0.45));
        }
        .mab-btn.warn:hover:not(:disabled),
        .mab-btn.warn.active {
          background: var(--stl-red-bg, rgba(251, 113, 133, 0.08));
        }
        .mab-confirm {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          background: var(--stl-red-bg, rgba(251, 113, 133, 0.06));
          border: 1px solid var(--stl-red, rgba(251, 113, 133, 0.2));
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mab-confirm-text {
          margin: 0;
          flex: 1 1 220px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-text1, rgba(255, 255, 255, 0.85));
          line-height: 1.4;
        }
        .mab-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
        .mab-bet-wrap {
          margin-top: 8px;
        }
        /* The shared InlineBetPanel uses .mkt-bet-panel which is laid out for
           the markets-page row context (negative margin + grid). Reset that
           when it lives inside a compact bet row so it doesn't bleed out of
           the rounded card or break its own grid. */
        .mab-bet-wrap :global(.mkt-bet-panel) {
          margin: 0;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid var(--stl-border, rgba(255, 255, 255, 0.08));
          background: var(--stl-bg, rgba(255, 255, 255, 0.02));
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
          align-items: center;
        }
        .mab-error {
          margin-top: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-red, var(--negative));
        }
        .mab-foot {
          display: flex;
          justify-content: flex-end;
        }

        @media (max-width: 720px) {
          .mab-row-main {
            flex-wrap: wrap;
            row-gap: 6px;
          }
          .mab-row-title {
            order: -1;
            flex-basis: 100%;
            white-space: normal;
            font-size: 13.5px;
          }
          .mab-row-actions {
            margin-left: auto;
          }
        }
      `}</style>
    </section>
  );
}
