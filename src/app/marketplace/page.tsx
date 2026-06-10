'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import LocationPicker from '@/components/LocationPicker';
import PageContainer from '@/components/layout/PageContainer';
import ProductCard from '@/components/marketplace/ProductCard';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK } from '@/lib/dealers';

type CategoryFilter = 'all' | 'telescope' | 'eyepiece' | 'binocular' | 'accessory';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const CATEGORIES: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'telescope', labelKey: 'telescopes' },
  { key: 'eyepiece', labelKey: 'eyepieces' },
  { key: 'binocular', labelKey: 'binoculars' },
  { key: 'accessory', labelKey: 'accessories' },
];

type SkillKey = Exclude<DifficultyFilter, 'all'>;

const SKILL_META: Record<SkillKey, { labelKey: string; level: 1 | 2 | 3; activeColor: string }> = {
  beginner:     { labelKey: 'skillBeginner',     level: 1, activeColor: 'var(--seafoam)' },
  intermediate: { labelKey: 'skillIntermediate', level: 2, activeColor: 'var(--terracotta)' },
  advanced:     { labelKey: 'skillAdvanced',     level: 3, activeColor: 'var(--terracotta)' },
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
  category: CategoryFilter;
  skill: DifficultyFilter;
}

const BUYING_GUIDES: BuyingGuide[] = [
  { id: 'moonPlanets', category: 'telescope', skill: 'beginner' },
  { id: 'deepSky',     category: 'telescope', skill: 'intermediate' },
  { id: 'astrophoto',  category: 'telescope', skill: 'advanced' },
];

export default function MarketplacePage() {
  const t = useTranslations('marketplacePage');
  const { address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const { location, ensureLocation } = useLocation();
  const address = stellarAddress ?? state.walletAddress ?? null;

  // The catalogue is region-aware (dealers + pricing) — prompt for GPS on open
  // so we show the right regional storefront, rather than on site entry.
  useEffect(() => { ensureLocation(); }, [ensureLocation]);
  const starsBalance = useStarsBalance(address);
  const balance = starsBalance ?? 0;

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setNavSlot(document.getElementById('nav-mobile-center'));
  }, []);

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

  // Lead with the most professional kit (advanced → intermediate → beginner),
  // and within a tier the higher-priced flagship comes first. Matches what
  // serious telescope buyers expect to see at the top of the page.
  const SKILL_RANK: Record<string, number> = { advanced: 3, intermediate: 2, beginner: 1 };
  const orderedVisible = useMemo(() => {
    if (difficulty !== 'all') return visible;
    return [...visible].sort((a, b) => {
      const sa = SKILL_RANK[a.skillLevel ?? 'beginner'] ?? 0;
      const sb = SKILL_RANK[b.skillLevel ?? 'beginner'] ?? 0;
      if (sa !== sb) return sb - sa;
      return b.price - a.price;
    });
  }, [visible, difficulty]);
  const featuredProduct = orderedVisible[0];
  const remainingProducts = orderedVisible.slice(1);
  const featuredRowProducts = remainingProducts.slice(0, 2);
  const catalogProducts = remainingProducts.slice(2);

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10">
          {/* Compact toolbar: filters left, balance + region right. Single row at sm+, stacked on mobile. */}
          <div className="flex flex-col gap-[6px] sm:flex-row sm:items-center sm:justify-between sm:gap-[10px] mb-[10px] sm:mb-[12px]">
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
                    className="flex-shrink-0 h-[30px] px-[12px] text-[11px] tracking-[0.08em] uppercase rounded-none whitespace-nowrap transition-[background,color,border-color] duration-150"
                    style={
                      active
                        ? {
                            background: 'var(--terracotta)',
                            color: '#1a1208',
                            border: '1px solid var(--terracotta)',
                            fontWeight: 700,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(255,126,54,0.18)',
                          }
                        : {
                            color: '#FFFFFF',
                            border: '1px solid rgba(255,255,255,0.18)',
                            background: 'rgba(15,18,28,0.55)',
                            fontWeight: 600,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
                          }
                    }
                  >
                    {t(c.labelKey)}
                  </button>
                );
              })}
              <span className="w-px h-[18px] bg-[rgba(255,255,255,0.18)] mx-[5px] flex-shrink-0" />
              {(['beginner', 'intermediate', 'advanced'] as const).map(d => {
                const active = difficulty === d;
                const meta   = SKILL_META[d];
                const barColor = active ? '#1a1208' : meta.activeColor;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(active ? 'all' : d)}
                    className="flex-shrink-0 inline-flex items-center gap-[7px] h-[30px] pl-[10px] pr-[12px] text-[10.5px] tracking-[0.1em] uppercase rounded-none whitespace-nowrap transition-[background,color,border-color] duration-150"
                    style={
                      active
                        ? {
                            background: meta.activeColor,
                            color: '#1a1208',
                            border: `1px solid ${meta.activeColor}`,
                            fontWeight: 700,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.25)',
                          }
                        : {
                            color: '#FFFFFF',
                            border: '1px solid rgba(255,255,255,0.18)',
                            background: 'rgba(15,18,28,0.55)',
                            fontWeight: 600,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
                          }
                    }
                  >
                    {SKILL_BARS(meta.level, barColor)}
                    {t(meta.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Balance + Region — desktop toolbar position. On mobile, these render in the nav header instead. */}
            <div className="hidden md:order-2 md:flex items-center justify-end gap-[8px] flex-shrink-0">
              <span
                className="inline-flex items-center h-[34px] gap-[7px] px-[11px] rounded-none uppercase cursor-default"
                style={{
                  background: 'rgba(15, 18, 28, 0.55)',
                  border: '1px solid rgba(255, 126, 54, 0.38)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
                }}
              >
                <span className="tracking-[0.12em] text-white text-[9.5px] font-semibold">{t('bal')}</span>
                <span className="font-semibold tabular-nums tracking-[0.02em] text-[12.5px]" style={{ color: 'var(--terracotta)' }}>
                  {balance.toLocaleString()}
                </span>
                <svg viewBox="0 0 24 24" fill="var(--terracotta)" aria-hidden="true" className="w-[10px] h-[10px]">
                  <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
                </svg>
              </span>
              <LocationPicker compact />
            </div>
          </div>

          {orderedVisible.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-[14px] sm:gap-[16px] md:hidden">
                {orderedVisible.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    dealerName={showDealer ? getDealerName(p.dealerId) : ''}
                    solPerGEL={solPerGEL}
                    solPriceUsd={solPriceUsd}
                    balance={balance}
                  />
                ))}
              </div>

              {featuredProduct ? (
                <div className="hidden md:flex md:flex-col gap-[14px] sm:gap-[16px]">
                  <div className="grid grid-cols-4 gap-[14px] sm:gap-[16px] items-start">
                    <ProductCard
                      product={featuredProduct}
                      dealerName={showDealer ? getDealerName(featuredProduct.dealerId) : ''}
                      solPerGEL={solPerGEL}
                      solPriceUsd={solPriceUsd}
                      balance={balance}
                      featured
                      className="col-span-2"
                    />
                    {featuredRowProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        dealerName={showDealer ? getDealerName(p.dealerId) : ''}
                        solPerGEL={solPerGEL}
                        solPriceUsd={solPriceUsd}
                        balance={balance}
                      />
                    ))}
                  </div>

                  {catalogProducts.length > 0 ? (
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-[14px] sm:gap-[16px]">
                      {catalogProducts.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          dealerName={showDealer ? getDealerName(p.dealerId) : ''}
                          solPerGEL={solPerGEL}
                          solPriceUsd={solPriceUsd}
                          balance={balance}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-center text-[13px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] py-12">
              {t('noItems')}
            </p>
          )}

          {/* Buying guide — sits under the catalogue, helps newcomers narrow the shop. */}
          <section className="mt-[36px] sm:mt-[52px]">
            <div className="flex items-baseline justify-between mb-[16px]">
              <h2
                className="font-display text-[18px] sm:text-[20px] tracking-[-0.005em] text-[#F8F4EC]"
                style={{ fontWeight: 600 }}
              >
                {t('guideTitle')}
              </h2>
              <p className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-[rgba(232,230,221,0.5)]">
                {t('guideSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[14px]">
              {BUYING_GUIDES.map(g => {
                const meta = SKILL_META[g.skill as SkillKey];
                return (
                  <button
                    key={g.id}
                    onClick={() => { setFilter(g.category); setDifficulty(g.skill); }}
                    className="group text-left rounded-none p-[16px] transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
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
                        {t(meta.labelKey)}
                      </span>
                    </div>
                    <p className="text-[15px] font-semibold text-[#F8F4EC] mb-[6px] leading-[1.25]">
                      {t(`guides.${g.id}.title`)}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-[rgba(232,230,221,0.7)]">
                      {t(`guides.${g.id}.copy`)}
                    </p>
                    <p className="mt-[12px] text-[10.5px] tracking-[0.18em] uppercase font-semibold text-[rgba(232,230,221,0.55)] group-hover:text-[var(--terracotta)] transition-colors">
                      {t('browsePicks')}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile-only: balance + location blended into the nav header (centered, no outlines). */}
      {navSlot && createPortal(
        <div className="flex items-center gap-[2px]">
          <span
            className="inline-flex items-center h-[22px] gap-[5px] px-[6px] rounded-md uppercase cursor-default"
          >
            <svg viewBox="0 0 24 24" fill="var(--terracotta)" aria-hidden="true" style={{ width: 9, height: 9 }}>
              <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
            </svg>
            <span className="font-semibold tabular-nums tracking-[0.02em] text-[10.5px]" style={{ color: 'var(--terracotta)' }}>
              {balance.toLocaleString()}
            </span>
          </span>
          <LocationPicker ghost />
        </div>,
        navSlot,
      )}
    </PageContainer>
  );
}
