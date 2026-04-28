'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
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
  const { getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const [authOpen, setAuthOpen] = useState(false);
  const { location } = useLocation();
  const t = useTranslations('marketplace');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [starsBalance, setStarsBalance] = useState<number | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const address = stellarAddress ?? state.walletAddress ?? null;
  const [balanceTick, setBalanceTick] = useState(0);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [address, balanceTick]);

  // Refresh after WalletSync mints missing stars to a freshly-connected wallet.
  useEffect(() => {
    const handler = () => setBalanceTick((t) => t + 1);
    window.addEventListener('stellar:stars-synced', handler);
    return () => window.removeEventListener('stellar:stars-synced', handler);
  }, []);

  const dealers = useMemo(() => getDealersByRegion(location.region), [location.region]);
  const allProducts = useMemo(() => getProductsByRegion(location.region), [location.region]);
  const showDealer = dealers.length > 1;

  const products = useMemo(
    () => (filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter)),
    [allProducts, filter],
  );

  const getDealerName = useCallback(
    (dealerId: string): string => dealers.find(d => d.id === dealerId)?.name ?? dealerId,
    [dealers],
  );

  const telescopesByTier = useMemo(() => {
    const beginner: typeof products = [];
    const intermediate: typeof products = [];
    const advanced: typeof products = [];
    for (const p of products) {
      if (p.category !== 'telescope') continue;
      if (p.skillLevel === 'beginner') beginner.push(p);
      else if (p.skillLevel === 'intermediate' || (!p.skillLevel && p.price >= 100 && p.price <= 500)) intermediate.push(p);
      else if (p.skillLevel === 'advanced' || (!p.skillLevel && p.price > 500)) advanced.push(p);
    }
    return { beginner, intermediate, advanced };
  }, [products]);
  const nonTelescopes = useMemo(() => products.filter(p => p.category !== 'telescope'), [products]);
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

      {/* Hero with subtle teal radial overlay */}
      <header
        className="relative mt-2 mb-6 flex items-end justify-between gap-4 flex-wrap rounded-[var(--radius-xl)] p-6 md:p-8 overflow-hidden"
        style={{
          background: 'var(--gradient-radial-teal), var(--color-bg-card)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <div>
          <p
            className="text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: 'var(--color-accent-teal)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          >
            {t('title') || 'Shop'}
          </p>
          <h1
            className="text-3xl sm:text-4xl text-white mt-2 leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.025em' }}
          >
            Real gear. Earned with Stars.
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Telescopes, eyepieces and binoculars from verified partners — redeemable with the Stars you earn observing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Region</span>
          <LocationPicker compact />
        </div>
      </header>

      {/* Stars redemption tiers — compact 3-up, feature-card surface */}
      <section className="mb-7">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="text-base font-bold text-white"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          >
            Redeem Stars
          </h2>
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
                className="flex items-center gap-4 p-6 md:p-8 rounded-[var(--radius-xl)] transition-all duration-200 hover:bg-[var(--color-bg-card-hover)]"
                style={{
                  background: 'var(--color-bg-card)',
                  border: unlocked
                    ? '1px solid rgba(255, 209, 102, 0.30)'
                    : '1px solid var(--color-border-subtle)',
                }}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <p
                    className="text-2xl text-white font-bold leading-none stars-amount"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                  >
                    <span style={{ color: 'var(--color-accent-gold)' }}>✦</span>
                    <span className="ml-1.5" style={{ color: 'var(--color-accent-gold)' }}>
                      {tier.stars.toLocaleString()}
                    </span>
                  </p>
                  <p className="text-[13px] text-slate-300 mt-2 leading-snug">
                    {tier.reward}
                  </p>
                  {tier.sub && (
                    <p className="text-[12px] text-slate-500 mt-1">{tier.sub}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {!authenticated ? (
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="px-5 py-2.5 rounded-full text-sm font-medium text-slate-200 bg-transparent border border-[var(--color-border-medium)] transition-all duration-200 hover:border-[var(--color-border-strong)] hover:text-white hover:bg-white/[0.04]"
                    >
                      Sign in
                    </button>
                  ) : code ? (
                    <span
                      className="px-3 py-1.5 rounded-full text-[12px] font-bold"
                      style={{
                        background: 'rgba(255, 209, 102, 0.10)',
                        border: '1px solid rgba(255, 209, 102, 0.30)',
                        color: 'var(--color-accent-gold)',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                    >
                      {code}
                    </span>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleRedeem(tier)}
                      disabled={isClaiming}
                      className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                      style={{
                        background: 'var(--gradient-primary)',
                        boxShadow: 'var(--shadow-glow-teal)',
                      }}
                    >
                      {isClaiming ? '…' : 'Redeem'}
                    </button>
                  ) : (
                    <span
                      className="text-[12px] px-3 py-1.5 rounded-full"
                      style={{
                        background: 'var(--color-bg-card-strong)',
                        color: 'var(--color-text-faint)',
                        border: '1px solid var(--color-border-subtle)',
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
        <div className="flex gap-2 mb-5">
          {[
            { id: 'tier-beginner',     label: 'Beginner',     bg: 'rgba(52, 211, 153, 0.10)',  border: 'rgba(52, 211, 153, 0.35)',  color: 'var(--color-success)' },
            { id: 'tier-intermediate', label: 'Mid',          bg: 'rgba(245, 158, 11, 0.10)',  border: 'rgba(245, 158, 11, 0.35)',  color: '#F59E0B' },
            { id: 'tier-advanced',     label: 'Advanced',     bg: 'rgba(167, 139, 250, 0.10)', border: 'rgba(167, 139, 250, 0.35)', color: '#A78BFA' },
          ].map(t => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="text-[12px] px-3 py-1 rounded-full font-semibold uppercase tracking-wide transition-colors"
              style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
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
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PageContainer>
  );
}

function Tier({
  id, label, sub, color, children,
}: { id?: string; label: string; sub?: string; color: string; children: React.ReactNode }) {
  return (
    <div id={id}>
      <div className="flex items-baseline gap-3 mb-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            color,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
        )}
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
