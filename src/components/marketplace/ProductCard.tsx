'use client';

import Image from 'next/image';
import type { Product } from '@/lib/dealers';

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

// Approximate SOL conversion. TODO: wire to real /api/price/sol when available.
const SOL_TO_GEL = 305;
const formatSol = (p: Product): string | null => {
  if (p.currency !== 'GEL' && p.currency !== 'USD') return null;
  const gel = p.currency === 'USD' ? p.price * 2.7 : p.price;
  const sol = gel / SOL_TO_GEL;
  if (sol < 0.01) return null;
  return `~${sol.toFixed(2)} SOL`;
};

interface Props {
  product: Product;
  dealerName: string;
}

export default function ProductCard({ product, dealerName }: Props) {
  const sol = formatSol(product);
  return (
    <a
      href={product.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl p-3 transition-colors"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232, 130, 107,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-white">
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
      <p className="text-sm font-medium text-[var(--text)] line-clamp-1 mb-0.5">
        {product.name}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(232,230,221,0.4)] mb-2 truncate">
        {dealerName || product.category}
      </p>
      <div className="mt-auto flex items-baseline justify-between gap-2">
        <span className="text-base font-medium text-[var(--text)] font-mono">{formatPrice(product)}</span>
        {sol && (
          <span className="font-mono text-[10px] text-[rgba(232,230,221,0.4)]">{sol}</span>
        )}
      </div>
    </a>
  );
}
