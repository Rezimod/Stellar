'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import ProductCard from './ProductCard';
import MarketplaceSectionHeader from './MarketplaceSectionHeader';
import type { Product } from '@/lib/dealers';

interface Props {
  products: Product[];
  dealerName: (id: string) => string;
  solPerGEL: number;
  solPriceUsd: number;
  balance: number;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onViewAll: () => void;
}

export default function FeaturedDeals({
  products, dealerName, solPerGEL, solPriceUsd, balance, favorites, onToggleFavorite, onViewAll,
}: Props) {
  const t = useTranslations('marketplacePage');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    let nearest = 0;
    let min = Infinity;
    children.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.scrollLeft);
      if (d < min) { min = d; nearest = i; }
    });
    setActive(nearest);
  }, []);

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  }, []);

  if (products.length === 0) return null;
  const showDots = products.length > 1;

  return (
    <section>
      <MarketplaceSectionHeader title={t('featuredTitle')} viewAllLabel={t('viewAll')} onViewAll={onViewAll} />
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-[14px] sm:gap-[16px] overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map(p => (
          <div key={p.id} className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[calc(33.333%-11px)]">
            <ProductCard
              product={p}
              dealerName={dealerName(p.id)}
              solPerGEL={solPerGEL}
              solPriceUsd={solPriceUsd}
              balance={balance}
              favorite={favorites.includes(p.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
      {showDots && (
        <div className="flex items-center justify-center gap-[6px] mt-[12px]">
          {products.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              aria-label={`Go to deal ${i + 1}`}
              className="h-[6px] rounded-full transition-all duration-200"
              style={{
                width: i === active ? 18 : 6,
                background: i === active ? 'var(--terracotta)' : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
