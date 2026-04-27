'use client';

import { useMemo, useState } from 'react';
import type { PublicKey } from '@solana/web3.js';
import { placeBetFromUI } from '@/lib/markets';
import {
  useStellarProgram,
  useStellarSigner,
} from '@/lib/markets/privy-adapter';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import type { MarketOnChain, MarketSide } from '@/lib/markets';

interface InlineBetPanelProps {
  onChain: MarketOnChain;
  mint: PublicKey | null;
  balance: number | null;
  side: MarketSide;
  locked: boolean;
  boostMultiplier?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_STAKES = [10, 25, 50];

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/insufficient.*fund|AccountNotInitialized/i.test(msg))
    return 'Insufficient Stars';
  if (/User rejected|rejected|cancelled|canceled/i.test(msg))
    return 'Signature rejected';
  if (/MarketClosed|ResolutionPassed|MarketNotOpen/i.test(msg))
    return 'Market closed';
  if (/NoOpposition/i.test(msg)) return 'Both sides must be seeded first';
  if (/blockhash.*not found|block.*height.*exceeded/i.test(msg))
    return 'Network stale — try again';
  return msg.length > 100 ? `${msg.slice(0, 100)}…` : msg;
}

export default function InlineBetPanel({
  onChain,
  mint,
  balance,
  side,
  locked,
  boostMultiplier,
  onClose,
  onSuccess,
}: InlineBetPanelProps) {
  const { authenticated, ready } = useStellarUser();
  const program = useStellarProgram();
  const signer = useStellarSigner();

  const [amountStr, setAmountStr] = useState<string>('25');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const amount = useMemo(() => {
    const n = Number(amountStr);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 0;
    return n;
  }, [amountStr]);

  const maxAmount = balance == null ? Infinity : balance;
  const amountValid = amount >= 1 && amount <= maxAmount;

  const projectedPayout = useMemo(() => {
    if (amount < 1) return 0;
    const yes = onChain.yesPool;
    const no = onChain.noPool;
    const newSide = (side === 'yes' ? yes : no) + amount;
    const newTotal = yes + no + amount;
    if (newSide === 0 || newTotal === 0) return 0;
    return Math.floor((amount / newSide) * newTotal);
  }, [side, amount, onChain.yesPool, onChain.noPool]);

  const finalPayout = boostMultiplier
    ? Math.round(projectedPayout * boostMultiplier)
    : projectedPayout;

  const canSubmit =
    authenticated &&
    signer.isReady &&
    !!program &&
    !!mint &&
    amountValid &&
    !locked &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !program || !mint) return;
    setSubmitting(true);
    setError(null);
    try {
      await placeBetFromUI(
        program,
        signer,
        mint,
        onChain.marketId,
        side,
        amount,
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[inline-bet] failed', err);
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = submitting
    ? 'Signing…'
    : locked
    ? 'Market locked'
    : amount < 1
    ? 'Enter amount'
    : amount > maxAmount
    ? 'Over balance'
    : `Confirm ${side.toUpperCase()}`;

  return (
    <div
      className="mkt-bet-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mkt-bet-stake">
        <span className={`mkt-bet-panel-side ${side}`}>
          {side === 'yes' ? '▲ YES' : '▼ NO'}
        </span>
        <input
          className="mkt-bet-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountStr}
          onChange={(e) =>
            setAmountStr(e.target.value.replace(/[^0-9]/g, ''))
          }
          disabled={locked || submitting}
          aria-label="Stake amount"
        />
        {QUICK_STAKES.map((v) => (
          <button
            key={v}
            type="button"
            className={`mkt-bet-chip ${amount === v ? 'active' : ''}`}
            onClick={() => setAmountStr(String(v))}
            disabled={locked || submitting}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
          className="mkt-bet-chip"
          onClick={() =>
            balance != null && setAmountStr(String(Math.max(1, balance)))
          }
          disabled={locked || submitting || balance == null || balance < 1}
        >
          MAX
        </button>
        {balance !== null && (
          <span className="mkt-bet-balance">
            Balance {fmtInt(balance)} ✦
          </span>
        )}
      </div>

      <div className="mkt-bet-payout">
        <span className="mkt-bet-payout-label">If {side} wins</span>
        <span className="mkt-bet-payout-value">
          {fmtInt(finalPayout)} ✦
        </span>
        {boostMultiplier ? (
          <span
            className="mkt-bet-payout-hint"
            style={{ color: 'var(--stl-amber)' }}
          >
            {boostMultiplier}× observer bonus
          </span>
        ) : (
          <span className="mkt-bet-payout-hint">
            stake {fmtInt(amount)} ✦
          </span>
        )}
      </div>

      <div className="mkt-bet-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="mkt-bet-cancel"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        {!authenticated ? (
          <>
            <button
              type="button"
              className="mkt-bet-submit"
              onClick={() => setAuthOpen(true)}
              disabled={!ready}
            >
              Sign in
            </button>
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
          </>
        ) : (
          <button
            type="button"
            className="mkt-bet-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitLabel}
          </button>
        )}
      </div>

      {error && <div className="mkt-bet-error">{error}</div>}
    </div>
  );
}
