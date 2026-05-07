'use client';

import Image from 'next/image';
import Link from 'next/link';
import { priceToSol, type Product } from '@/lib/dealers';

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
  className?: string;
}

export default function ProductCard({ product, dealerName, solPerGEL = 0, solPriceUsd = 0, className = '' }: Props) {
  const checkoutHref = (mode: 'sol' | 'stars') =>
    `/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=${mode}`;

  const solValue = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const solAmount = solValue > 0 ? solValue : null;
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
      <a
        href={product.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-1 min-h-0"
        aria-label={`View ${product.name} on dealer site`}
      >
        <div
          className="relative w-full rounded-lg mb-[14px] overflow-hidden aspect-[1.25]"
          style={{
            background: 'rgba(232,230,221,0.92)',
          }}
        >
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
              style={{ objectFit: 'contain', padding: '16px' }}
              loading="lazy"
            />
          )}
        </div>
        <p className="font-medium text-white leading-[1.25] truncate mb-[3px] group-hover:text-white transition-colors text-[15px]">
          {product.name}
        </p>
        <p className="text-[11px] tracking-[0.16em] uppercase text-white/85 mb-[10px] truncate">
          {dealerName || product.category}
        </p>
      </a>
      <div
        className="flex justify-between items-end pt-[10px] mb-[12px] gap-[10px]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="flex flex-col gap-[2px] min-w-0">
          <span className="text-[18px] font-semibold text-white leading-none">
            {formatPrice(product)}
          </span>
          {solAmount !== null && (
            <span className="text-[10px] tracking-[0.10em] uppercase text-white/70 leading-none mt-[4px]">
              ≈ <span className="text-white">{formatSol(solAmount)}</span> SOL
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-[5px] text-[12px] tracking-[0.10em] uppercase font-bold whitespace-nowrap text-white">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
          </svg>
          {product.starsPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-[8px]">
        <Link
          href={checkoutHref('sol')}
          className="flex-1 inline-flex items-center justify-center gap-[8px] px-[14px] py-[10px] rounded-[8px] text-[13.5px] tracking-[0.04em] font-bold whitespace-nowrap transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px]"
          style={{
            background: 'var(--terracotta)',
            border: '1px solid var(--terracotta)',
            color: '#1a1208',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
          }}
          aria-label={`Pay for ${product.name} with SOL`}
        >
          <svg width="17" height="17" viewBox="0 0 397 311" aria-hidden="true">
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
          className="flex-1 inline-flex items-center justify-center gap-[7px] px-[14px] py-[10px] rounded-[8px] text-[12px] tracking-[0.02em] font-medium whitespace-nowrap transition-[background,transform] duration-150 hover:-translate-y-[1px]"
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-white">
            <path d="M12 2l2.95 6.97 7.55.6-5.74 4.96 1.79 7.39L12 17.77 5.45 21.92l1.79-7.39L1.5 9.57l7.55-.6L12 2z" />
          </svg>
          <span>Stars</span>
        </Link>
      </div>
    </div>
  );
}
