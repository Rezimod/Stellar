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

interface BetFormProps {
  onChain: MarketOnChain;
  mint: PublicKey;
  balance: number | null;
  locked: boolean;
  onSuccess: () => void;
  boostMultiplier?: number;
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/insufficient.*fund|AccountNotInitialized/i.test(msg))
    return 'Insufficient Stars or token account missing';
  if (/User rejected|rejected|cancelled|canceled/i.test(msg))
    return 'Signature rejected';
  if (/MarketClosed|ResolutionPassed|MarketNotOpen/i.test(msg))
    return 'Market closed';
  if (/NoOpposition/i.test(msg))
    return 'Both sides must be seeded first';
  if (/blockhash.*not found|block.*height.*exceeded/i.test(msg))
    return 'Network stale — try again';
  return msg.length > 140 ? `${msg.slice(0, 140)}…` : msg;
}

export default function BetForm({
  onChain,
  mint,
  balance,
  locked,
  onSuccess,
  boostMultiplier,
}: BetFormProps) {
  const { authenticated, ready } = useStellarUser();
  const program = useStellarProgram();
  const signer = useStellarSigner();

  const [side, setSide] = useState<MarketSide | null>(null);
  const [amountStr, setAmountStr] = useState<string>('');
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
    if (!side || amount < 1) return 0;
    const yes = onChain.yesPool;
    const no = onChain.noPool;
    const newSide = (side === 'yes' ? yes : no) + amount;
    const newTotal = yes + no + amount;
    if (newSide === 0 || newTotal === 0) return 0;
    return Math.floor((amount / newSide) * newTotal);
  }, [side, amount, onChain.yesPool, onChain.noPool]);

  const canSubmit =
    authenticated &&
    signer.isReady &&
    !!program &&
    side !== null &&
    amountValid &&
    !locked &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !program || !side) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await placeBetFromUI(
        program,
        signer,
        mint,
        onChain.marketId,
        side,
        amount,
      );
      console.log('[placeBet] confirmed', res);
      setAmountStr('');
      setSide(null);
      onSuccess();
    } catch (err) {
      console.error('[placeBet] failed', err);
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        Place position
      </div>

      <div className="flex gap-2">
        <SideButton
          label="YES"
          active={side === 'yes'}
          color="var(--stl-green)"
          activeBg="rgba(52,211,153,0.14)"
          activeBorder="rgba(52,211,153,0.5)"
          onClick={() => setSide('yes')}
          disabled={locked || submitting}
        />
        <SideButton
          label="NO"
          active={side === 'no'}
          color="#F472B6"
          activeBg="rgba(244,114,182,0.14)"
          activeBorder="rgba(244,114,182,0.5)"
          onClick={() => setSide('no')}
          disabled={locked || submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Amount</Label>
        <div
          className="flex items-center"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="100"
            value={amountStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              setAmountStr(v);
            }}
            disabled={locked || submitting}
            style={{
              background: 'transparent',
              color: 'var(--stl-text-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontVariantNumeric: 'tabular-nums',
              border: 'none',
              outline: 'none',
              flex: 1,
              width: '100%',
            }}
          />
          <span
            style={{
              color: 'var(--stl-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            ✦
          </span>
        </div>
        {balance !== null && (
          <div
            className="flex items-center justify-between"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 2,
            }}
          >
            <span>Balance: {fmtInt(balance)} ✦</span>
            {balance > 0 && (
              <button
                type="button"
                onClick={() => setAmountStr(String(balance))}
                disabled={locked || submitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,209,102,0.8)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                  letterSpacing: '0.08em',
                }}
              >
                MAX
              </button>
            )}
          </div>
        )}
      </div>

      {side !== null && amount > 0 && (
        <div
          className="rounded-lg"
          style={{
            background: boostMultiplier
              ? 'rgba(255,209,102,0.06)'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${
              boostMultiplier ? 'rgba(255,209,102,0.25)' : 'rgba(255,255,255,0.06)'
            }`,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 2,
            }}
          >
            Projected payout
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              color: 'var(--stl-text-bright)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmtInt(
              boostMultiplier
                ? Math.round(projectedPayout * boostMultiplier)
                : projectedPayout,
            )}{' '}
            ✦
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: boostMultiplier
                ? 'rgba(255,209,102,0.9)'
                : 'rgba(255,255,255,0.4)',
              marginTop: 2,
            }}
          >
            if {side.toUpperCase()} wins
            {boostMultiplier ? ` · ${boostMultiplier}× observer bonus` : ''}
          </div>
        </div>
      )}

      {!authenticated ? (
        <>
          <button
            onClick={() => setAuthOpen(true)}
            disabled={!ready}
            style={primaryBtnStyle(false)}
          >
            Sign in to bet
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={primaryBtnStyle(!canSubmit)}
        >
          {submitting
            ? 'Signing…'
            : locked
            ? 'Market locked'
            : side === null
            ? 'Pick a side'
            : amount < 1
            ? 'Enter amount'
            : amount > maxAmount
            ? 'Over balance'
            : 'Place position'}
        </button>
      )}

      {error && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#FBBF24',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 6,
            padding: '8px 10px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function SideButton({
  label,
  active,
  color,
  activeBg,
  activeBorder,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  color: string;
  activeBg: string;
  activeBorder: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '12px 0',
        borderRadius: 8,
        border: `1px solid ${active ? activeBorder : 'rgba(255,255,255,0.08)'}`,
        background: active ? activeBg : 'rgba(255,255,255,0.02)',
        color: active ? color : 'rgba(255,255,255,0.6)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.12s ease',
      }}
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </span>
  );
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '12px 14px',
    borderRadius: 8,
    background: disabled ? 'rgba(255,209,102,0.25)' : 'var(--stl-gold)',
    color: disabled ? 'rgba(0,0,0,0.55)' : '#0a0a0a',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
  };
}
