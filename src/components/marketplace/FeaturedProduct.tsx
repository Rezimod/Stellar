'use client';

import Image from 'next/image';
import type { Product } from '@/lib/dealers';

const FEATURED_SPEC_KEYS = ['aperture', 'focal', 'mount', 'weight'] as const;

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

interface Props {
  product: Product;
  dealerName: string;
}

export default function FeaturedProduct({ product, dealerName }: Props) {
  const specs = product.specs ?? {};
  const rows = FEATURED_SPEC_KEYS
    .map(k => ({ key: k, value: specs[k] }))
    .filter((r): r is { key: typeof FEATURED_SPEC_KEYS[number]; value: string } => !!r.value);
  const meta = [dealerName, product.category, specs.aperture]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 mb-6 p-4 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="relative w-full aspect-[4/3] md:aspect-auto rounded-xl overflow-hidden bg-white">
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            style={{ objectFit: 'contain', padding: '20px' }}
            unoptimized
            priority
          />
        )}
      </div>

      <div className="flex flex-col justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--terracotta)] mb-2">
            Editor&rsquo;s Pick
          </p>
          <h2 className="font-display text-xl font-medium leading-tight tracking-tight text-[var(--text)] mb-1">
            {product.name}
          </h2>
          {meta && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(232,230,221,0.45)] mb-3">
              {meta}
            </p>
          )}

          {rows.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-3 border-y border-[var(--border)] mb-3">
              {rows.map(r => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(232,230,221,0.4)]">{r.key}</span>
                  <span className="text-xs font-medium text-[var(--text)] truncate">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[rgba(232,230,221,0.6)] py-3 border-y border-[var(--border)] mb-3 line-clamp-3">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-end gap-3">
          <div>
            <p className="font-mono text-xl font-semibold leading-none text-[var(--text)]">
              {formatPrice(product)}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(232,230,221,0.45)] mt-1">
              ✦ {product.starsPrice.toLocaleString()} stars
            </p>
          </div>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-full text-sm font-medium tracking-wide transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}
