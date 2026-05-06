'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/dealers';

const STARS_VIOLET = '#A78BFA';

const DIFFICULTY_TAG: Record<'beginner' | 'intermediate' | 'advanced', { color: string; border: string; abbr: string }> = {
  beginner:     { color: '#5EEAD4', border: 'rgba(94, 234, 212, 0.55)', abbr: 'Beg' },
  intermediate: { color: '#FFD166', border: 'rgba(255, 209, 102, 0.55)', abbr: 'Mid' },
  advanced:     { color: '#FB923C', border: 'rgba(251, 146, 60, 0.55)',  abbr: 'Adv' },
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

interface Props {
  product: Product;
  dealerName: string;
  solPerGEL?: number;
  solPriceUsd?: number;
}

export default function ProductCard({ product, dealerName, solPerGEL = 0, solPriceUsd = 0 }: Props) {
  const tag = product.skillLevel ? DIFFICULTY_TAG[product.skillLevel] : null;
  const checkoutHref = (mode: 'sol' | 'stars') =>
    `/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=${mode}`;

  const solAmount =
    product.currency === 'GEL' && solPerGEL > 0 ? product.price * solPerGEL :
    product.currency === 'USD' && solPriceUsd > 0 ? product.price / solPriceUsd :
    null;

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
          className="absolute top-[10px] left-[10px] z-10 px-[8px] py-[3px] rounded-[4px] text-[9px] tracking-[0.18em] uppercase font-bold"
          style={{
            background: 'rgba(11, 14, 23, 0.92)',
            color: tag.color,
            border: `1px solid ${tag.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
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
              loading="lazy"
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
        className="flex justify-between items-end pt-[8px] mb-[8px] gap-[8px]"
        style={{ borderTop: '1px solid rgba(232,230,221,0.10)' }}
      >
        <div className="flex flex-col gap-[1px] min-w-0">
          <span className="text-[15px] font-semibold text-[var(--terracotta)] transition-colors group-hover:text-[#FFE08A] leading-none">
            {formatPrice(product)}
          </span>
          {solAmount !== null && (
            <span className="text-[9px] tracking-[0.10em] uppercase text-[rgba(232,230,221,0.55)] leading-none mt-[3px]">
              ≈ <span className="text-[rgba(232,230,221,0.85)]">{formatSol(solAmount)}</span> SOL
            </span>
          )}
        </div>
        <span
          className="text-[11px] tracking-[0.10em] uppercase font-bold whitespace-nowrap"
          style={{ color: STARS_VIOLET }}
        >
          ★ {product.starsPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-[5px]">
        <Link
          href={checkoutHref('sol')}
          className="flex-1 inline-flex items-center justify-center gap-[3px] px-[6px] py-[7px] rounded-lg text-[10px] tracking-[0.10em] uppercase font-bold whitespace-nowrap transition-[filter,transform] hover:brightness-110"
          style={{
            background: 'var(--terracotta)',
            border: '1px solid var(--terracotta)',
            color: '#1a1208',
            boxShadow: '0 6px 18px -10px rgba(255, 209, 102, 0.55)',
          }}
          aria-label={`Pay for ${product.name} with SOL`}
        >
          <span aria-hidden className="text-[11px] leading-none">◎</span>
          <span>SOL</span>
        </Link>
        <Link
          href={checkoutHref('stars')}
          className="flex-1 inline-flex items-center justify-center gap-[3px] px-[6px] py-[7px] rounded-lg text-[10px] tracking-[0.10em] uppercase font-bold whitespace-nowrap transition-[filter,transform] hover:brightness-110"
          style={{
            background: STARS_VIOLET,
            border: `1px solid ${STARS_VIOLET}`,
            color: '#150a2b',
            boxShadow: '0 6px 18px -10px rgba(167, 139, 250, 0.55)',
          }}
          aria-label={`Redeem ${product.name} with stars`}
        >
          <span aria-hidden className="text-[12px] leading-none">★</span>
          <span>Stars</span>
        </Link>
      </div>
    </div>
  );
}
