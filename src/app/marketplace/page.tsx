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

const DIFFICULTY_TONE: Record<Exclude<DifficultyFilter, 'all'>, { border: string; bg: string; color: string }> = {
  beginner:     { border: 'rgba(94, 234, 212,0.4)',  bg: 'rgba(94, 234, 212,0.06)',  color: 'var(--seafoam)' },
  intermediate: { border: 'rgba(255, 209, 102,0.4)', bg: 'rgba(255, 209, 102,0.06)', color: 'var(--terracotta)' },
  advanced:     { border: 'rgba(255, 209, 102,0.4)', bg: 'rgba(255, 209, 102,0.06)', color: 'var(--terracotta)' },
};

const SECTION_COPY: Record<string, { label: string; sub: string; color: string }> = {
  beginner:     { label: 'Beginner',    sub: 'First telescope · easy setup',    color: 'var(--seafoam)' },
  intermediate: { label: 'Mid',         sub: 'Step up · more aperture',         color: 'var(--terracotta)' },
  advanced:     { label: 'Advanced',    sub: 'Deep sky · serious gear',         color: 'var(--terracotta)' },
  others:       { label: 'Accessories', sub: 'Eyepieces · binoculars · gear',   color: 'rgba(232,230,221,0.75)' },
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
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10">
          <button
            onClick={() => router.back()}
            className="block text-[10px] tracking-[0.22em] uppercase text-[rgba(232,230,221,0.65)] hover:text-[#E8E6DD] transition-colors mb-[18px]"
          >
            ‹ Back · Marketplace
          </button>

          <header className="flex flex-col items-center gap-3 pb-[14px] mb-[14px] border-b border-[rgba(232,230,221,0.1)] text-center">
            <div className="flex items-baseline justify-center gap-3">
              <span className="text-[10px] tracking-[0.24em] uppercase text-[var(--seafoam)] font-medium">04</span>
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#E8E6DD] leading-none">
                Marketplace<span className="text-[var(--terracotta)]">.</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <span
                className="inline-flex items-center gap-[7px] px-[14px] py-[7px] rounded-full text-[11px] uppercase backdrop-blur-md"
                style={{
                  background: 'rgba(94, 234, 212, 0.10)',
                  border: '1.5px solid rgba(94, 234, 212, 0.40)',
                }}
              >
                <span className="tracking-[0.14em] text-[rgba(232,230,221,0.7)]">Balance</span>
                <span className="font-semibold text-[var(--seafoam)]">{balance.toLocaleString()}</span>
                <span className="text-[var(--seafoam)]">✦</span>
              </span>
              <span className="inline-flex items-center gap-[7px] text-[11px] uppercase">
                <span className="tracking-[0.14em] text-[rgba(232,230,221,0.7)]">Region</span>
                <LocationPicker compact />
              </span>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-[6px] mb-[18px] overflow-x-auto">
            {REDEEM_TIERS.map(tier => {
              const code     = revealedCodes[tier.apiTier];
              const unlocked = balance >= tier.stars;
              const pct      = Math.min(100, Math.round((balance / tier.stars) * 100));
              const remain   = Math.max(0, tier.stars - balance);
              const isClaim  = !!claiming[tier.apiTier];
              const l2 = unlocked ? `${tier.detail} · earned` : `${pct}% · ${remain.toLocaleString()} to go`;
              return (
                <div
                  key={tier.apiTier}
                  className="flex items-center gap-2.5 px-3 py-[10px] rounded-lg min-w-[180px]"
                  style={{
                    background: unlocked ? 'rgba(255, 209, 102,0.04)' : 'rgba(255,255,255,0.015)',
                    border: unlocked ? '0.5px solid rgba(255, 209, 102,0.4)' : '0.5px solid rgba(232,230,221,0.08)',
                  }}
                >
                  <span className="flex items-baseline whitespace-nowrap text-[14px] font-semibold tracking-[0.02em] text-[var(--terracotta)]">
                    <span className="text-[11px] opacity-70 mr-[3px]">✦</span>
                    {tier.stars}
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[12px] text-[#E8E6DD] truncate">{tier.reward}</span>
                    <span className="text-[10px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.65)] truncate">{l2}</span>
                    <div className="h-[2px] bg-[rgba(232,230,221,0.08)] rounded-[1px] overflow-hidden mt-[3px]">
                      <div
                        className="h-full bg-[var(--terracotta)] rounded-[1px]"
                        style={{ width: `${pct}%`, boxShadow: unlocked ? '0 0 6px rgba(255, 209, 102,0.8)' : undefined }}
                      />
                    </div>
                  </div>
                  {code ? (
                    <span
                      className="text-[10px] tracking-[0.12em] font-semibold px-[10px] py-[5px] rounded-full"
                      style={{ background: 'rgba(255, 209, 102,0.1)', border: '0.5px solid rgba(255, 209, 102,0.4)', color: 'var(--terracotta)' }}
                    >
                      {code}
                    </span>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleRedeem(tier)}
                      disabled={isClaim}
                      className="text-[10px] tracking-[0.16em] uppercase font-medium px-[10px] py-[5px] rounded-full transition-opacity disabled:opacity-60"
                      style={{ background: 'rgba(94, 234, 212,0.12)', border: '0.5px solid rgba(94, 234, 212,0.5)', color: 'var(--seafoam)' }}
                    >
                      {isClaim ? '…' : 'Redeem'}
                    </button>
                  ) : (
                    <span
                      className="text-[10px] tracking-[0.16em] uppercase font-medium px-[10px] py-[5px] rounded-full whitespace-nowrap"
                      style={{ border: '0.5px solid rgba(232,230,221,0.18)', color: 'rgba(232,230,221,0.55)' }}
                    >
                      Locked
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="flex items-center gap-[4px] p-[5px] rounded-full mb-[18px] overflow-x-auto"
            style={{ background: 'rgba(255,255,255,0.015)', border: '0.5px solid rgba(232,230,221,0.06)' }}
          >
            {CATEGORIES.map(c => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className={`px-[14px] py-[7px] text-[11px] tracking-[0.12em] uppercase rounded-full whitespace-nowrap transition-colors ${
                    active ? 'font-semibold' : ''
                  }`}
                  style={
                    active
                      ? { background: 'rgba(255, 209, 102,0.1)', color: 'var(--terracotta)' }
                      : { color: 'rgba(232,230,221,0.75)' }
                  }
                >
                  {c.label}
                </button>
              );
            })}
            <span className="w-px h-[14px] bg-[rgba(232,230,221,0.1)] mx-1 flex-shrink-0" />
            {(['beginner', 'intermediate', 'advanced'] as const).map(d => {
              const active = difficulty === d;
              const tone   = DIFFICULTY_TONE[d];
              const label  = d === 'intermediate' ? 'Mid' : d.charAt(0).toUpperCase() + d.slice(1);
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(active ? 'all' : d)}
                  className="px-[10px] py-[6px] text-[10px] tracking-[0.16em] uppercase font-medium rounded-full whitespace-nowrap transition-colors"
                  style={{
                    border: `0.5px solid ${active ? tone.border : 'rgba(232,230,221,0.18)'}`,
                    background: active ? tone.bg : 'transparent',
                    color: active ? tone.color : 'rgba(232,230,221,0.75)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {featured && (
            <FeaturedProduct product={featured} dealerName={showDealer ? getDealerName(featured.dealerId) : ''} />
          )}

          {sections.length === 0 ? (
            <p className="text-center text-[12px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] py-12">
              No items match these filters
            </p>
          ) : (
            sections.map(sec => (
              <section key={sec.key} className="mb-7">
                <div className="flex items-baseline gap-3 mb-[10px] pb-2 border-b border-[rgba(232,230,221,0.1)]">
                  <span className="text-[10px] tracking-[0.24em] uppercase font-semibold" style={{ color: sec.color }}>
                    {sec.label}
                  </span>
                  <span className="text-[11px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.65)]">
                    {sec.sub}
                  </span>
                  <span className="ml-auto text-[10px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.6)]">
                    {sec.items.length} {sec.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[8px]">
                  {sec.items.map(p => (
                    <ProductCard key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PageContainer>
  );
}
