'use client';

import Image from 'next/image';
import type { Product } from '@/lib/dealers';

const DIFFICULTY_TAG: Record<'beginner' | 'intermediate' | 'advanced', { bg: string; color: string; abbr: string }> = {
  beginner:     { bg: 'rgba(94, 234, 212,0.12)',  color: 'var(--seafoam)', abbr: 'Beg' },
  intermediate: { bg: 'rgba(255, 209, 102,0.12)', color: 'var(--terracotta)', abbr: 'Mid' },
  advanced:     { bg: 'rgba(255, 209, 102,0.12)', color: 'var(--terracotta)', abbr: 'Adv' },
};

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

interface Props {
  product: Product;
  dealerName: string;
}

export default function ProductCard({ product, dealerName }: Props) {
  const tag = product.skillLevel ? DIFFICULTY_TAG[product.skillLevel] : null;
  return (
    <a
      href={product.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block rounded-lg p-[10px] transition-colors"
      style={{
        background: 'rgba(255,255,255,0.015)',
        border: '0.5px solid rgba(232,230,221,0.07)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255, 209, 102,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,221,0.07)'; }}
    >
      {tag && (
        <span
          className="absolute top-[7px] left-[7px] z-10 px-[6px] py-[2px] rounded-[3px] text-[8px] tracking-[0.18em] uppercase font-semibold"
          style={{ background: tag.bg, color: tag.color }}
        >
          {tag.abbr}
        </span>
      )}
      <div
        className="relative w-full aspect-[1.3] rounded-md mb-2 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255, 209, 102,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            style={{ objectFit: 'contain', padding: '14px' }}
            unoptimized
          />
        )}
      </div>
      <p className="text-[12px] font-medium text-[#E8E6DD] leading-[1.2] truncate mb-[2px]">
        {product.name}
      </p>
      <p className="text-[9px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.65)] mb-[6px] truncate">
        {dealerName || product.category}
      </p>
      <div className="flex justify-between items-center pt-[6px]" style={{ borderTop: '0.5px solid rgba(232,230,221,0.1)' }}>
        <span className="text-[13px] font-semibold text-[var(--terracotta)]">{formatPrice(product)}</span>
        <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-[var(--seafoam)]">
          ✦ {product.starsPrice.toLocaleString()}
        </span>
      </div>
    </a>
  );
}
