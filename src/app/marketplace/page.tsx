'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import LocationPicker from '@/components/LocationPicker';
import PageContainer from '@/components/layout/PageContainer';
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

type SkillKey = Exclude<DifficultyFilter, 'all'>;

const SKILL_META: Record<SkillKey, { label: string; level: 1 | 2 | 3; activeColor: string }> = {
  beginner:     { label: 'Beginner', level: 1, activeColor: 'var(--seafoam)' },
  intermediate: { label: 'Mid',      level: 2, activeColor: 'var(--terracotta)' },
  advanced:     { label: 'Advanced', level: 3, activeColor: 'var(--terracotta)' },
};

const SKILL_BARS = (level: 1 | 2 | 3, color: string) => (
  <span className="inline-flex items-end gap-[2px] mr-[2px]" aria-hidden="true">
    {[1, 2, 3].map(i => (
      <span
        key={i}
        style={{
          width: 2,
          height: 4 + i * 2,
          borderRadius: 1,
          background: i <= level ? color : 'currentColor',
          opacity: i <= level ? 1 : 0.28,
        }}
      />
    ))}
  </span>
);

interface BuyingGuide {
  id: string;
  title: string;
  copy: string;
  category: CategoryFilter;
  skill: DifficultyFilter;
}

const BUYING_GUIDES: BuyingGuide[] = [
  {
    id: 'moon-planets',
    title: 'Moon & planets',
    copy: 'Bright, dependable targets. A small refractor and an alt-az mount get you craters and Saturn’s rings on night one.',
    category: 'telescope',
    skill: 'beginner',
  },
  {
    id: 'deep-sky',
    title: 'Galaxies & nebulae',
    copy: 'Deeper sky needs more aperture and a darker site. Step up to a Dobsonian or a mid Newtonian on an EQ mount.',
    category: 'telescope',
    skill: 'intermediate',
  },
  {
    id: 'astrophoto',
    title: 'Astrophotography',
    copy: 'Tracking mount, long exposures, patient framing. Specialised optics and accessories — start with a sturdy GoTo.',
    category: 'telescope',
    skill: 'advanced',
  },
];

export default function MarketplacePage() {
  const { address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const { location } = useLocation();
  const address = stellarAddress ?? state.walletAddress ?? null;
  const starsBalance = useStarsBalance(address);
  const balance = starsBalance ?? 0;

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);

  useEffect(() => {
    fetch('/api/price/sol')
      .then(r => r.json())
      .then(d => {
        setSolPerGEL(d.solPerGEL ?? 0);
        setSolPriceUsd(d.solPrice ?? 0);
      })
      .catch(() => {});
  }, []);

  const dealers = useMemo(() => getDealersByRegion(location.region), [location.region]);
  const showDealer = dealers.length > 1;
  const regionProducts = useMemo(() => {
    const list = getProductsByRegion(location.region);
    return list.length > 0 ? list : GLOBAL_FALLBACK;
  }, [location.region]);
  const allProducts = useMemo(() => regionProducts.filter(p => p.kind !== 'stars-only'), [regionProducts]);
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

  const orderedVisible = useMemo(() => {
    if (!featured) return visible;
    const rest = visible.filter(p => p.id !== featured.id);
    return [featured, ...rest];
  }, [visible, featured]);

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10">
          {/* Compact toolbar: filters left, balance + region right. Single row at sm+, stacked on mobile. */}
          <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center sm:justify-between sm:gap-[12px] mb-[14px] sm:mb-[18px]">
            {/* Filter chips — horizontal scroll on mobile, inline on desktop */}
            <div
              className="order-2 sm:order-1 flex items-center gap-[6px] flex-nowrap overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {CATEGORIES.map(c => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className="flex-shrink-0 h-[30px] px-[11px] text-[11px] tracking-[0.08em] uppercase rounded-md whitespace-nowrap transition-[background,color,border-color] duration-150"
                    style={
                      active
                        ? {
                            background: 'var(--terracotta)',
                            color: '#1a1208',
                            border: '1px solid var(--terracotta)',
                            fontWeight: 700,
                          }
                        : {
                            color: 'rgba(232,230,221,0.78)',
                            border: '1px solid rgba(232,230,221,0.14)',
                            background: 'rgba(15,18,28,0.45)',
                            fontWeight: 500,
                          }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
              <span className="w-px h-[18px] bg-[rgba(232,230,221,0.14)] mx-[4px] flex-shrink-0" />
              {(['beginner', 'intermediate', 'advanced'] as const).map(d => {
                const active = difficulty === d;
                const meta   = SKILL_META[d];
                const barColor = active ? '#1a1208' : meta.activeColor;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(active ? 'all' : d)}
                    className="flex-shrink-0 inline-flex items-center gap-[7px] h-[30px] pl-[9px] pr-[12px] text-[10.5px] tracking-[0.1em] uppercase rounded-full whitespace-nowrap transition-[background,color,border-color] duration-150"
                    style={
                      active
                        ? {
                            background: meta.activeColor,
                            color: '#1a1208',
                            border: `1px solid ${meta.activeColor}`,
                            fontWeight: 700,
                          }
                        : {
                            color: 'rgba(232,230,221,0.78)',
                            border: '1px dashed rgba(232,230,221,0.22)',
                            background: 'transparent',
                            fontWeight: 500,
                          }
                    }
                  >
                    {SKILL_BARS(meta.level, barColor)}
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Balance + Region — compact, matching toolbar height */}
            <div className="order-1 sm:order-2 flex items-center justify-end gap-[6px] flex-shrink-0">
              <span
                className="inline-flex items-center h-[30px] gap-[6px] px-[10px] rounded-md text-[10.5px] uppercase cursor-default"
                style={{
                  background: 'rgba(15, 18, 28, 0.55)',
                  border: '1px solid rgba(167, 139, 250, 0.32)',
                }}
              >
                <span className="tracking-[0.1em] text-[rgba(232,230,221,0.55)] text-[9.5px]">Bal</span>
                <span className="font-semibold tabular-nums tracking-[0.02em] text-[12px]" style={{ color: '#8B5CF6' }}>
                  {balance.toLocaleString()}
                </span>
                <span style={{ color: '#8B5CF6' }} className="text-[11px] leading-none">★</span>
              </span>
              <LocationPicker compact />
            </div>
          </div>

          {orderedVisible.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px] sm:gap-[16px]">
              {orderedVisible.map(p => {
                const isFeatured = featured?.id === p.id;
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    dealerName={showDealer ? getDealerName(p.dealerId) : ''}
                    solPerGEL={solPerGEL}
                    solPriceUsd={solPriceUsd}
                    featured={isFeatured}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[13px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] py-12">
              No items match these filters
            </p>
          )}

          {/* Buying guide — sits under the catalogue, helps newcomers narrow the shop. */}
          <section className="mt-[36px] sm:mt-[52px]">
            <div className="flex items-baseline justify-between mb-[16px]">
              <h2
                className="font-serif text-[18px] sm:text-[20px] tracking-[-0.005em] text-[#F8F4EC]"
                style={{ fontWeight: 600 }}
              >
                Not sure where to start?
              </h2>
              <p className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-[rgba(232,230,221,0.5)]">
                Pick a goal · we narrow the shop
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[14px]">
              {BUYING_GUIDES.map(g => {
                const meta = SKILL_META[g.skill as SkillKey];
                return (
                  <button
                    key={g.id}
                    onClick={() => { setFilter(g.category); setDifficulty(g.skill); }}
                    className="group text-left rounded-xl p-[16px] transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
                    style={{
                      background: 'rgba(232,230,221,0.035)',
                      border: '1px solid rgba(232,230,221,0.10)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 179, 71,0.32)';
                      e.currentTarget.style.background = 'rgba(232,230,221,0.06)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(232,230,221,0.10)';
                      e.currentTarget.style.background = 'rgba(232,230,221,0.035)';
                    }}
                  >
                    <div className="flex items-center gap-[8px] mb-[10px]">
                      {SKILL_BARS(meta.level, meta.activeColor)}
                      <span
                        className="text-[10px] tracking-[0.18em] uppercase font-semibold"
                        style={{ color: meta.activeColor }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[15px] font-semibold text-[#F8F4EC] mb-[6px] leading-[1.25]">
                      {g.title}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-[rgba(232,230,221,0.7)]">
                      {g.copy}
                    </p>
                    <p className="mt-[12px] text-[10.5px] tracking-[0.18em] uppercase font-semibold text-[rgba(232,230,221,0.55)] group-hover:text-[var(--terracotta)] transition-colors">
                      Browse picks →
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
