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
import MarketplaceHero from '@/components/marketplace/MarketplaceHero';
import CategoryCircles from '@/components/marketplace/CategoryCircles';
import FeaturedDeals from '@/components/marketplace/FeaturedDeals';
import RecommendedRow from '@/components/marketplace/RecommendedRow';
import HelpBanner from '@/components/marketplace/HelpBanner';
import MarketplaceSectionHeader from '@/components/marketplace/MarketplaceSectionHeader';
import { SolGradientDef } from '@/components/marketplace/SolMark';
import { X } from 'lucide-react';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK, type Product } from '@/lib/dealers';
import { track } from '@/lib/track';

type Cat = Product['category'];
type CategoryFilter = 'all' | Cat;
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type SortMode = 'default' | 'priceAsc' | 'priceDesc';

const SKILL_RANK: Record<string, number> = { advanced: 3, intermediate: 2, beginner: 1 };
const CATS: Cat[] = ['telescope', 'eyepiece', 'binocular', 'accessory'];
const CAT_KEY: Record<Cat, string> = { telescope: 'telescopes', eyepiece: 'eyepieces', binocular: 'binoculars', accessory: 'accessories' };
const SKILLS = ['beginner', 'intermediate', 'advanced'] as const;
const SKILL_KEY: Record<(typeof SKILLS)[number], string> = { beginner: 'skillBeginner', intermediate: 'skillIntermediate', advanced: 'skillAdvanced' };

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

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      aria-label={`Remove filter: ${label}`}
      className="inline-flex items-center gap-[6px] h-[26px] px-[10px] rounded-full text-[10.5px] tracking-[0.1em] uppercase font-semibold text-[var(--accent-text)] transition-colors hover:text-white"
      style={{ minHeight: 0, background: 'rgba(255,179,71,0.10)', border: '1px solid rgba(255,179,71,0.30)' }}
    >
      {label}
      <X className="w-[11px] h-[11px]" />
    </button>
  );
}

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
  const [sort, setSort] = useState<SortMode>('default');
  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);

  const catalogRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setNavSlot(document.getElementById('nav-mobile-center')); }, []);

  // Filters live in the URL so refresh / share / back keep the same view.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = sp.get('cat');
    const skill = sp.get('skill');
    const s = sp.get('sort');
    if (cat && (CATS as string[]).includes(cat)) setFilter(cat as Cat);
    if (skill && (SKILLS as readonly string[]).includes(skill)) setDifficulty(skill as DifficultyFilter);
    if (s === 'priceAsc' || s === 'priceDesc') setSort(s);
  }, []);
  useEffect(() => {
    const sp = new URLSearchParams();
    if (filter !== 'all') sp.set('cat', filter);
    if (difficulty !== 'all') sp.set('skill', difficulty);
    if (sort !== 'default') sp.set('sort', sort);
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filter, difficulty, sort]);

  // Funnel: marketplace reached. Fire once, preferring a resolved wallet so
  // events aren't all anonymous; fall back to anonymous after a short grace.
  const trackedRef = useRef(false);
  useEffect(() => {
    if (trackedRef.current) return;
    if (address) {
      trackedRef.current = true;
      track('marketplace_view', {}, address);
      return;
    }
    const id = setTimeout(() => {
      if (!trackedRef.current) { trackedRef.current = true; track('marketplace_view', {}, null); }
    }, 2500);
    return () => clearTimeout(id);
  }, [address]);
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

  // Default order is beginner-first, cheapest-first — the beta audience is
  // first-scope buyers, so entry gear leads and astrophoto rigs come last.
  const orderedVisible = useMemo(() => {
    const list = [...visible];
    if (sort === 'priceAsc') return list.sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') return list.sort((a, b) => b.price - a.price);
    return list.sort((a, b) => {
      const sa = SKILL_RANK[a.skillLevel ?? 'beginner'] ?? 0;
      const sb = SKILL_RANK[b.skillLevel ?? 'beginner'] ?? 0;
      if (sa !== sb) return sa - sb;
      return a.price - b.price;
    });
  }, [visible, sort]);

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
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    ref.current?.scrollIntoView({ behavior, block: 'start' });
  }, []);
  const selectCategory = useCallback((cat: CategoryFilter) => { setFilter(cat); setDifficulty('all'); scrollTo(catalogRef); }, [scrollTo]);

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <SolGradientDef />
      <div className="marketplace-page-bg overflow-hidden">
        <div className="relative z-10 flex flex-col gap-[20px] sm:gap-[24px]">
          {/* 1. Hero */}
          <MarketplaceHero
            onShopTelescopes={() => selectCategory('telescope')}
            onShopDeals={() => scrollTo(featuredRef)}
          />

          {/* 2. Category circles (primary filter) + region picker (desktop) */}
          <div className="flex items-start gap-[10px]">
            <div className="flex-1 min-w-0">
              <CategoryCircles active={filter} counts={counts} onSelect={cat => { setFilter(cat); setDifficulty('all'); }} />
            </div>
            <div className="hidden md:flex flex-shrink-0 pt-[10px]">
              <LocationPicker compact />
            </div>
          </div>

          {/* 3. Featured Picks */}
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
            <div className="flex flex-wrap items-center gap-[8px] mb-[14px]">
              {filter !== 'all' && (
                <FilterChip label={t(CAT_KEY[filter])} onClear={() => setFilter('all')} />
              )}
              {difficulty !== 'all' && (
                <FilterChip label={t(SKILL_KEY[difficulty])} onClear={() => setDifficulty('all')} />
              )}
              {(filter !== 'all' || difficulty !== 'all') && (
                <button
                  onClick={() => { setFilter('all'); setDifficulty('all'); }}
                  className="text-[10.5px] tracking-[0.12em] uppercase text-white/50 hover:text-[var(--accent-text)] transition-colors"
                >
                  {t('clearFilters')}
                </button>
              )}
              <div className="ml-auto flex items-center gap-[10px]">
                {([
                  ['default', t('sortDefault')],
                  ['priceAsc', t('sortPriceAsc')],
                  ['priceDesc', t('sortPriceDesc')],
                ] as [SortMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setSort(mode)}
                    aria-pressed={sort === mode}
                    className="text-[10.5px] tracking-[0.12em] uppercase transition-colors"
                    style={{ color: sort === mode ? 'var(--accent-text)' : 'rgba(var(--ink), 0.5)', fontWeight: sort === mode ? 700 : 500 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
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
              <div className="text-center py-12">
                <p className="text-[13px] tracking-[0.14em] uppercase text-[rgba(var(--ink-warm),0.7)] mb-[12px]">
                  {t('noItems')}
                </p>
                <button
                  onClick={() => { setFilter('all'); setDifficulty('all'); }}
                  className="text-[11px] tracking-[0.14em] uppercase font-semibold text-[var(--accent-text)] hover:brightness-110 transition-[filter]"
                >
                  {t('resetFilters')}
                </button>
              </div>
            )}
          </section>

          {/* 6. Recommended */}
          <RecommendedRow
            products={recommended}
            dealerName={getDealerName}
            solPerGEL={solPerGEL}
            solPriceUsd={solPriceUsd}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onViewAll={() => scrollTo(catalogRef)}
          />

          {/* 8. Need help choosing? */}
          <HelpBanner />

          {/* Buying guide — preserved goal-based shortcuts into the catalog */}
          <section>
            <div className="flex items-baseline justify-between mb-[16px]">
              <h2 className="font-display text-[18px] sm:text-[20px] tracking-[-0.005em] text-[#F8F4EC]" style={{ fontWeight: 600 }}>
                {t('guideTitle')}
              </h2>
              <p className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-[rgba(var(--ink-warm),0.5)]">
                {t('guideSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[14px]">
              {BUYING_GUIDES.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setFilter(g.category); setDifficulty(g.skill); scrollTo(catalogRef); }}
                  className="mkt-guide group text-left rounded-none p-[16px] hover:-translate-y-[1px]"
                >
                  <p className="text-[15px] font-semibold text-[#F8F4EC] mb-[6px] leading-[1.25]">
                    {t(`guides.${g.id}.title`)}
                  </p>
                  <p className="text-[12.5px] leading-[1.5] text-[rgba(var(--ink-warm),0.7)]">
                    {t(`guides.${g.id}.copy`)}
                  </p>
                  <p className="mt-[12px] text-[10.5px] tracking-[0.18em] uppercase font-semibold text-[rgba(var(--ink-warm),0.55)] group-hover:text-[var(--accent-text)] transition-colors">
                    {t('browsePicks')}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile-only: Stars balance + region picker blended into the nav header. */}
      {navSlot && createPortal(
        <div className="flex items-center gap-[2px]">
          <span className="inline-flex items-center h-[22px] gap-[5px] px-[6px] rounded-md uppercase cursor-default">
            <svg viewBox="0 0 24 24" fill="var(--accent-text)" aria-hidden="true" style={{ width: 9, height: 9 }}>
              <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
            </svg>
            <span className="font-semibold tabular-nums tracking-[0.02em] text-[10.5px]" style={{ color: 'var(--accent-text)' }}>
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
