'use client';

import { useState } from 'react';

const REWARDS_TIERS = [
  { stars: 250, label: 'Free Moon Lamp', desc: 'With your next telescope order', code: 'MOONLAMP25' },
  { stars: 500, label: '10% Telescope Discount', desc: 'On any telescope at astroman.ge', code: 'STELLAR10' },
  { stars: 1000, label: '20% Telescope Discount', desc: 'On any telescope at astroman.ge', code: 'STELLAR20' },
];

export default function StarsRedemption({ starsBalance }: { starsBalance: number }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const handleClaim = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setRevealed(prev => ({ ...prev, [code]: true }));
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      <p className="text-xs text-slate-400">
        You have <span className="text-[#FFD166] font-semibold">{starsBalance} ✦</span> Stars — redeem for rewards at astroman.ge
      </p>
      {REWARDS_TIERS.map(tier => {
        const progress = Math.min((starsBalance / tier.stars) * 100, 100);
        const unlocked = starsBalance >= tier.stars;
        return (
          <div
            key={tier.code}
            className="glass-card p-4 flex flex-col gap-2"
            style={{ border: unlocked ? '1px solid rgba(255,209,102,0.3)' : '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white text-sm font-semibold">{tier.label}</p>
                <p className="text-slate-500 text-xs">{tier.desc}</p>
              </div>
              <span className="text-[#FFD166] text-xs font-mono flex-shrink-0">{tier.stars} ✦</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(to right, #FFD166, #CC9A33)' }}
              />
            </div>
            {unlocked ? (
              revealed[tier.code] ? (
                <p className="text-[#34d399] text-xs font-mono text-center py-1">
                  Code copied: <strong>{tier.code}</strong>
                </p>
              ) : (
                <button
                  onClick={() => handleClaim(tier.code)}
                  className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
                >
                  Claim Discount Code
                </button>
              )
            ) : (
              <p className="text-slate-500 text-xs text-center">
                {tier.stars - starsBalance} more ✦ needed
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
