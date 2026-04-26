'use client';

import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import { useTranslations } from 'next-intl';
import LocationPicker from '@/components/LocationPicker';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK } from '@/lib/dealers';
import BackButton from '@/components/shared/BackButton';
import ProductCard from '@/components/marketplace/ProductCard';
import PageContainer from '@/components/layout/PageContainer';

type CategoryFilter = 'all' | 'telescope' | 'eyepiece' | 'binocular' | 'accessory';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'telescope', label: 'Telescopes' },
  { key: 'eyepiece', label: 'Eyepieces' },
  { key: 'binocular', label: 'Binoculars' },
  { key: 'accessory', label: 'Accessories' },
];

type RedeemTier = {
  stars: number;
  reward: string;
  sub?: string;
  apiTier: string;
};

const REDEEM_TIERS: RedeemTier[] = [
  { stars: 250, reward: '10% off any telescope', apiTier: '10% Telescope Discount' },
  { stars: 500, reward: 'Free Moon Lamp', sub: 'worth 85 GEL', apiTier: 'Free Moon Lamp' },
  { stars: 1000, reward: '20% off premium telescope', apiTier: '20% Telescope Discount' },
];

const ACCENT = 'var(--accent)';
const ACCENT_SOFT = 'var(--accent-dim)';
const ACCENT_BORDER = 'var(--accent-border)';

export default function MarketplacePage() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { state } = useAppState();
  const { location } = useLocation();
  const t = useTranslations('marketplace');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [starsBalance, setStarsBalance] = useState<number | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [address]);

  const dealers = getDealersByRegion(location.region);
  const allProducts = getProductsByRegion(location.region);
  const showDealer = dealers.length > 1;

  const products = filter === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === filter);

  function getDealerName(dealerId: string): string {
    return dealers.find(d => d.id === dealerId)?.name ?? dealerId;
  }

  const telescopesByTier = {
    beginner: products.filter(p => p.category === 'telescope' && p.skillLevel === 'beginner'),
    intermediate: products.filter(p => p.category === 'telescope' && (p.skillLevel === 'intermediate' || (!p.skillLevel && p.price >= 100 && p.price <= 500))),
    advanced: products.filter(p => p.category === 'telescope' && (p.skillLevel === 'advanced' || (!p.skillLevel && p.price > 500))),
  };
  const nonTelescopes = products.filter(p => p.category !== 'telescope');
  const isTelescopeView = filter === 'all' || filter === 'telescope';

  async function handleRedeem(tier: RedeemTier) {
    if (!address) return;
    setClaiming(prev => ({ ...prev, [tier.apiTier]: true }));
    try {
      const token = await getAccessToken().catch(() => null);
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier: tier.apiTier, walletAddress: address }),
      });
      if (!res.ok) return;
      const { code } = await res.json();
      navigator.clipboard.writeText(code).catch(() => {});
      setRevealedCodes(prev => ({ ...prev, [tier.apiTier]: code }));
    } finally {
      setClaiming(prev => ({ ...prev, [tier.apiTier]: false }));
    }
  }

  return (
    <PageContainer variant="wide" className="py-5 animate-page-enter">
      <BackButton />

      {/* Compact intro — Stellar voice, no Astroman branding */}
      <header className="mt-2 mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: ACCENT, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          >
            {t('title') || 'Shop'}
          </p>
          <h1
            className="text-3xl sm:text-4xl text-white mt-2 leading-tight"
            style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 500 }}
          >
            Real gear. Earned with Stars.
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Telescopes, eyepieces and binoculars from verified partners — redeemable with the Stars you earn observing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Region</span>
          <LocationPicker compact />
        </div>
      </header>

      {/* Stars redemption tiers — compact 3-up */}
      <section className="mb-7">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="text-base font-semibold text-white"
            style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
          >
            Redeem Stars
          </h2>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Codes valid 90 days
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REDEEM_TIERS.map(tier => {
            const balance = starsBalance ?? 0;
            const unlocked = authenticated && balance >= tier.stars;
            const code = revealedCodes[tier.apiTier];
            const isClaiming = !!claiming[tier.apiTier];
            return (
              <div
                key={tier.apiTier}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: unlocked ? `1px solid ${ACCENT_BORDER}` : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <p
                    className="text-lg text-white font-bold leading-none"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                  >
                    {tier.stars.toLocaleString()}
                    <span className="ml-1" style={{ color: ACCENT }}>✦</span>
                  </p>
                  <p className="text-[13px] text-slate-300 mt-1.5 leading-snug">
                    {tier.reward}
                  </p>
                  {tier.sub && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{tier.sub}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {!authenticated ? (
                    <button
                      onClick={login}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      Sign in
                    </button>
                  ) : code ? (
                    <span
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{
                        background: ACCENT_SOFT,
                        border: `1px solid ${ACCENT_BORDER}`,
                        color: '#C4B5FD',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                    >
                      {code}
                    </span>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleRedeem(tier)}
                      disabled={isClaiming}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60"
                      style={{
                        background: ACCENT,
                        color: '#fff',
                      }}
                    >
                      {isClaiming ? '…' : 'Redeem'}
                    </button>
                  ) : (
                    <span
                      className="text-[10px] px-2 py-1 rounded-md"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category filter pills */}
      <div
        className="mb-3 p-1 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex overflow-x-auto scrollbar-hide gap-1">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 flex-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all text-center min-w-[68px]"
              style={
                filter === f.key
                  ? { background: ACCENT_SOFT, color: '#C4B5FD', boxShadow: `inset 0 0 0 1px ${ACCENT_BORDER}` }
                  : { color: 'rgba(255,255,255,0.6)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tier shortcut chips */}
      {isTelescopeView && (
        <div className="flex gap-1.5 mb-5">
          {[
            { id: 'tier-beginner',     label: 'Beginner',     color: 'var(--success)' },
            { id: 'tier-intermediate', label: 'Mid',          color: '#F59E0B' },
            { id: 'tier-advanced',     label: 'Advanced',     color: '#A78BFA' },
          ].map(t => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
              style={{ background: `${t.color}1A`, color: t.color, border: `1px solid ${t.color}40` }}
            >
              {t.label}
            </a>
          ))}
        </div>
      )}

      {/* Product grid — denser: 2 mobile, 3 tablet, 4 desktop */}
      {products.length === 0 && filter !== 'all' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-white font-semibold">
              No {CATEGORY_FILTERS.find(f => f.key === filter)?.label.toLowerCase()} in your region yet.
            </p>
            <button
              onClick={() => setFilter('all')}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ background: ACCENT_SOFT, color: '#C4B5FD', border: `1px solid ${ACCENT_BORDER}` }}
            >
              Show all
            </button>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {GLOBAL_FALLBACK.map(p => (
              <ProductCard key={p.id} product={p} showDealer={false} dealerName="" />
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-white font-semibold text-center py-6">No partners in your region yet.</p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {GLOBAL_FALLBACK.map(p => (
              <ProductCard key={p.id} product={p} showDealer={false} dealerName="" />
            ))}
          </div>
        </div>
      ) : isTelescopeView ? (
        <div className="flex flex-col gap-7">
          {telescopesByTier.beginner.length > 0 && (
            <Tier id="tier-beginner" label="Beginner" sub="First telescope · Easy setup" color="var(--success)">
              {telescopesByTier.beginner.map((p, i) => (
                <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} priority={i === 0} />
              ))}
            </Tier>
          )}
          {telescopesByTier.intermediate.length > 0 && (
            <Tier id="tier-intermediate" label="Intermediate" sub="More aperture · Better optics" color="#F59E0B">
              {telescopesByTier.intermediate.map(p => (
                <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} />
              ))}
            </Tier>
          )}
          {telescopesByTier.advanced.length > 0 && (
            <Tier id="tier-advanced" label="Advanced" sub="GoTo mounts · Deep sky" color="#A78BFA">
              {telescopesByTier.advanced.map(p => (
                <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} />
              ))}
            </Tier>
          )}
          {filter === 'all' && nonTelescopes.length > 0 && (
            <Tier label="Accessories & more" color="rgba(255,255,255,0.35)">
              {nonTelescopes.map(p => (
                <ProductCard key={p.id} product={p} showDealer={showDealer} dealerName={getDealerName(p.dealerId)} />
              ))}
            </Tier>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              showDealer={showDealer}
              dealerName={getDealerName(p.dealerId)}
              priority={i === 0}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Tier({
  id, label, sub, color, children,
}: { id?: string; label: string; sub?: string; color: string; children: React.ReactNode }) {
  return (
    <div id={id}>
      <div className="flex items-center gap-3 mb-3">
        <div style={{ width: 3, height: 16, borderRadius: 2, background: color }} />
        <p className="text-[13px] font-semibold" style={{ color }}>{label}</p>
        {sub && (
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.32)' }}>{sub}</p>
        )}
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
