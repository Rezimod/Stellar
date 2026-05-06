'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { priceToSol, type Product } from '@/lib/dealers';

const FEATURED_SPEC_KEYS = ['aperture', 'focal', 'mount', 'weight'] as const;

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
}

export default function FeaturedProduct({ product, dealerName }: Props) {
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

  const solValue = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const solAmount = solValue > 0 ? solValue : null;
  const specs = product.specs ?? {};
  const rows = FEATURED_SPEC_KEYS
    .map(k => ({ key: k, value: specs[k] }))
    .filter((r): r is { key: typeof FEATURED_SPEC_KEYS[number]; value: string } => !!r.value);
  const meta = [dealerName, product.category, specs.aperture]
    .filter(Boolean)
    .map(s => String(s).toUpperCase())
    .join(' · ');

  return (
    <div
      className="relative flex flex-col gap-[10px] p-[12px] sm:gap-[14px] sm:p-[18px] rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        border: '0.5px solid rgba(255, 209, 102,0.25)',
        background:
          'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(255, 209, 102,0.08) 0%, transparent 60%), rgba(255,255,255,0.01)',
      }}
    >
      <span className="absolute top-[12px] right-[14px] sm:top-[14px] sm:right-[16px] text-[10px] tracking-[0.3em] font-semibold text-[rgba(255, 209, 102,0.6)] z-10">
        FEATURED
      </span>

      <div
        className="relative rounded-lg overflow-hidden aspect-[2.2] sm:aspect-[1.25]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255, 209, 102,0.06) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '0.5px solid rgba(232,230,221,0.05)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 460px"
            className="p-[8px] sm:p-[22px]"
            style={{ objectFit: 'contain' }}
            priority
          />
        )}
      </div>

      <div className="flex flex-col">
        <p className="text-[10px] tracking-[0.26em] uppercase font-semibold text-[var(--terracotta)] mb-[8px]">Editor&rsquo;s Pick</p>
        <h2 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#E8E6DD] mb-[6px]">
          {product.name}
        </h2>
        {meta && (
          <p className="text-[12px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.72)] mb-[14px]">{meta}</p>
        )}

        {rows.length > 0 ? (
          <div
            className="grid grid-cols-2 gap-x-[16px] gap-y-[8px] py-[12px] mb-[16px]"
            style={{
              borderTop: '0.5px solid rgba(232,230,221,0.1)',
              borderBottom: '0.5px solid rgba(232,230,221,0.1)',
            }}
          >
            {rows.map(r => (
              <div key={r.key} className="flex justify-between gap-2">
                <span className="text-[12px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.65)]">{r.key}</span>
                <span className="text-[12px] font-medium text-[#E8E6DD] truncate">{r.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-[13px] leading-[1.5] text-[rgba(232,230,221,0.82)] py-[12px] mb-[16px] line-clamp-3"
            style={{
              borderTop: '0.5px solid rgba(232,230,221,0.1)',
              borderBottom: '0.5px solid rgba(232,230,221,0.1)',
            }}
          >
            {product.description}
          </p>
        )}

        {/* Mobile-only price + buttons layout — fills the row */}
        <div className="flex flex-col gap-[10px] sm:hidden">
          <div className="flex items-end justify-between gap-[12px]">
            <div className="flex flex-col gap-[4px] min-w-0">
              <p className="text-[26px] font-bold leading-none tracking-[-0.01em] text-[var(--terracotta)]">
                {formatPrice(product)}
              </p>
              {solAmount !== null && (
                <p className="text-[11px] tracking-[0.14em] uppercase font-medium text-[rgba(232,230,221,0.85)]">
                  ≈ <span className="text-[#E8E6DD]">{formatSol(solAmount)}</span> SOL
                </p>
              )}
            </div>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=sol`}
              className="inline-flex items-center justify-center gap-[8px] flex-1 max-w-[180px] px-[18px] py-[12px] rounded-[14px] text-[13px] font-semibold tracking-[0.005em] whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                border: 'none',
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(91, 108, 255, 0.28)',
              }}
            >
              <span aria-hidden className="text-[14px] leading-none">◎</span>
              <span>Pay SOL</span>
            </Link>
          </div>
          <div className="flex items-center justify-between gap-[10px]">
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=stars`}
              className="inline-flex items-center gap-[6px] text-[12px] tracking-[0.14em] uppercase font-semibold"
              style={{ color: '#A78BFA' }}
            >
              <span className="text-[14px] leading-none">★</span>
              <span>Pay {product.starsPrice.toLocaleString()} Stars</span>
            </Link>
            <a
              href={product.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] tracking-[0.14em] uppercase font-medium text-[rgba(232,230,221,0.7)]"
            >
              View →
            </a>
          </div>
        </div>

        {/* Desktop layout — unchanged */}
        <div className="hidden sm:flex flex-wrap justify-between items-end gap-3">
          <div className="flex flex-col gap-[6px]">
            <p className="text-[28px] font-bold leading-none tracking-[-0.01em] text-[var(--terracotta)] transition-all hover:scale-[1.06] hover:text-[#FFE08A] origin-left cursor-default">
              {formatPrice(product)}
            </p>
            {solAmount !== null && (
              <p className="text-[12px] tracking-[0.14em] uppercase font-medium text-[rgba(232,230,221,0.85)]">
                ≈ <span className="text-[#E8E6DD]">{formatSol(solAmount)}</span> SOL
              </p>
            )}
            <p
              className="inline-flex items-center gap-[5px] text-[12px] tracking-[0.14em] uppercase font-semibold transition-all hover:scale-[1.06] origin-left cursor-default"
              style={{ color: '#A78BFA' }}
            >
              <span className="text-[14px] leading-none">★</span>
              {product.starsPrice.toLocaleString()} stars
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-[10px] justify-end">
            <a
              href={product.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-[18px] py-[11px] rounded-[14px] text-[12px] font-medium tracking-[0.02em] transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
              style={{
                background: '#161A28',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              View
            </a>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=sol`}
              className="inline-flex items-center gap-[8px] px-[20px] py-[11px] rounded-[14px] text-[13px] font-semibold tracking-[0.005em] whitespace-nowrap transition-[filter,transform,box-shadow] duration-150 hover:brightness-[1.08] hover:-translate-y-[1px]"
              style={{
                background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                border: 'none',
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(91, 108, 255, 0.28)',
              }}
            >
              <span aria-hidden className="text-[14px] leading-none">◎</span>
              <span>Pay SOL</span>
            </Link>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=stars`}
              className="inline-flex items-center gap-[8px] px-[20px] py-[11px] rounded-[14px] text-[13px] font-medium tracking-[0.02em] whitespace-nowrap transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
              style={{
                background: '#161A28',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              <span aria-hidden className="text-[14px] leading-none" style={{ color: '#A78BFA' }}>★</span>
              <span>Pay Stars</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
