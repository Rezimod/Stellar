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
      className="relative grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-[14px] mb-[22px] p-4 rounded-xl overflow-hidden md:max-w-[760px] md:mx-auto"
      style={{
        border: '0.5px solid rgba(255, 209, 102,0.2)',
        background:
          'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(255, 209, 102,0.06) 0%, transparent 60%), rgba(255,255,255,0.01)',
      }}
    >
      <span className="absolute top-3 right-[14px] text-[9px] tracking-[0.3em] font-semibold text-[rgba(255, 209, 102,0.5)]">
        FEATURED
      </span>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          aspectRatio: '1.1',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255, 209, 102,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '0.5px solid rgba(232,230,221,0.05)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            style={{ objectFit: 'contain', padding: '18px' }}
            unoptimized
            priority
          />
        )}
      </div>

      <div className="flex flex-col justify-between py-1">
        <div>
          <p className="text-[9px] tracking-[0.24em] uppercase font-semibold text-[var(--terracotta)] mb-[6px]">Editor&rsquo;s Pick</p>
          <h2 className="text-[20px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#E8E6DD] mb-[4px]">
            {product.name}
          </h2>
          {meta && (
            <p className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)] mb-3">{meta}</p>
          )}

          {rows.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-x-[14px] gap-y-[6px] py-[10px] mb-[14px]"
              style={{
                borderTop: '0.5px solid rgba(232,230,221,0.1)',
                borderBottom: '0.5px solid rgba(232,230,221,0.1)',
              }}
            >
              {rows.map(r => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.65)]">{r.key}</span>
                  <span className="text-[11px] font-medium text-[#E8E6DD] truncate">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="text-[12px] leading-[1.4] text-[rgba(232,230,221,0.8)] py-[10px] mb-[14px] line-clamp-3"
              style={{
                borderTop: '0.5px solid rgba(232,230,221,0.1)',
                borderBottom: '0.5px solid rgba(232,230,221,0.1)',
              }}
            >
              {product.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-end gap-3">
          <div className="flex flex-col gap-[5px]">
            <p className="text-[24px] font-bold leading-none tracking-[-0.01em] text-[var(--terracotta)]">
              {formatPrice(product)}
            </p>
            {solAmount !== null && (
              <p className="text-[11px] tracking-[0.14em] uppercase font-medium text-[rgba(232,230,221,0.85)]">
                ≈ <span className="text-[#E8E6DD]">{formatSol(solAmount)}</span> SOL
              </p>
            )}
            <p className="inline-flex items-center gap-[5px] text-[11px] tracking-[0.14em] uppercase font-semibold text-[var(--seafoam)]">
              <span className="text-[13px] leading-none">✦</span>
              {product.starsPrice.toLocaleString()} stars
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={product.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--terracotta)] text-[#1a1208] px-[18px] py-[9px] rounded-full text-[11px] font-bold tracking-[0.18em] uppercase hover:opacity-90 transition-opacity"
            >
              View
            </a>
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}`}
              className="px-[16px] py-[9px] rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors"
              style={{
                background: 'rgba(94, 234, 212, 0.10)',
                border: '0.5px solid rgba(94, 234, 212, 0.45)',
                color: 'var(--seafoam)',
              }}
            >
              Pay SOL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
