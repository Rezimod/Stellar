'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { priceToSol, priceToUsd, type Product } from '@/lib/dealers';
import { formatPrice, formatSol, formatUsd } from '@/lib/marketplace-format';
import MarketplaceSectionHeader from './MarketplaceSectionHeader';

interface Props {
  products: Product[];
  dealerName: (id: string) => string;
  solPerGEL: number;
  solPriceUsd: number;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onViewAll: () => void;
}

export default function RecommendedRow({
  products, dealerName, solPerGEL, solPriceUsd, favorites, onToggleFavorite, onViewAll,
}: Props) {
  const t = useTranslations('marketplacePage');
  if (products.length === 0) return null;

  return (
    <section>
      <MarketplaceSectionHeader title={t('recommendedTitle')} viewAllLabel={t('viewAll')} onViewAll={onViewAll} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
        {products.map(p => {
          const usd = p.currency !== 'USD' ? priceToUsd(p.price, p.currency, solPerGEL, solPriceUsd) : 0;
          const sol = priceToSol(p.price, p.currency, solPerGEL, solPriceUsd);
          const fav = favorites.includes(p.id);
          const label = dealerName(p.id) || p.category;
          return (
            <div key={p.id} className="mkt-card relative flex gap-[12px] rounded-xl p-[10px]">
              <Link
                href={`/marketplace/${encodeURIComponent(p.id)}`}
                className="flex gap-[12px] flex-1 min-w-0"
                aria-label={`View ${p.name}`}
              >
                <div className="relative w-[78px] h-[78px] flex-shrink-0 overflow-hidden rounded-lg bg-white">
                  {p.image && (
                    <Image src={p.image} alt={p.name} fill sizes="78px" style={{ objectFit: 'contain', padding: '6px' }} loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex flex-col justify-center pr-[24px]">
                  <p className="text-[13px] font-medium text-white leading-[1.25] line-clamp-2">{p.name}</p>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-white/45 truncate mt-[2px]">{label}</p>
                  <p className="font-mono tabular-nums text-[13px] font-semibold text-white mt-[5px] leading-none">
                    {formatPrice(p)}
                  </p>
                  {(usd > 0 || sol > 0) && (
                    <p className="font-mono tabular-nums text-[10px] text-white/45 mt-[3px] leading-none truncate">
                      {usd > 0 && <>≈ ${formatUsd(usd)}</>}
                      {usd > 0 && sol > 0 && <span className="text-white/25"> · </span>}
                      {sol > 0 && <>{formatSol(sol)} SOL</>}
                    </p>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => onToggleFavorite(p.id)}
                aria-label={fav ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                aria-pressed={fav}
                className="absolute top-[10px] right-[10px] inline-flex items-center justify-center w-[26px] h-[26px] min-h-0 rounded-full before:absolute before:-inset-[9px] before:content-['']"
                style={{ background: 'rgba(15,18,28,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Heart
                  className="w-[13px] h-[13px]"
                  style={{ color: fav ? 'var(--terracotta)' : 'rgba(255,255,255,0.6)', fill: fav ? 'var(--terracotta)' : 'transparent' }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
