'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/dealers';

const DIFFICULTY_TAG: Record<'beginner' | 'intermediate' | 'advanced', { bg: string; color: string; abbr: string }> = {
  beginner:     { bg: 'rgba(94, 234, 212,0.14)',  color: 'var(--seafoam)',     abbr: 'Beg' },
  intermediate: { bg: 'rgba(255, 209, 102,0.14)', color: 'var(--terracotta)', abbr: 'Mid' },
  advanced:     { bg: 'rgba(255, 209, 102,0.14)', color: 'var(--terracotta)', abbr: 'Adv' },
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
  const checkoutHref = (mode: 'sol' | 'stars') =>
    `/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=${mode}`;

  return (
    <div
      className="group relative flex flex-col rounded-lg p-[10px] transition-all duration-200 hover:-translate-y-[2px]"
      style={{
        background: 'rgba(232,230,221,0.045)',
        border: '1px solid rgba(232,230,221,0.10)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255, 209, 102,0.40)';
        e.currentTarget.style.background = 'rgba(232,230,221,0.075)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(232,230,221,0.10)';
        e.currentTarget.style.background = 'rgba(232,230,221,0.045)';
      }}
    >
      {tag && (
        <span
          className="absolute top-[10px] left-[10px] z-10 px-[8px] py-[3px] rounded-[4px] text-[9px] tracking-[0.18em] uppercase font-semibold"
          style={{ background: tag.bg, color: tag.color, border: `1px solid ${tag.color === 'var(--seafoam)' ? 'rgba(94,234,212,0.35)' : 'rgba(255,209,102,0.35)'}` }}
        >
          {tag.abbr}
        </span>
      )}
      <a
        href={product.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={`View ${product.name} on dealer site`}
      >
        <div
          className="relative w-full aspect-[1.25] rounded-md mb-[10px] overflow-hidden"
          style={{
            background: 'rgba(232,230,221,0.92)',
          }}
        >
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 220px"
              style={{ objectFit: 'contain', padding: '12px' }}
              unoptimized
            />
          )}
        </div>
        <p className="text-[13px] font-medium text-[#E8E6DD] leading-[1.25] truncate mb-[2px] group-hover:text-white transition-colors">
          {product.name}
        </p>
        <p className="text-[10px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.6)] mb-[8px] truncate">
          {dealerName || product.category}
        </p>
      </a>
      <div
        className="flex justify-between items-baseline pt-[8px] mb-[8px]"
        style={{ borderTop: '1px solid rgba(232,230,221,0.10)' }}
      >
        <span className="text-[15px] font-semibold text-[var(--terracotta)] transition-colors group-hover:text-[#FFE08A]">
          {formatPrice(product)}
        </span>
        <span className="text-[11px] tracking-[0.12em] uppercase font-semibold text-[var(--seafoam)]">
          ✦ {product.starsPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-[6px]">
        <Link
          href={checkoutHref('sol')}
          className="flex-1 text-center px-[8px] py-[9px] rounded-lg text-[11px] tracking-[0.14em] uppercase font-bold transition-[filter,transform] hover:brightness-110"
          style={{
            background: 'var(--terracotta)',
            border: '1px solid var(--terracotta)',
            color: '#1a1208',
            boxShadow: '0 8px 22px -10px rgba(255, 209, 102, 0.55)',
          }}
          aria-label={`Pay for ${product.name} with SOL`}
        >
          Pay SOL
        </Link>
        <Link
          href={checkoutHref('stars')}
          className="flex-1 text-center px-[8px] py-[9px] rounded-lg text-[11px] tracking-[0.14em] uppercase font-bold transition-[filter,transform] hover:brightness-110"
          style={{
            background: 'var(--seafoam)',
            border: '1px solid var(--seafoam)',
            color: '#06231f',
            boxShadow: '0 8px 22px -10px rgba(94, 234, 212, 0.55)',
          }}
          aria-label={`Redeem ${product.name} with stars`}
        >
          Pay Stars
        </Link>
      </div>
    </div>
  );
}
