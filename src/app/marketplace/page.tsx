'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import LocationPicker from '@/components/LocationPicker';
import PageContainer from '@/components/layout/PageContainer';
import ProductCard from '@/components/marketplace/ProductCard';
import MarketplaceBalanceCard from '@/components/marketplace/MarketplaceBalanceCard';
import TrustRow from '@/components/marketplace/TrustRow';
import FeaturedDeals from '@/components/marketplace/FeaturedDeals';
import ShopByCategory from '@/components/marketplace/ShopByCategory';
import MarketplaceInfoRow from '@/components/marketplace/MarketplaceInfoRow';
import RecommendedRow from '@/components/marketplace/RecommendedRow';
import HelpBanner from '@/components/marketplace/HelpBanner';
import MarketplaceSectionHeader from '@/components/marketplace/MarketplaceSectionHeader';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK, type Product } from '@/lib/dealers';

type Cat = Product['category'];
type CategoryFilter = 'all' | Cat;
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const CATEGORIES: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'telescope', labelKey: 'telescopes' },
  { key: 'eyepiece', labelKey: 'eyepieces' },
  { key: 'binocular', labelKey: 'binoculars' },
  { key: 'accessory', labelKey: 'accessories' },
];

const SKILL_RANK: Record<string, number> = { advanced: 3, intermediate: 2, beginner: 1 };

interface BuyingGuide { id: string; category: CategoryFilter; skill: DifficultyFilter; }
const BUYING_GUIDES: BuyingGuide[] = [
  { id: 'moonPlanets', category: 'telescope', skill: 'beginner' },
  { id: 'deepSky',     category: 'telescope', skill: 'intermediate' },
  { id: 'astrophoto',  category: 'telescope', skill: 'advanced' },
];

const dedupe = (list: Product[]): Product[] => {
  const seen = new Set<string>();
  return list.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
};

export default function MarketplacePage() {
  const t = useTranslations('marketplacePage');
  const { address: stellarAddress } = useStellarUser();
  const { state, toggleFavorite } = useAppState();
  const { location, ensureLocation } = useLocation();
  const address = stellarAddress ?? state.walletAddress ?? null;
  const favorites = state.favorites ?? [];

  useEffect(() => { ensureLocation(); }, [ensureLocation]);
  const starsBalance = useStarsBalance(address);
  const balance = starsBalance ?? 0;

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);

  const catalogRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setNavSlot(document.getElementById('nav-mobile-center')); }, []);
  useEffect(() => {
    fetch('/api/price/sol')
      .then(r => r.json())
      .then(d => { setSolPerGEL(d.solPerGEL ?? 0); setSolPriceUsd(d.solPrice ?? 0); })
      .catch(() => {});
  }, []);

  const dealers = useMemo(() => getDealersByRegion(location.region), [location.region]);
  const showDealer = dealers.length > 1;
  const regionProducts = useMemo(() => {
    const list = getProductsByRegion(location.region);
    return list.length > 0 ? list : GLOBAL_FALLBACK;
  }, [location.region]);
  const allProducts = useMemo(() => regionProducts.filter(p => p.kind !== 'stars-only'), [regionProducts]);

  const productById = useMemo(() => new Map(allProducts.map(p => [p.id, p])), [allProducts]);
  const getDealerName = useCallback(
    (id: string): string => {
      if (!showDealer) return '';
      const p = productById.get(id);
      return p ? (dealers.find(d => d.id === p.dealerId)?.name ?? '') : '';
    },
    [dealers, productById, showDealer],
  );

  const inCategory = useMemo(
    () => filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter),
    [allProducts, filter],
  );
  const visible = useMemo(
    () => difficulty === 'all' ? inCategory : inCategory.filter(p => p.skillLevel === difficulty),
    [inCategory, difficulty],
  );

  const orderedVisible = useMemo(() => {
    if (difficulty !== 'all') return visible;
    return [...visible].sort((a, b) => {
      const sa = SKILL_RANK[a.skillLevel ?? 'beginner'] ?? 0;
      const sb = SKILL_RANK[b.skillLevel ?? 'beginner'] ?? 0;
      if (sa !== sb) return sb - sa;
      return b.price - a.price;
    });
  }, [visible, difficulty]);

  // Featured rail: hand-picked flags first, then real badges, then top-tier by
  // skill/price — so the rail is never empty in any region or category.
  const featured = useMemo(() => {
    const flagged = visible.filter(p => p.featured);
    const badged = visible.filter(p => p.badge && !p.featured);
    const rest = [...visible]
      .filter(p => !p.featured && !p.badge)
      .sort((a, b) => (SKILL_RANK[b.skillLevel ?? 'beginner'] ?? 0) - (SKILL_RANK[a.skillLevel ?? 'beginner'] ?? 0) || b.price - a.price);
    return dedupe([...flagged, ...badged, ...rest]).slice(0, 6);
  }, [visible]);

  // Recommended rail: flagged picks, then eyepieces/accessories, then cheapest
  // remaining — excluding whatever is already featured.
  const recommended = useMemo(() => {
    const featuredIds = new Set(featured.map(p => p.id));
    const pool = visible.filter(p => !featuredIds.has(p.id));
    const flagged = pool.filter(p => p.recommended);
    const addons = pool.filter(p => !p.recommended && (p.category === 'eyepiece' || p.category === 'accessory'));
    const rest = [...pool]
      .filter(p => !p.recommended && p.category !== 'eyepiece' && p.category !== 'accessory')
      .sort((a, b) => a.price - b.price);
    return dedupe([...flagged, ...addons, ...rest]).slice(0, 3);
  }, [visible, featured]);

  const counts = useMemo(() => {
    const c: Record<Cat, number> = { telescope: 0, eyepiece: 0, binocular: 0, accessory: 0 };
    for (const p of allProducts) c[p.category]++;
    return c;
  }, [allProducts]);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const selectCategory = useCallback((cat: Cat) => { setFilter(cat); setDifficulty('all'); scrollTo(catalogRef); }, [scrollTo]);

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10 flex flex-col gap-[20px] sm:gap-[24px]">
          {/* 1. Balance (Stars live in this content card, not the header) */}
          <MarketplaceBalanceCard balance={balance} signedIn={!!address} solPerGEL={solPerGEL} solPriceUsd={solPriceUsd} />

          {/* 2. Category filter pills + region picker (desktop) */}
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[6px] flex-nowrap overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map(c => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => { setFilter(c.key); setDifficulty('all'); }}
                    className="flex-shrink-0 h-[30px] px-[12px] text-[11px] tracking-[0.08em] uppercase rounded-none whitespace-nowrap transition-[background,color,border-color] duration-150"
                    style={active
                      ? { background: 'var(--terracotta)', color: '#1a1208', border: '1px solid var(--terracotta)', fontWeight: 700, boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(255,126,54,0.18)' }
                      : { color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(15,18,28,0.55)', fontWeight: 600, boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}
                  >
                    {t(c.labelKey)}
                  </button>
                );
              })}
            </div>
            <div className="hidden md:flex flex-shrink-0">
              <LocationPicker compact />
            </div>
          </div>

          {/* 3. Trust signals */}
          <TrustRow />

          {/* 4. Featured Deals */}
          <div ref={featuredRef} className="scroll-mt-[80px]">
            <FeaturedDeals
              products={featured}
              dealerName={getDealerName}
              solPerGEL={solPerGEL}
              solPriceUsd={solPriceUsd}
              balance={balance}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onViewAll={() => scrollTo(catalogRef)}
            />
          </div>

          {/* 5. Full catalog grid */}
          <section ref={catalogRef} className="scroll-mt-[80px]">
            <MarketplaceSectionHeader title={`${t('allGear')} · ${orderedVisible.length}`} />
            {orderedVisible.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] sm:gap-[16px]">
                {orderedVisible.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    dealerName={getDealerName(p.id)}
                    solPerGEL={solPerGEL}
                    solPriceUsd={solPriceUsd}
                    balance={balance}
                    favorite={favorites.includes(p.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-[13px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] py-12">
                {t('noItems')}
              </p>
            )}
          </section>

          {/* 6. Shop by category */}
          <section>
            <MarketplaceSectionHeader title={t('shopByCategory')} />
            <ShopByCategory counts={counts} onSelect={selectCategory} />
          </section>

          {/* 7. Info row */}
          <MarketplaceInfoRow onCommunityPicks={() => scrollTo(featuredRef)} />

          {/* 8. Recommended */}
          <RecommendedRow
            products={recommended}
            dealerName={getDealerName}
            solPerGEL={solPerGEL}
            solPriceUsd={solPriceUsd}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onViewAll={() => scrollTo(catalogRef)}
          />

          {/* 9. Need help choosing? */}
          <HelpBanner />

          {/* Buying guide — preserved goal-based shortcuts into the catalog */}
          <section>
            <div className="flex items-baseline justify-between mb-[16px]">
              <h2 className="font-display text-[18px] sm:text-[20px] tracking-[-0.005em] text-[#F8F4EC]" style={{ fontWeight: 600 }}>
                {t('guideTitle')}
              </h2>
              <p className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-[rgba(232,230,221,0.5)]">
                {t('guideSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[14px]">
              {BUYING_GUIDES.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setFilter(g.category); setDifficulty(g.skill); scrollTo(catalogRef); }}
                  className="group text-left rounded-none p-[16px] transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
                  style={{ background: 'rgba(232,230,221,0.035)', border: '1px solid rgba(232,230,221,0.10)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,0.32)'; e.currentTarget.style.background = 'rgba(232,230,221,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,221,0.10)'; e.currentTarget.style.background = 'rgba(232,230,221,0.035)'; }}
                >
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
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile-only: region picker blended into the nav header (location only; balance now lives in the content card). */}
      {navSlot && createPortal(<LocationPicker ghost />, navSlot)}
    </PageContainer>
  );
}
