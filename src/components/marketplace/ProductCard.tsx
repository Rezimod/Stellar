'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { priceToSol, priceToUsd, type Product } from '@/lib/dealers';
import { formatPrice, formatSol, formatUsd } from '@/lib/marketplace-format';
import SolMark from './SolMark';

// 'Best Seller' / 'Popular' come from the dealer catalog; ratings are curated
// editorial values (see RATINGS in dealers.ts) shown only when present.
const BADGE_COLOR: Record<string, string> = {
  'Best Seller': 'var(--seafoam)',
  Popular: 'var(--terracotta)',
};

interface Props {
  product: Product;
  dealerName: string;
  solPerGEL?: number;
  solPriceUsd?: number;
  featured?: boolean;
  className?: string;
  /** Current Stars balance — drives the redeem affordability state. */
  balance?: number;
  /** Wishlist: when onToggleFavorite is provided, a heart toggle is shown. */
  favorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ProductCard({
  product,
  dealerName,
  solPerGEL = 0,
  solPriceUsd = 0,
  featured = false,
  className = '',
  balance = 0,
  favorite = false,
  onToggleFavorite,
}: Props) {
  const t = useTranslations('marketplacePage');
  const starsPrice = product.starsPrice;
  const affordable = balance > 0 && balance >= starsPrice;
  const shortBy = balance > 0 && balance < starsPrice ? starsPrice - balance : 0;

  const solValue = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const solAmount = solValue > 0 ? solValue : null;
  // USD equivalent for non-USD-listed gear — many buyers don't know GEL.
  const usdValue = priceToUsd(product.price, product.currency, solPerGEL, solPriceUsd);
  const usdAmount = product.currency !== 'USD' && usdValue > 0 ? usdValue : null;
  const badgeColor = product.badge ? (BADGE_COLOR[product.badge] ?? 'var(--terracotta)') : '';

  return (
    <div className={`mkt-card group relative flex flex-col rounded-xl p-[14px] hover:-translate-y-[2px] ${className}`}>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={favorite ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={favorite}
          className="absolute top-[10px] right-[10px] z-10 inline-flex items-center justify-center w-[28px] h-[28px] rounded-full backdrop-blur-sm transition-colors duration-150 before:absolute before:-inset-[8px] before:content-['']"
          style={{ minHeight: 0, background: 'rgba(15,18,28,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}
        >
          <Heart
            className="w-[14px] h-[14px]"
            style={{
              color: favorite ? 'var(--terracotta)' : 'rgba(255,255,255,0.7)',
              fill: favorite ? 'var(--terracotta)' : 'transparent',
            }}
          />
        </button>
      )}
      <Link
        href={`/marketplace/${encodeURIComponent(product.id)}`}
        className="flex flex-col flex-1 min-h-0"
        aria-label={`View ${product.name}`}
      >
        <div
          className={`relative w-full mb-[14px] overflow-hidden bg-white ${featured ? 'aspect-[1.9]' : 'aspect-[1.25]'}`}
        >
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes={featured ? '(max-width: 768px) 50vw, 640px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px'}
              style={{ objectFit: 'contain', padding: featured ? '10px' : '8px' }}
              loading="lazy"
            />
          )}
          {product.badge && (
            <span
              className="absolute top-[6px] left-[6px] inline-flex items-center rounded-full px-[8px] py-[3px] text-[9px] font-bold tracking-[0.1em] uppercase leading-none"
              style={{
                background: 'rgba(7,11,20,0.82)',
                color: badgeColor,
                border: `1px solid color-mix(in srgb, ${badgeColor} 35%, transparent)`,
              }}
            >
              {product.badge}
            </span>
          )}
        </div>
        {product.rating != null && (
          <div className="flex items-center gap-[5px] mb-[5px]">
            <Star className="w-[12px] h-[12px]" style={{ color: 'var(--terracotta)', fill: 'var(--terracotta)' }} />
            <span className="text-[11.5px] font-semibold tabular-nums text-white leading-none">{product.rating.toFixed(1)}</span>
            {product.reviews != null && (
              <span className="text-[10.5px] tabular-nums text-white/45 leading-none">({product.reviews})</span>
            )}
          </div>
        )}
        <p className={`font-medium text-white leading-[1.25] line-clamp-2 min-h-[2.5em] mb-[3px] group-hover:text-white transition-colors ${featured ? 'text-[16px]' : 'text-[15px]'}`}>
          {product.name}
        </p>
        <p className="text-[11px] tracking-[0.16em] uppercase text-white/85 mb-[10px] truncate">
          {dealerName || product.category}
        </p>
      </Link>
      <div
        className="flex flex-col gap-[4px] pt-[10px] mb-[12px]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <span className="text-[16px] sm:text-[18px] font-semibold text-white leading-none whitespace-nowrap">
          {formatPrice(product)}
        </span>
        {(usdAmount !== null || solAmount !== null) && (
          <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-[10px] tracking-[0.10em] uppercase text-white/70 leading-none">
            {usdAmount !== null && (
              <span><span className="text-white/55">≈ </span><span className="text-white">${formatUsd(usdAmount)}</span></span>
            )}
            {usdAmount !== null && solAmount !== null && (
              <span className="text-white/30">·</span>
            )}
            {solAmount !== null && (
              <span className="inline-flex items-center gap-[3px]">
                <span className="text-white">{formatSol(solAmount)}</span>
                <SolMark className="h-[9px] w-[9px] flex-shrink-0" />
                <span>SOL</span>
              </span>
            )}
          </span>
        )}
      </div>

      <Link
        href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=sol`}
        className="w-full inline-flex items-center justify-center gap-[7px] h-[38px] px-[10px] rounded-none text-[12.5px] tracking-[0.02em] font-bold whitespace-nowrap transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px]"
        style={{
          background: 'var(--terracotta)',
          border: '1px solid var(--terracotta)',
          color: '#1a1208',
          boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
        }}
        aria-label={`Pay for ${product.name} with SOL`}
      >
        <SolMark className="h-[16px] w-[16px] flex-shrink-0" />
        <span>{t('payWithSol')}</span>
      </Link>
      {starsPrice > 0 && (
        affordable ? (
          <Link
            href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=stars`}
            className="mt-[8px] w-full inline-flex items-center justify-center gap-[5px] text-[11px] tracking-[0.02em] text-white/55 hover:text-[var(--terracotta)] transition-colors"
            aria-label={`Redeem ${product.name} with Stars`}
          >
            <Star className="w-[11px] h-[11px] flex-shrink-0" style={{ fill: 'currentColor' }} />
            <span className="tabular-nums">{t('redeemStars', { stars: starsPrice.toLocaleString() })}</span>
          </Link>
        ) : (
          <span className="mt-[8px] w-full inline-flex items-center justify-center gap-[5px] text-[11px] tracking-[0.02em] text-white/40">
            <Star className="w-[11px] h-[11px] flex-shrink-0" style={{ fill: 'currentColor' }} />
            <span className="tabular-nums">
              {shortBy > 0
                ? t('starsToGo', { stars: shortBy.toLocaleString() })
                : t('orStars', { stars: starsPrice.toLocaleString() })}
            </span>
          </span>
        )
      )}
    </div>
  );
}
