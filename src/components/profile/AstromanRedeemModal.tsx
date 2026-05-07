'use client';

// §5B: Redeem-at-Astroman flow.
//
// User picks a Star amount (snapped to 100s), clicks Redeem, the embedded
// wallet signs a Stars burn, server mints a 6-character one-time code
// valid 7 days. Renders the code big with a high-contrast QR for the
// cashier to scan + a copy-to-clipboard button.

import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as usePrivySolanaWallets } from '@privy-io/react-auth/solana';
import { BURN_INCREMENT, STARS_PER_GEL, starsToGEL } from '@/lib/stars-economy';
import { executeBurn } from '@/lib/stars-burn-client';

type Phase = 'form' | 'burning' | 'minting' | 'done' | 'error';

interface IssuedCode {
  code: string;
  gelValue: number;
  starsBurned: number;
  expiresAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  walletAddress: string | null;
  balance: number;
}

export default function AstromanRedeemModal({ open, onClose, walletAddress, balance }: Props) {
  const { getAccessToken } = usePrivy();
  const { wallets } = usePrivySolanaWallets();

  const [stars, setStars] = useState(0);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [copied, setCopied] = useState(false);

  // Snap to 100s, capped at on-chain balance.
  const sliderMax = Math.floor(balance / BURN_INCREMENT) * BURN_INCREMENT;
  const gel = starsToGEL(stars);

  useEffect(() => {
    if (!open) return;
    setStars(0);
    setPhase('form');
    setError(null);
    setIssued(null);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function redeem() {
    if (!walletAddress) { setError('Sign in first'); setPhase('error'); return; }
    if (stars <= 0 || stars % BURN_INCREMENT !== 0) {
      setError(`Pick a multiple of ${BURN_INCREMENT}`); setPhase('error'); return;
    }
    if (stars > balance) { setError('Insufficient Stars balance'); setPhase('error'); return; }

    const wallet = wallets[0];
    if (!wallet?.address) { setError('Wallet not ready — try again'); setPhase('error'); return; }

    setError(null);
    setPhase('burning');
    let burnSignature: string;
    try {
      const token = await getAccessToken().catch(() => null);
      const result = await executeBurn({
        privyToken: token,
        wallet: wallet as unknown as Parameters<typeof executeBurn>[0]['wallet'],
        amount: stars,
        kind: 'redeem-code',
      });
      burnSignature = result.signature;
    } catch (e) {
      setError(`Burn failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      setPhase('error');
      return;
    }

    setPhase('minting');
    try {
      const token = await getAccessToken().catch(() => null);
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ walletAddress, stars, burnSignature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not mint code');
      setIssued({
        code: data.code,
        gelValue: data.gelValue,
        starsBurned: data.starsBurned ?? stars,
        expiresAt: data.expiresAt,
      });
      setPhase('done');
    } catch (e) {
      setError(`Code mint failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      setPhase('error');
    }
  }

  function copyCode() {
    if (!issued) return;
    navigator.clipboard.writeText(issued.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(7,11,20,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
        style={{ background: 'var(--canvas)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-mono">
              Burn Stars · 100 Stars = 1 ₾
            </p>
            <h2 className="text-text-primary text-lg font-semibold mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
              Redeem at Astroman
            </h2>
            <p className="text-text-muted text-xs mt-1">
              Pickup the code at the Tbilisi store register · 7-day expiry
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X size={14} />
          </button>
        </div>

        {phase === 'form' && (
          <>
            <div
              className="rounded-md p-4 flex flex-col gap-2"
              style={{ background: 'rgba(255,179,71,0.04)', border: '0.5px solid rgba(255,179,71,0.18)' }}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--terracotta)] font-medium">
                  Burn amount
                </span>
                <span className="text-[10px] tracking-[0.14em] uppercase text-text-muted font-mono">
                  Balance ✦ {balance.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={BURN_INCREMENT}
                value={stars}
                onChange={e => setStars(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--terracotta)' }}
              />
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className="text-text-muted">✦ {stars.toLocaleString()} → code</span>
                <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>
                  {gel.toFixed(2)} ₾ store credit
                </span>
              </div>
              {balance > 0 && (
                <input
                  type="number"
                  min={0}
                  max={balance}
                  step={BURN_INCREMENT}
                  value={stars}
                  onChange={e => {
                    const n = Math.floor(Number(e.target.value) / BURN_INCREMENT) * BURN_INCREMENT;
                    setStars(Math.min(Math.max(0, n), balance));
                  }}
                  className="w-full rounded-md px-3 py-2 text-sm font-mono outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Or type a Star amount"
                />
              )}
            </div>

            {error && (
              <p className="text-[12px] text-[var(--negative)]">{error}</p>
            )}

            <button
              onClick={redeem}
              disabled={stars <= 0 || stars > balance || !walletAddress}
              className="px-4 py-3 rounded-full text-[12px] font-bold tracking-[0.18em] uppercase disabled:opacity-50"
              style={{ background: 'var(--terracotta)', color: 'var(--canvas)' }}
            >
              Burn {stars.toLocaleString()} Stars · Mint code
            </button>
            <p className="text-[11px] text-text-muted">
              Stars are burned on-chain when you tap above. The 6-character code is shown next.
            </p>
          </>
        )}

        {(phase === 'burning' || phase === 'minting') && (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="w-6 h-6 rounded-full border-2 border-[var(--terracotta)] border-t-transparent animate-spin" />
            <p className="text-text-primary text-sm font-medium">
              {phase === 'burning' ? 'Burning Stars on Solana…' : 'Minting code…'}
            </p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">
              {phase === 'burning'
                ? 'Sign the burn in your embedded wallet. Fee payer covers gas.'
                : 'Generating a unique 6-character code valid for 7 days.'}
            </p>
          </div>
        )}

        {phase === 'done' && issued && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="text-[36px] font-bold tracking-[0.2em] font-mono px-6 py-3 rounded-md"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,179,71,0.4)',
                color: 'var(--terracotta)',
                letterSpacing: '0.18em',
              }}
            >
              {issued.code}
            </div>
            <div className="p-3 bg-white rounded-md">
              <QRCodeSVG value={issued.code} size={180} bgColor="#FFFFFF" fgColor="#000000" level="H" />
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <span style={{ color: 'var(--seafoam)', fontWeight: 600 }} className="font-mono text-sm">
                {issued.gelValue.toFixed(2)} ₾ store credit
              </span>
              <span className="text-text-muted text-xs">
                ✦ {issued.starsBurned.toLocaleString()} Stars burned · expires{' '}
                {new Date(issued.expiresAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={copyCode}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-md text-xs"
                style={{ background: 'var(--terracotta)', color: 'var(--canvas)', fontWeight: 600 }}
              >
                Done
              </button>
            </div>
            <p className="text-[10px] text-text-muted text-center max-w-[280px]">
              Show this code at the Astroman till in Tbilisi to redeem your store credit.
              {STARS_PER_GEL > 0 ? ` Rate: ${STARS_PER_GEL} Stars = 1 ₾.` : ''}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[var(--negative)] text-sm font-semibold">Something went wrong</p>
            {error && <p className="text-text-muted text-xs text-center max-w-[280px]">{error}</p>}
            <button
              onClick={() => { setPhase('form'); setError(null); }}
              className="px-4 py-2 rounded-md text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
