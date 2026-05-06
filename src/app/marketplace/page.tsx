'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
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
  beginner:     { border: 'rgba(94, 234, 212,0.45)',  bg: 'rgba(94, 234, 212,0.10)',  color: 'var(--seafoam)' },
  intermediate: { border: 'rgba(255, 209, 102,0.45)', bg: 'rgba(255, 209, 102,0.10)', color: 'var(--terracotta)' },
  advanced:     { border: 'rgba(255, 209, 102,0.45)', bg: 'rgba(255, 209, 102,0.10)', color: 'var(--terracotta)' },
};

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

  const remaining = useMemo(
    () => visible.filter(p => !featured || p.id !== featured.id),
    [visible, featured],
  );
  const SIDEBAR_COUNT = 6;
  const sidebarProducts = remaining.slice(0, SIDEBAR_COUNT);
  const overflowProducts = remaining.slice(SIDEBAR_COUNT);

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10">
          {/* Mobile: balance/region row above a horizontal-scroll filter strip. Desktop: filters left, balance/region right. */}
          <div className="flex flex-col gap-[10px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-[12px] sm:gap-y-[10px] sm:justify-between mb-[14px] sm:mb-[20px]">
            {/* Balance + Region — first on mobile so it's compact above the filter strip */}
            <div className="order-1 sm:order-2 flex items-center gap-[8px] flex-shrink-0">
              <span
                className="inline-flex items-center gap-[7px] px-[12px] py-[7px] sm:gap-[8px] sm:px-[14px] sm:py-[9px] rounded-lg text-[12px] uppercase cursor-default"
                style={{
                  background: 'rgba(15, 18, 28, 0.72)',
                  border: '1px solid rgba(167, 139, 250, 0.42)',
                  boxShadow: 'inset 0 1px 0 rgba(167, 139, 250, 0.10), 0 1px 0 rgba(0,0,0,0.25)',
                }}
              >
                <span className="tracking-[0.16em] text-[rgba(232,230,221,0.6)] text-[10px]">Balance</span>
                <span className="font-semibold tracking-[0.04em] text-[13px]" style={{ color: '#A78BFA' }}>
                  {balance.toLocaleString()}
                </span>
                <span style={{ color: '#A78BFA' }} className="text-[12px]">★</span>
              </span>

              <span
                className="inline-flex items-center gap-[8px] pl-[10px] pr-[4px] py-[3px] sm:gap-[10px] sm:pl-[12px] sm:pr-[5px] sm:py-[4px] rounded-lg"
                style={{
                  background: 'rgba(15, 18, 28, 0.72)',
                  border: '1px solid rgba(232,230,221,0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.25)',
                }}
              >
                <span className="tracking-[0.16em] uppercase text-[rgba(232,230,221,0.6)] text-[10px]">Region</span>
                <LocationPicker compact />
              </span>
            </div>

            {/* Filter chips — horizontal scroll on mobile, wrap on desktop */}
            <div
              className="order-2 sm:order-1 flex items-center gap-[8px] flex-nowrap overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
            {CATEGORIES.map(c => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className="flex-shrink-0 px-[14px] py-[8px] sm:px-[18px] sm:py-[10px] text-[11px] sm:text-[12px] tracking-[0.14em] uppercase rounded-lg whitespace-nowrap transition-[filter,transform,background,color,border-color] duration-200 hover:brightness-110"
                  style={
                    active
                      ? {
                          background: 'var(--terracotta)',
                          color: '#1a1208',
                          border: '1px solid var(--terracotta)',
                          fontWeight: 700,
                          boxShadow: '0 10px 28px -10px rgba(255, 209, 102, 0.55)',
                        }
                      : {
                          color: 'rgba(232,230,221,0.85)',
                          border: '1px solid rgba(232,230,221,0.14)',
                          background: 'transparent',
                          fontWeight: 500,
                        }
                  }
                >
                  {c.label}
                </button>
              );
            })}
            <span className="w-px h-[24px] bg-[rgba(232,230,221,0.15)] mx-1 flex-shrink-0" />
            {(['beginner', 'intermediate', 'advanced'] as const).map(d => {
              const active = difficulty === d;
              const tone   = DIFFICULTY_TONE[d];
              const label  = d === 'intermediate' ? 'Mid' : d.charAt(0).toUpperCase() + d.slice(1);
              const isBeginner = d === 'beginner';
              const activeBg = isBeginner ? 'var(--seafoam)' : 'var(--terracotta)';
              const activeShadow = isBeginner
                ? '0 10px 28px -10px rgba(94, 234, 212, 0.55)'
                : '0 10px 28px -10px rgba(255, 209, 102, 0.55)';
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(active ? 'all' : d)}
                  className="flex-shrink-0 px-[12px] py-[8px] sm:px-[16px] sm:py-[10px] text-[10px] sm:text-[11px] tracking-[0.18em] uppercase rounded-lg whitespace-nowrap transition-[filter,transform,background,color,border-color] duration-200 hover:brightness-110"
                  style={
                    active
                      ? {
                          background: activeBg,
                          color: '#1a1208',
                          border: `1px solid ${activeBg}`,
                          fontWeight: 700,
                          boxShadow: activeShadow,
                        }
                      : {
                          color: tone.color,
                          border: `1px solid ${tone.border}`,
                          background: 'transparent',
                          fontWeight: 500,
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
            </div>
          </div>

          {/* Featured + sidebar grid; overflow products span full width below */}
          {featured && remaining.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_1fr] gap-[14px] items-start mb-[14px]">
                <FeaturedProduct product={featured} dealerName={showDealer ? getDealerName(featured.dealerId) : ''} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px] content-start">
                  {sidebarProducts.map(p => (
                    <ProductCard key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} solPerGEL={solPerGEL} solPriceUsd={solPriceUsd} />
                  ))}
                </div>
              </div>
              {overflowProducts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[12px]">
                  {overflowProducts.map(p => (
                    <ProductCard key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} solPerGEL={solPerGEL} solPriceUsd={solPriceUsd} />
                  ))}
                </div>
              )}
            </>
          ) : featured ? (
            <FeaturedProduct product={featured} dealerName={showDealer ? getDealerName(featured.dealerId) : ''} />
          ) : visible.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[12px]">
              {visible.map(p => (
                <ProductCard key={p.id} product={p} dealerName={showDealer ? getDealerName(p.dealerId) : ''} solPerGEL={solPerGEL} solPriceUsd={solPriceUsd} />
              ))}
            </div>
          ) : (
            <p className="text-center text-[13px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] py-12">
              No items match these filters
            </p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
