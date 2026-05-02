'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicKey } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';
import {
  invalidateMarketsCache,
  type MarketOnChain,
  type MarketSide,
  type Position,
} from '@/lib/markets';
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

interface UserPositionCardProps {
  positions: Position[];
  market?: MarketOnChain | null;
  mint?: PublicKey | null;
  balance?: number | null;
  walletAddress?: string | null;
  locked?: boolean;
  onRefresh?: () => void;
}

const REFUND_BPS = 7000;

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function UserPositionCard({
  positions,
  market,
  mint,
  balance,
  walletAddress,
  locked = false,
  onRefresh,
}: UserPositionCardProps) {
  const { getAccessToken } = usePrivy();
  const [doubleDownSide, setDoubleDownSide] = useState<MarketSide | null>(null);
  const [cashOutSide, setCashOutSide] = useState<MarketSide | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cashouts, setCashouts] = useState<Map<MarketSide, CashoutRecord>>(
    new Map(),
  );

  const marketId = market?.marketId ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!walletAddress || marketId == null) {
      setCashouts(new Map());
      return;
    }
    fetch(`/api/markets/cashouts?address=${walletAddress}`)
      .then((r) => r.json())
      .then((d) => (d?.cashouts ?? []) as CashoutRecord[])
      .catch(() => [] as CashoutRecord[])
      .then((records) => {
        if (cancelled) return;
        const next = new Map<MarketSide, CashoutRecord>();
        for (const c of records) {
          if (c.marketId === marketId) next.set(c.side as MarketSide, c);
        }
        setCashouts(next);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress, marketId]);

  const onCashOut = useCallback(
    async (side: MarketSide) => {
      if (!walletAddress || marketId == null) return;
      setBusy(true);
      setErr(null);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Sign in required');
        const res = await fetch('/api/markets/cash-out', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ walletAddress, marketId, side }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
        setCashOutSide(null);
        invalidateMarketsCache();
        window.dispatchEvent(new Event('stellar:stars-synced'));
        onRefresh?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Cash out failed');
      } finally {
        setBusy(false);
      }
    },
    [walletAddress, marketId, getAccessToken, onRefresh],
  );

  const onDoubleDownSuccess = useCallback(() => {
    setDoubleDownSide(null);
    invalidateMarketsCache();
    onRefresh?.();
  }, [onRefresh]);

  if (positions.length === 0) return null;

  const canTrade = !!market && !!walletAddress;

  return (
    <section className="flex flex-col gap-2">
      <h3
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--stl-text3)',
          margin: 0,
        }}
      >
        Your positions
      </h3>
      <div className="flex flex-col gap-2">
        {positions.map((p) => {
          const isYes = p.side === 'yes';
          const cashed = cashouts.get(p.side);
          const cashedOut = !!cashed;
          const refundPreview = Math.floor((p.amount * REFUND_BPS) / 10000);
          const isDoubleDownOpen = doubleDownSide === p.side;
          const isCashOutOpen = cashOutSide === p.side;
          const potentialGain = Math.max(0, p.projectedPayout - p.amount);
          const showActions = canTrade && !cashedOut && !locked && !p.claimed;

          return (
            <div
              key={`${p.marketId}-${p.side}`}
              className="upc-card"
              style={{
                background: 'var(--stl-bg2)',
                border: `1px solid ${isYes ? 'var(--stl-green)' : 'var(--stl-red)'}`,
                borderRadius: 10,
                overflow: 'hidden',
                opacity: cashedOut ? 0.7 : 1,
              }}
            >
              <div
                className="upc-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  flexWrap: 'wrap',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: isYes ? 'var(--stl-green)' : 'var(--stl-red)',
                      background: isYes ? 'var(--stl-green-bg)' : 'var(--stl-red-bg)',
                      borderRadius: 4,
                      padding: '2.5px 6px',
                    }}
                  >
                    {p.side.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--stl-text1)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtInt(p.amount)} ✦
                  </span>
                  <span
                    aria-hidden
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--stl-text3)',
                    }}
                  >
                    →
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: cashedOut
                        ? 'var(--stl-text2)'
                        : locked
                        ? 'var(--stl-amber)'
                        : 'var(--stl-green)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {cashedOut
                      ? `${fmtInt(cashed.refundedAmount)} ✦ refunded`
                      : p.claimed
                      ? `${fmtInt(p.projectedPayout)} ✦ claimed`
                      : `${fmtInt(p.projectedPayout)} ✦${
                          potentialGain > 0 ? ` (+${fmtInt(potentialGain)})` : ''
                        }`}
                  </span>
                </div>

                {showActions && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={`upc-btn ghost${isDoubleDownOpen ? ' active' : ''}`}
                      onClick={() =>
                        setDoubleDownSide((cur) => (cur === p.side ? null : p.side))
                      }
                      disabled={busy}
                    >
                      {isDoubleDownOpen ? 'Close' : 'Double down'}
                    </button>
                    <button
                      type="button"
                      className={`upc-btn warn${isCashOutOpen ? ' active' : ''}`}
                      onClick={() =>
                        setCashOutSide((cur) => (cur === p.side ? null : p.side))
                      }
                      disabled={busy}
                    >
                      {isCashOutOpen ? 'Close' : `Cash out ${fmtInt(refundPreview)} ✦`}
                    </button>
                  </div>
                )}
              </div>

              {isCashOutOpen && showActions && (
                <div className="upc-confirm">
                  <p className="upc-confirm-text">
                    Take {fmtInt(refundPreview)} ✦ now, forfeit{' '}
                    {fmtInt(p.amount - refundPreview)} ✦ to the winning side.
                  </p>
                  <div className="upc-confirm-actions">
                    <button
                      type="button"
                      className="upc-btn ghost"
                      onClick={() => setCashOutSide(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="upc-btn primary"
                      onClick={() => onCashOut(p.side)}
                      disabled={busy}
                    >
                      {busy ? 'Cashing out…' : 'Confirm cash out'}
                    </button>
                  </div>
                </div>
              )}

              {isDoubleDownOpen && showActions && market && (
                <div className="upc-bet-wrap">
                  <InlineBetPanel
                    onChain={market}
                    mint={mint ?? null}
                    balance={balance ?? null}
                    side={p.side}
                    locked={locked}
                    onClose={() => setDoubleDownSide(null)}
                    onSuccess={onDoubleDownSuccess}
                  />
                </div>
              )}

              {err && cashOutSide === p.side && (
                <div className="upc-error">{err}</div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .upc-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          line-height: 1;
          white-space: nowrap;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }
        .upc-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .upc-btn.ghost {
          background: transparent;
          color: var(--stl-text2);
          border: 1px solid var(--stl-border2, var(--stl-border));
        }
        .upc-btn.ghost:hover:not(:disabled),
        .upc-btn.ghost.active {
          background: var(--stl-bg-hover, rgba(255, 255, 255, 0.04));
          color: var(--stl-text1);
          border-color: var(--stl-text3);
        }
        .upc-btn.primary {
          background: var(--stl-accent, var(--terracotta));
          color: #fff;
          border: 1px solid var(--stl-accent, var(--terracotta));
        }
        .upc-btn.primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .upc-btn.warn {
          background: transparent;
          color: var(--stl-red);
          border: 1px solid var(--stl-red);
        }
        .upc-btn.warn:hover:not(:disabled),
        .upc-btn.warn.active {
          background: var(--stl-red-bg);
        }
        .upc-confirm {
          padding: 10px 12px;
          background: var(--stl-red-bg);
          border-top: 1px solid var(--stl-red);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .upc-confirm-text {
          margin: 0;
          flex: 1 1 220px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-text1);
          line-height: 1.4;
        }
        .upc-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
        .upc-bet-wrap {
          padding: 10px 12px;
          border-top: 1px solid var(--stl-border);
          background: var(--stl-bg);
        }
        .upc-bet-wrap :global(.mkt-bet-panel) {
          margin: 0;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid var(--stl-border);
          background: var(--stl-bg2);
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
          align-items: center;
        }
        .upc-error {
          padding: 6px 12px 10px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--stl-red);
        }
      `}</style>
    </section>
  );
}
