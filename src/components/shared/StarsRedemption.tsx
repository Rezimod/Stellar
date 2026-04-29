'use client';

import { useState } from 'react';

const REWARDS_TIERS = [
  { stars: 250, label: 'Free Moon Lamp', desc: 'With your next telescope order' },
  { stars: 500, label: '10% Telescope Discount', desc: 'On any telescope at astroman.ge' },
  { stars: 1000, label: '20% Telescope Discount', desc: 'On any telescope at astroman.ge' },
];

export default function StarsRedemption({ starsBalance, walletAddress }: { starsBalance: number | undefined; walletAddress?: string }) {
  const [open, setOpen] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const handleClaim = async (label: string) => {
    if (!walletAddress) return;
    setClaiming(prev => ({ ...prev, [label]: true }));
    try {
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: label, walletAddress }),
      });
      if (!res.ok) return;
      const { code } = await res.json();
      navigator.clipboard.writeText(code).catch(() => {});
      setRevealedCodes(prev => ({ ...prev, [label]: code }));
    } finally {
      setClaiming(prev => ({ ...prev, [label]: false }));
    }
  };

  return (
    <div className="mb-6">
      {/* Collapsed summary bar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
        style={{ background: 'rgba(232, 130, 107,0.07)', border: '1px solid rgba(232, 130, 107,0.15)' }}
      >
        <span className="text-sm text-text-primary">
          {starsBalance === undefined
            ? <span className="inline-block w-10 h-3.5 rounded bg-[var(--surface-hover)] animate-pulse align-middle" />
            : <span className="text-[var(--terracotta)] font-semibold">{starsBalance} ✦</span>
          }{' '}Stars — redeem rewards
        </span>
        <span className="text-[var(--terracotta)] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 mt-3">
      {REWARDS_TIERS.map(tier => {
        const balance = starsBalance ?? 0;
        const progress = Math.min((balance / tier.stars) * 100, 100);
        const unlocked = balance >= tier.stars;
        const revealedCode = revealedCodes[tier.label];
        return (
          <div
            key={tier.label}
            className="glass-card p-4 flex flex-col gap-2"
            style={{ border: unlocked ? '1px solid rgba(232, 130, 107,0.3)' : '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-text-primary text-sm font-semibold">{tier.label}</p>
                <p className="text-text-muted text-xs">{tier.desc}</p>
              </div>
              <span className="text-[var(--terracotta)] text-xs font-mono flex-shrink-0">{tier.stars} ✦</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(to right, var(--terracotta), var(--terracotta))' }}
              />
            </div>
            {unlocked ? (
              revealedCode ? (
                <p className="text-[var(--seafoam)] text-xs font-mono text-center py-1">
                  Code copied: <strong>{revealedCode}</strong>
                </p>
              ) : (
                <button
                  onClick={() => handleClaim(tier.label)}
                  disabled={claiming[tier.label]}
                  className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
                >
                  {claiming[tier.label] ? 'Claiming...' : 'Claim Discount Code'}
                </button>
              )
            ) : (
              <p className="text-text-muted text-xs text-center">
                {tier.stars - balance} more ✦ needed
              </p>
            )}
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
