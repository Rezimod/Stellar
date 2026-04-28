'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import { AuthModal } from '@/components/auth/AuthModal';
import LocationPicker from '@/components/LocationPicker';
import PageContainer from '@/components/layout/PageContainer';
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
  beginner:     { border: 'rgba(52,211,153,0.4)',  bg: 'rgba(52,211,153,0.06)',  color: '#34d399' },
  intermediate: { border: 'rgba(255,209,102,0.4)', bg: 'rgba(255,209,102,0.06)', color: '#FFD166' },
  advanced:     { border: 'rgba(132,101,203,0.4)', bg: 'rgba(132,101,203,0.06)', color: '#8465CB' },
};

const DIFFICULTY_TAG: Record<Exclude<DifficultyFilter, 'all'>, { bg: string; color: string; abbr: string }> = {
  beginner:     { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', abbr: 'Beg' },
  intermediate: { bg: 'rgba(255,209,102,0.12)', color: '#FFD166', abbr: 'Mid' },
  advanced:     { bg: 'rgba(132,101,203,0.12)', color: '#8465CB', abbr: 'Adv' },
};

const SECTION_COPY: Record<string, { label: string; sub: string; color: string }> = {
  beginner:     { label: 'Beginner',    sub: 'First telescope · easy setup', color: '#34d399' },
  intermediate: { label: 'Mid',         sub: 'Step up · more aperture',      color: '#FFD166' },
  advanced:     { label: 'Advanced',    sub: 'Deep sky · serious gear',      color: '#8465CB' },
  others:       { label: 'Accessories', sub: 'Eyepieces · binoculars · gear', color: 'rgba(232,230,221,0.5)' },
  all:          { label: 'All',         sub: 'All gear · sorted by difficulty', color: '#34d399' },
};

type RedeemTier = { stars: number; reward: string; detail: string; apiTier: string };

const REDEEM_TIERS: RedeemTier[] = [
  { stars: 250,  reward: '10% off any telescope',   detail: 'Universal',         apiTier: '10% Telescope Discount' },
  { stars: 500,  reward: 'Free Moon Lamp',          detail: 'worth 85 GEL',      apiTier: 'Free Moon Lamp' },
  { stars: 1000, reward: '20% off premium',         detail: 'Bresser, Celestron', apiTier: '20% Telescope Discount' },
];

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

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

  // Featured pick: only when telescopes are in scope and difficulty allows it
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

  // Build sections for the grid below the featured card
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
          {/* 1. Crumb */}
          <button
            onClick={() => router.back()}
            className="block text-[9px] tracking-[0.22em] uppercase text-[rgba(232,230,221,0.4)] hover:text-[rgba(232,230,221,0.7)] transition-colors mb-[18px]"
          >
            ‹ Back · Marketplace
          </button>

          {/* 2. Header strip */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 pb-[14px] mb-[14px] border-b border-[rgba(232,230,221,0.1)]">
            <div className="flex items-baseline gap-3">
              <span className="text-[9px] tracking-[0.24em] uppercase text-[#34d399] font-medium">04</span>
              <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[#E8E6DD] leading-none">
                Marketplace<span className="text-[#FFD166]">.</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-baseline gap-1.5 text-[10px] uppercase">
                <span className="tracking-[0.14em] text-[rgba(232,230,221,0.35)]">Balance</span>
                <span className="font-medium text-[#FFD166]">{balance.toLocaleString()}</span>
                <span className="text-[#FFD166] opacity-70">✦</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] uppercase">
                <span className="tracking-[0.14em] text-[rgba(232,230,221,0.35)]">Region</span>
                <LocationPicker compact />
              </span>
              <span className="flex items-baseline gap-1.5 text-[10px] uppercase">
                <span className="tracking-[0.14em] text-[rgba(232,230,221,0.35)]">Codes</span>
                <span className="font-medium text-[#E8E6DD]">90d</span>
              </span>
            </div>
          </header>

          {/* 3. Redeem rail */}
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
                    background: unlocked ? 'rgba(255,209,102,0.04)' : 'rgba(255,255,255,0.015)',
                    border: unlocked
                      ? '0.5px solid rgba(255,209,102,0.4)'
                      : '0.5px solid rgba(232,230,221,0.08)',
                  }}
                >
                  <span className="flex items-baseline whitespace-nowrap text-[13px] font-semibold tracking-[0.02em] text-[#FFD166]">
                    <span className="text-[10px] opacity-70 mr-[3px]">✦</span>
                    {tier.stars}
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] text-[#E8E6DD] truncate">{tier.reward}</span>
                    <span className="text-[9px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.4)] truncate">{l2}</span>
                    <div className="h-[2px] bg-[rgba(232,230,221,0.05)] rounded-[1px] overflow-hidden mt-[3px]">
                      <div
                        className="h-full bg-[#FFD166] rounded-[1px]"
                        style={{
                          width: `${pct}%`,
                          boxShadow: unlocked ? '0 0 6px rgba(255,209,102,0.8)' : undefined,
                        }}
                      />
                    </div>
                  </div>
                  {code ? (
                    <span
                      className="text-[9px] tracking-[0.12em] font-semibold px-[10px] py-[5px] rounded-full"
                      style={{ background: 'rgba(255,209,102,0.1)', border: '0.5px solid rgba(255,209,102,0.4)', color: '#FFD166' }}
                    >
                      {code}
                    </span>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleRedeem(tier)}
                      disabled={isClaim}
                      className="text-[9px] tracking-[0.16em] uppercase font-medium px-[10px] py-[5px] rounded-full transition-opacity disabled:opacity-60"
                      style={{ background: 'rgba(52,211,153,0.12)', border: '0.5px solid rgba(52,211,153,0.5)', color: '#34d399' }}
                    >
                      {isClaim ? '…' : 'Redeem'}
                    </button>
                  ) : (
                    <span
                      className="text-[9px] tracking-[0.16em] uppercase font-medium px-[10px] py-[5px] rounded-full whitespace-nowrap"
                      style={{ border: '0.5px solid rgba(232,230,221,0.1)', color: 'rgba(232,230,221,0.3)' }}
                    >
                      Locked
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Filter row */}
          <div className="flex items-center gap-[4px] p-[5px] rounded-full mb-[18px] overflow-x-auto"
               style={{ background: 'rgba(255,255,255,0.015)', border: '0.5px solid rgba(232,230,221,0.06)' }}>
            {CATEGORIES.map(c => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className={`px-[14px] py-[7px] text-[10px] tracking-[0.12em] uppercase rounded-full whitespace-nowrap transition-colors ${
                    active ? 'font-semibold' : ''
                  }`}
                  style={
                    active
                      ? { background: 'rgba(255,209,102,0.1)', color: '#FFD166' }
                      : { color: 'rgba(232,230,221,0.5)' }
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
                  className="px-[10px] py-[6px] text-[9px] tracking-[0.16em] uppercase font-medium rounded-full whitespace-nowrap transition-colors"
                  style={{
                    border: `0.5px solid ${active ? tone.border : 'rgba(232,230,221,0.08)'}`,
                    background: active ? tone.bg : 'transparent',
                    color: active ? tone.color : 'rgba(232,230,221,0.5)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 5. Featured product */}
          {featured && (
            <FeaturedCard product={featured} dealerName={showDealer ? getDealerName(featured.dealerId) : ''} />
          )}

          {/* 6 + 7. Sections + grid */}
          {sections.length === 0 ? (
            <p className="text-center text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.5)] py-12">
              No items match these filters
            </p>
          ) : (
            sections.map(sec => (
              <section key={sec.key} className="mb-7">
                <div className="flex items-baseline gap-3 mb-[10px] pb-2 border-b border-[rgba(232,230,221,0.06)]">
                  <span className="text-[9px] tracking-[0.24em] uppercase font-semibold" style={{ color: sec.color }}>
                    {sec.label}
                  </span>
                  <span className="text-[10px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.4)]">
                    {sec.sub}
                  </span>
                  <span className="ml-auto text-[9px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.35)]">
                    {sec.items.length} {sec.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[8px]">
                  {sec.items.map(p => (
                    <ProductCardMono key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} />
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

const FEATURED_SPEC_KEYS = ['aperture', 'focal', 'mount', 'weight'] as const;

function FeaturedCard({ product, dealerName }: { product: Product; dealerName: string }) {
  const specs = product.specs ?? {};
  const rows = FEATURED_SPEC_KEYS
    .map(k => ({ key: k, value: specs[k] }))
    .filter((r): r is { key: typeof FEATURED_SPEC_KEYS[number]; value: string } => !!r.value);
  const meta = [dealerName, product.category, specs.aperture]
    .filter(Boolean)
    .map(s => String(s).toUpperCase())
    .join(' · ');

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-[14px] mb-[22px] p-4 rounded-xl overflow-hidden"
      style={{
        border: '0.5px solid rgba(255,209,102,0.2)',
        background:
          'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(255,209,102,0.06) 0%, transparent 60%), rgba(255,255,255,0.01)',
      }}
    >
      <span className="absolute top-3 right-[14px] text-[8px] tracking-[0.3em] font-semibold text-[rgba(255,209,102,0.5)]">
        FEATURED
      </span>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          aspectRatio: '1.4',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,209,102,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '0.5px solid rgba(232,230,221,0.05)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            style={{ objectFit: 'contain', padding: '24px' }}
            unoptimized
            priority
          />
        )}
      </div>

      <div className="flex flex-col justify-between py-1">
        <div>
          <p className="text-[8px] tracking-[0.24em] uppercase font-semibold text-[#FFD166] mb-[6px]">Editor&rsquo;s Pick</p>
          <h2 className="text-[18px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#E8E6DD] mb-[4px]">
            {product.name}
          </h2>
          {meta && (
            <p className="text-[10px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.5)] mb-3">{meta}</p>
          )}

          {rows.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-[14px] gap-y-[6px] py-[10px] mb-[14px]"
                 style={{ borderTop: '0.5px solid rgba(232,230,221,0.06)', borderBottom: '0.5px solid rgba(232,230,221,0.06)' }}>
              {rows.map(r => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span className="text-[10px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.4)]">{r.key}</span>
                  <span className="text-[10px] font-medium text-[#E8E6DD] truncate">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] leading-[1.4] text-[rgba(232,230,221,0.6)] py-[10px] mb-[14px] line-clamp-3"
               style={{ borderTop: '0.5px solid rgba(232,230,221,0.06)', borderBottom: '0.5px solid rgba(232,230,221,0.06)' }}>
              {product.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-end gap-3">
          <div>
            <p className="text-[22px] font-bold leading-none tracking-[-0.01em] text-[#FFD166]">
              {formatPrice(product)}
            </p>
            <p className="text-[9px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.4)] mt-[4px]">
              ✦ {product.starsPrice.toLocaleString()} stars
            </p>
          </div>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#FFD166] text-[#1a1208] px-[18px] py-[9px] rounded-full text-[10px] font-bold tracking-[0.18em] uppercase hover:opacity-90 transition-opacity"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}

function ProductCardMono({ product, dealerName }: { product: Product; dealerName: string }) {
  const tag = product.skillLevel ? DIFFICULTY_TAG[product.skillLevel] : null;
  return (
    <a
      href={product.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block rounded-lg p-[10px] transition-colors"
      style={{
        background: 'rgba(255,255,255,0.015)',
        border: '0.5px solid rgba(232,230,221,0.07)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,209,102,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,221,0.07)'; }}
    >
      {tag && (
        <span
          className="absolute top-[7px] left-[7px] z-10 px-[6px] py-[2px] rounded-[3px] text-[7px] tracking-[0.18em] uppercase font-semibold"
          style={{ background: tag.bg, color: tag.color }}
        >
          {tag.abbr}
        </span>
      )}
      <div
        className="relative w-full aspect-[1.3] rounded-md mb-2 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,209,102,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            style={{ objectFit: 'contain', padding: '14px' }}
            unoptimized
          />
        )}
      </div>
      <p className="text-[11px] font-medium text-[#E8E6DD] leading-[1.2] truncate mb-[2px]">
        {product.name}
      </p>
      <p className="text-[8px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.4)] mb-[6px] truncate">
        {dealerName || product.category}
      </p>
      <div className="flex justify-between items-center pt-[6px]" style={{ borderTop: '0.5px solid rgba(232,230,221,0.06)' }}>
        <span className="text-[11px] font-semibold text-[#FFD166]">{formatPrice(product)}</span>
        <span className="text-[8px] tracking-[0.14em] uppercase text-[rgba(255,209,102,0.5)]">
          ✦ {product.starsPrice.toLocaleString()}
        </span>
      </div>
    </a>
  );
}
