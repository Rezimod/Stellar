'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import { AuthModal } from '@/components/auth/AuthModal';
import LocationPicker from '@/components/LocationPicker';
import PageContainer from '@/components/layout/PageContainer';
import FeaturedProduct from '@/components/marketplace/FeaturedProduct';
import ProductCard from '@/components/marketplace/ProductCard';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK } from '@/lib/dealers';
import type { Product } from '@/lib/dealers';

type CategoryFilter = 'all' | 'telescope' | 'eyepiece' | 'binocular' | 'accessory';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'telescope', label: 'Telescopes' },
  { key: 'eyepiece', label: 'Eyepieces' },
  { key: 'binocular', label: 'Binoculars' },
  { key: 'accessory', label: 'Accessories' },
];

const SECTION_COPY: Record<string, { label: string; sub: string; color: string }> = {
  beginner:     { label: 'Beginner',    sub: 'First telescope · easy setup',    color: 'var(--seafoam)' },
  intermediate: { label: 'Mid',         sub: 'Step up · more aperture',         color: 'var(--terracotta)' },
  advanced:     { label: 'Advanced',    sub: 'Deep sky · serious gear',         color: 'var(--terracotta)' },
  others:       { label: 'Accessories', sub: 'Eyepieces · binoculars · gear',   color: 'rgba(232,230,221,0.5)' },
  all:          { label: 'All',         sub: 'All gear · sorted by difficulty', color: 'var(--seafoam)' },
};

type RedeemTier = { stars: number; reward: string; detail: string; apiTier: string };

const REDEEM_TIERS: RedeemTier[] = [
  { stars: 250,  reward: '10% off any telescope',   detail: 'Universal',          apiTier: '10% Telescope Discount' },
  { stars: 500,  reward: 'Free Moon Lamp',          detail: 'worth 85 GEL',       apiTier: 'Free Moon Lamp' },
  { stars: 1000, reward: '20% off premium',         detail: 'Bresser, Celestron', apiTier: '20% Telescope Discount' },
];

export default function MarketplacePage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const { location } = useLocation();
  const address = stellarAddress ?? state.walletAddress ?? null;
  const starsBalance = useStarsBalance(address);
  const balance = starsBalance ?? 0;

  const [authOpen, setAuthOpen] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  const dealers = useMemo(() => getDealersByRegion(location.region), [location.region]);
  const showDealer = dealers.length > 1;
  const allProducts = useMemo(() => {
    const list = getProductsByRegion(location.region);
    return list.length > 0 ? list : GLOBAL_FALLBACK;
  }, [location.region]);
  const getDealerName = useCallback(
    (id: string): string => dealers.find(d => d.id === id)?.name ?? id,
    [dealers],
  );

  const inCategory = useMemo(
    () => filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter),
    [allProducts, filter],
  );
  const visible = useMemo(
    () => difficulty === 'all' ? inCategory : inCategory.filter(p => p.skillLevel === difficulty),
    [inCategory, difficulty],
  );

  const featured = useMemo<Product | null>(() => {
    const telescopeScope = filter === 'all' || filter === 'telescope';
    if (!telescopeScope) return null;
    if (difficulty === 'advanced') return null;
    const pool = inCategory.filter(p => p.category === 'telescope');
    if (pool.length === 0) return null;
    if (difficulty === 'all' || difficulty === 'intermediate') {
      const mid = pool.find(p => p.skillLevel === 'intermediate');
      if (mid) return mid;
    }
    if (difficulty === 'all' || difficulty === 'beginner') {
      const beginners = pool.filter(p => p.skillLevel === 'beginner');
      if (beginners.length) return [...beginners].sort((a, b) => b.price - a.price)[0];
    }
    return pool[0] ?? null;
  }, [inCategory, filter, difficulty]);

  const sections = useMemo(() => {
    const remaining = visible.filter(p => !featured || p.id !== featured.id);
    if (remaining.length === 0) return [];

    if (filter === 'eyepiece' || filter === 'binocular' || filter === 'accessory') {
      const cp = SECTION_COPY.all;
      return [{ key: 'flat', label: cp.label, sub: cp.sub, color: cp.color, items: remaining }];
    }
    if (difficulty !== 'all') {
      const cp = SECTION_COPY[difficulty];
      return [{ key: difficulty, label: cp.label, sub: cp.sub, color: cp.color, items: remaining }];
    }
    const beg    = remaining.filter(p => p.skillLevel === 'beginner');
    const mid    = remaining.filter(p => p.skillLevel === 'intermediate');
    const adv    = remaining.filter(p => p.skillLevel === 'advanced');
    const others = remaining.filter(p => !p.skillLevel);
    const groups: { key: string; label: string; sub: string; color: string; items: Product[] }[] = [];
    if (beg.length)    groups.push({ key: 'beginner',     ...SECTION_COPY.beginner,     items: beg });
    if (mid.length)    groups.push({ key: 'intermediate', ...SECTION_COPY.intermediate, items: mid });
    if (adv.length)    groups.push({ key: 'advanced',     ...SECTION_COPY.advanced,     items: adv });
    if (others.length && filter === 'all')
      groups.push({ key: 'others', ...SECTION_COPY.others, items: others });
    return groups;
  }, [visible, featured, filter, difficulty]);

  async function handleRedeem(tier: RedeemTier) {
    if (!authenticated) { setAuthOpen(true); return; }
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
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10">
          {/* Header — one compact row: title + region picker. Stars balance below. */}
          <header className="flex items-center justify-between gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-display font-medium tracking-tight text-[var(--text)]">
              Marketplace
            </h1>
            <LocationPicker compact />
          </header>
          <p className="font-mono text-xs uppercase tracking-wider text-[rgba(232,230,221,0.45)] mb-5">
            Balance · {balance.toLocaleString()} ✦
          </p>

          {/* Category tabs — sticky horizontal scroll */}
          <div className="sticky top-14 z-20 -mx-4 px-4 py-2 mb-4 bg-[var(--canvas)]/85 backdrop-blur-md border-b border-[var(--border)]">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map(c => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className="flex-shrink-0 px-4 py-1.5 text-sm rounded-full transition-colors"
                    style={
                      active
                        ? { background: 'var(--terracotta)', color: 'var(--canvas)' }
                        : { color: 'rgba(232,230,221,0.55)' }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
              <span className="w-px h-4 bg-[var(--border)] mx-1 flex-shrink-0" />
              {(['beginner', 'intermediate', 'advanced'] as const).map(d => {
                const active = difficulty === d;
                const label  = d === 'intermediate' ? 'Mid' : d.charAt(0).toUpperCase() + d.slice(1);
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(active ? 'all' : d)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full transition-colors"
                    style={{
                      border: `1px solid ${active ? 'rgba(94,234,212,0.4)' : 'var(--border)'}`,
                      background: active ? 'rgba(94,234,212,0.08)' : 'transparent',
                      color: active ? 'var(--seafoam)' : 'rgba(232,230,221,0.5)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {featured && (
            <FeaturedProduct product={featured} dealerName={showDealer ? getDealerName(featured.dealerId) : ''} />
          )}

          {sections.length === 0 ? (
            <p className="text-center font-mono text-xs uppercase tracking-wider text-[rgba(232,230,221,0.5)] py-12">
              No items match these filters
            </p>
          ) : (
            sections.map(sec => (
              <section key={sec.key} className="mb-7">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--seafoam)]" />
                  <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[rgba(232,230,221,0.55)]">
                    {sec.label}
                  </span>
                  <span className="ml-auto font-mono text-xs uppercase tracking-wider text-[rgba(232,230,221,0.35)]">
                    {sec.items.length} {sec.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {sec.items.map(p => (
                    <ProductCard key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} />
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Redeem with Stars — moved out of the header. Spaced horizontal scroll
              of code cards with proper rhythm. */}
          <section className="mt-10">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--terracotta)]" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[rgba(232,230,221,0.55)]">
                Redeem with Stars
              </span>
              <span className="ml-auto font-mono text-xs uppercase tracking-wider text-[rgba(232,230,221,0.35)]">
                {balance.toLocaleString()} ✦
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 snap-x snap-mandatory">
              {REDEEM_TIERS.map(tier => {
                const code     = revealedCodes[tier.apiTier];
                const unlocked = balance >= tier.stars;
                const pct      = Math.min(100, Math.round((balance / tier.stars) * 100));
                const remain   = Math.max(0, tier.stars - balance);
                const isClaim  = !!claiming[tier.apiTier];
                return (
                  <div
                    key={tier.apiTier}
                    className="flex-shrink-0 w-[260px] snap-start rounded-2xl p-4 flex flex-col gap-2.5"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${unlocked ? 'rgba(240, 128, 92,0.30)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-semibold text-[var(--terracotta)]">
                        ✦ {tier.stars.toLocaleString()}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-wider text-[rgba(232,230,221,0.4)]">
                        {tier.detail}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--text)]">{tier.reward}</div>
                    <div className="h-[2px] bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
                      <div
                        className="h-full bg-[var(--terracotta)] rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(232,230,221,0.4)]">
                        {unlocked ? 'Earned' : `${remain.toLocaleString()} to go`}
                      </span>
                      {code ? (
                        <span
                          className="font-mono text-xs px-3 py-1 rounded-full"
                          style={{ background: 'rgba(240, 128, 92,0.10)', border: '1px solid rgba(240, 128, 92,0.35)', color: 'var(--terracotta)' }}
                        >
                          {code}
                        </span>
                      ) : unlocked ? (
                        <button
                          onClick={() => handleRedeem(tier)}
                          disabled={isClaim}
                          className="text-xs uppercase tracking-wider font-medium px-3 py-1.5 rounded-full transition-opacity disabled:opacity-60"
                          style={{ background: 'rgba(94,234,212,0.10)', border: '1px solid rgba(94,234,212,0.40)', color: 'var(--seafoam)' }}
                        >
                          {isClaim ? '…' : 'Redeem'}
                        </button>
                      ) : (
                        <span
                          className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full"
                          style={{ border: '1px solid var(--border)', color: 'rgba(232,230,221,0.3)' }}
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
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PageContainer>
  );
}
