'use client';

import Image from 'next/image';
import Link from 'next/link';
import { priceToSol, type Product } from '@/lib/dealers';

const STARS_VIOLET = '#8B5CF6';

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

const formatSol = (sol: number): string => {
  if (sol >= 10) return sol.toFixed(2);
  if (sol >= 1)  return sol.toFixed(3);
  return sol.toFixed(4);
};

interface Props {
  product: Product;
  dealerName: string;
  solPerGEL?: number;
  solPriceUsd?: number;
  featured?: boolean;
  className?: string;
}

export default function ProductCard({ product, dealerName, solPerGEL = 0, solPriceUsd = 0, featured = false, className = '' }: Props) {
  const checkoutHref = (mode: 'sol' | 'stars') =>
    `/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=${mode}`;

  const solValue = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const solAmount = solValue > 0 ? solValue : null;
  const idleBg = featured ? 'rgba(255, 179, 71,0.05)' : 'rgba(232,230,221,0.045)';
  const idleBorder = featured ? 'rgba(255, 179, 71,0.32)' : 'rgba(232,230,221,0.10)';

  return (
    <div
      className={`group relative flex flex-col rounded-xl p-[14px] transition-all duration-200 hover:-translate-y-[2px] ${className}`}
      style={{
        background: idleBg,
        border: `1px solid ${idleBorder}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255, 179, 71,0.40)';
        e.currentTarget.style.background = featured ? 'rgba(255, 179, 71,0.08)' : 'rgba(232,230,221,0.075)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = idleBorder;
        e.currentTarget.style.background = idleBg;
      }}
    >
      {featured && (
        <span
          className="absolute top-[10px] right-[10px] z-10 px-[8px] py-[3px] rounded-md text-[9px] tracking-[0.22em] uppercase font-semibold"
          style={{
            background: 'rgba(255, 179, 71,0.16)',
            border: '1px solid rgba(255, 179, 71,0.4)',
            color: 'var(--terracotta)',
          }}
        >
          Editor’s pick
        </span>
      )}
      <a
        href={product.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-1 min-h-0"
        aria-label={`View ${product.name} on dealer site`}
      >
        <div
          className={`relative w-full rounded-lg mb-[14px] overflow-hidden ${featured ? 'flex-1 min-h-[200px] md:min-h-0 aspect-[1.25] md:aspect-auto' : 'aspect-[1.25]'}`}
          style={{
            background: 'rgba(232,230,221,0.92)',
          }}
        >
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes={featured ? '(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 640px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px'}
              style={{ objectFit: 'contain', padding: '16px' }}
              loading="lazy"
            />
          )}
        </div>
        <p className={`font-medium text-[#F8F4EC] leading-[1.25] truncate mb-[3px] group-hover:text-white transition-colors ${featured ? 'text-[15px] md:text-[18px]' : 'text-[15px]'}`}>
          {product.name}
        </p>
        <p className="text-[11px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.6)] mb-[10px] truncate">
          {dealerName || product.category}
        </p>
      </a>
      <div
        className="flex justify-between items-end pt-[10px] mb-[12px] gap-[10px]"
        style={{ borderTop: '1px solid rgba(232,230,221,0.10)' }}
      >
        <div className="flex flex-col gap-[2px] min-w-0">
          <span className="text-[18px] font-semibold text-[var(--terracotta)] transition-colors group-hover:text-[#FFE08A] leading-none">
            {formatPrice(product)}
          </span>
          {solAmount !== null && (
            <span className="text-[10px] tracking-[0.10em] uppercase text-[rgba(232,230,221,0.55)] leading-none mt-[4px]">
              ≈ <span className="text-[rgba(232,230,221,0.85)]">{formatSol(solAmount)}</span> SOL
            </span>
          )}
        </div>
        <span
          className="text-[12px] tracking-[0.10em] uppercase font-bold whitespace-nowrap"
          style={{ color: STARS_VIOLET }}
        >
          ★ {product.starsPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-[8px]">
        <Link
          href={checkoutHref('sol')}
          className="flex-1 inline-flex items-center justify-center gap-[6px] px-[14px] py-[10px] rounded-[14px] text-[12px] tracking-[0.04em] font-semibold whitespace-nowrap transition-[filter,transform,box-shadow] duration-150 hover:brightness-[1.08] hover:-translate-y-[1px]"
          style={{
            background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
            border: 'none',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(91, 108, 255, 0.28)',
          }}
          aria-label={`Pay for ${product.name} with SOL`}
        >
          <span aria-hidden className="text-[13px] leading-none">◎</span>
          <span>SOL</span>
        </Link>
        <Link
          href={checkoutHref('stars')}
          className="flex-1 inline-flex items-center justify-center gap-[6px] px-[14px] py-[10px] rounded-[14px] text-[12px] tracking-[0.02em] font-medium whitespace-nowrap transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
          style={{
            background: '#161A28',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.92)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1C2235';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#161A28';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          }}
          aria-label={`Redeem ${product.name} with stars`}
        >
          <span aria-hidden className="text-[13px] leading-none" style={{ color: STARS_VIOLET }}>★</span>
          <span>Stars</span>
        </Link>
      </div>
    </div>
  );
}
