'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { priceToSol, priceToUsd, type Product } from '@/lib/dealers';

// Real editorial badges only — 'Best Seller' / 'Popular' come from the dealer
// catalog. No invented ratings or review counts.
const BADGE_COLOR: Record<string, string> = {
  'Best Seller': '#34D399',
  Popular: '#A78BFA',
};

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

const formatSol = (sol: number): string => {
  if (sol >= 10) return sol.toFixed(2);
  if (sol >= 1)  return sol.toFixed(3);
  return sol.toFixed(4);
};

const formatUsd = (usd: number): string =>
  usd >= 10 ? Math.round(usd).toLocaleString() : usd.toFixed(2);

function SolMark({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 397 311" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="397" y2="311" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#19FB9B" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path fill={`url(#${id})`} d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path fill={`url(#${id})`} d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}

interface Props {
  product: Product;
  dealerName: string;
  solPerGEL?: number;
  solPriceUsd?: number;
  featured?: boolean;
  className?: string;
  /** Current Stars balance — drives the "earn this" progress bar. */
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
  const checkoutHref = (mode: 'sol' | 'stars') =>
    `/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=${mode}`;

  const starsPrice = product.starsPrice;
  const showProgress = starsPrice > 0 && balance > 0;
  const affordable = balance >= starsPrice;
  const pct = starsPrice > 0 ? Math.min(100, Math.round((balance / starsPrice) * 100)) : 0;
  const remaining = Math.max(0, starsPrice - balance);

  const solValue = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const solAmount = solValue > 0 ? solValue : null;
  // USD equivalent for non-USD-listed gear — many buyers don't know GEL.
  const usdValue = priceToUsd(product.price, product.currency, solPerGEL, solPriceUsd);
  const usdAmount = product.currency !== 'USD' && usdValue > 0 ? usdValue : null;
  const idleBg = 'rgba(232,230,221,0.045)';
  const idleBorder = 'rgba(232,230,221,0.10)';

  return (
    <div
      className={`group relative flex flex-col rounded-xl p-[14px] transition-all duration-200 hover:-translate-y-[2px] ${className}`}
      style={{
        background: idleBg,
        border: `1px solid ${idleBorder}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(232,230,221,0.22)';
        e.currentTarget.style.background = 'rgba(232,230,221,0.075)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = idleBorder;
        e.currentTarget.style.background = idleBg;
      }}
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={favorite ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={favorite}
          className="absolute top-[10px] right-[10px] z-10 inline-flex items-center justify-center w-[28px] h-[28px] rounded-full backdrop-blur-sm transition-colors duration-150"
          style={{ background: 'rgba(15,18,28,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}
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
      <a
        href={product.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-1 min-h-0"
        aria-label={`View ${product.name} on dealer site`}
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
                color: BADGE_COLOR[product.badge] ?? 'var(--terracotta)',
                border: `1px solid ${(BADGE_COLOR[product.badge] ?? 'var(--terracotta)')}55`,
              }}
            >
              {product.badge}
            </span>
          )}
          {product.starsPrice > 0 && (
            <span
              className="absolute bottom-[6px] left-[6px] inline-flex items-center gap-[4px] rounded-full pl-[6px] pr-[8px] py-[3px] backdrop-blur-sm"
              style={{
                background: 'rgba(15,18,28,0.82)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--terracotta)" aria-hidden="true" className="flex-shrink-0">
                <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
              </svg>
              <span className="text-[10.5px] font-bold tabular-nums tracking-[0.02em] text-white leading-none">
                {product.starsPrice.toLocaleString()}
              </span>
            </span>
          )}
        </div>
        <p className={`font-medium text-white leading-[1.25] line-clamp-2 min-h-[2.5em] mb-[3px] group-hover:text-white transition-colors ${featured ? 'text-[16px]' : 'text-[15px]'}`}>
          {product.name}
        </p>
        <p className="text-[11px] tracking-[0.16em] uppercase text-white/85 mb-[10px] truncate">
          {dealerName || product.category}
        </p>
      </a>
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
                <SolMark id={`sol-price-${product.id}`} className="h-[9px] w-[9px] flex-shrink-0" />
                <span>SOL</span>
              </span>
            )}
          </span>
        )}
      </div>

      {showProgress && (
        <div className="mb-[12px]">
          <div className="flex items-center justify-between mb-[5px]">
            <span className="text-[10px] tracking-[0.10em] uppercase" style={{ color: affordable ? '#5EEAD4' : 'rgba(255,255,255,0.55)' }}>
              {affordable ? 'Ready to redeem' : `${remaining.toLocaleString()} ✦ to go`}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-white/45">{pct}%</span>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: affordable ? '#5EEAD4' : '#FFD166' }} />
          </div>
        </div>
      )}

      <div className="flex gap-[6px]">
        <Link
          href={checkoutHref('sol')}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-[6px] h-[34px] px-[8px] rounded-none text-[11.5px] sm:text-[12px] tracking-[0.04em] font-bold whitespace-nowrap transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px]"
          style={{
            background: 'var(--terracotta)',
            border: '1px solid var(--terracotta)',
            color: '#1a1208',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
          }}
          aria-label={`Pay for ${product.name} with SOL`}
        >
          <svg width="16" height="16" viewBox="0 0 397 311" aria-hidden="true" className="h-[16px] w-[16px] flex-shrink-0">
            <defs>
              <linearGradient id={`sol-grad-${product.id}`} x1="0" y1="0" x2="397" y2="311" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9945FF" />
                <stop offset="50%" stopColor="#19FB9B" />
                <stop offset="100%" stopColor="#14F195" />
              </linearGradient>
            </defs>
            <path fill={`url(#sol-grad-${product.id})`} d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
            <path fill={`url(#sol-grad-${product.id})`} d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
            <path fill={`url(#sol-grad-${product.id})`} d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
          </svg>
          <span>SOL</span>
        </Link>
        <Link
          href={checkoutHref('stars')}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-[5px] h-[34px] px-[6px] rounded-none text-[11.5px] sm:text-[12px] tracking-[0.04em] font-bold whitespace-nowrap transition-[background,transform] duration-150 hover:-translate-y-[1px]"
          style={{
            background: '#1A2540',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#FFFFFF',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#22305A';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1A2540';
          }}
          aria-label={`Redeem ${product.name} with stars`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-white flex-shrink-0">
            <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
          </svg>
          <span>STARS</span>
        </Link>
      </div>
    </div>
  );
}
