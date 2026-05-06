'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/dealers';

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

  const solAmount =
    product.currency === 'GEL' && solPerGEL > 0 ? product.price * solPerGEL :
    product.currency === 'USD' && solPriceUsd > 0 ? product.price / solPriceUsd :
    null;
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
        className="relative rounded-lg overflow-hidden aspect-[1.7] sm:aspect-[1.25]"
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
            className="p-[14px] sm:p-[22px]"
            style={{ objectFit: 'contain' }}
            unoptimized
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

        <div className="flex flex-wrap justify-between items-end gap-3">
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
          <div className="flex flex-wrap items-center gap-[8px] justify-end">
            <a
              href={product.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-[18px] py-[10px] rounded-lg text-[12px] font-bold tracking-[0.18em] uppercase transition-[filter,transform] hover:brightness-110"
              style={{
                background: 'transparent',
                border: '1px solid rgba(232,230,221,0.22)',
                color: '#E8E6DD',
              }}
            >
              View
            </a>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=sol`}
              className="inline-flex items-center gap-[6px] px-[16px] py-[10px] rounded-lg text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap transition-[filter,transform] hover:brightness-110"
              style={{
                background: 'var(--terracotta)',
                border: '1px solid var(--terracotta)',
                color: '#1a1208',
                boxShadow: '0 10px 28px -10px rgba(255, 209, 102, 0.55)',
              }}
            >
              <span aria-hidden className="text-[13px] leading-none">◎</span>
              <span>Pay SOL</span>
            </Link>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=stars`}
              className="inline-flex items-center gap-[6px] px-[16px] py-[10px] rounded-lg text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap transition-[filter,transform] hover:brightness-110"
              style={{
                background: '#A78BFA',
                border: '1px solid #A78BFA',
                color: '#150a2b',
                boxShadow: '0 10px 28px -10px rgba(167, 139, 250, 0.55)',
              }}
            >
              <span aria-hidden className="text-[14px] leading-none">★</span>
              <span>Pay Stars</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
