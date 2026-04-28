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
    .map(s => String(s).toUpperCase())
    .join(' · ');

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-[14px] mb-[22px] p-4 rounded-xl overflow-hidden"
      style={{
        border: '0.5px solid rgba(255,209,102,0.2)',
        background:
          'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(255,209,102,0.06) 0%, transparent 60%), rgba(255,255,255,0.01)',
      }}
    >
      <span className="absolute top-3 right-[14px] text-[8px] tracking-[0.3em] font-semibold text-[rgba(255,209,102,0.5)]">
        FEATURED
      </span>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          aspectRatio: '1.4',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,209,102,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '0.5px solid rgba(232,230,221,0.05)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            style={{ objectFit: 'contain', padding: '24px' }}
            unoptimized
            priority
          />
        )}
      </div>

      <div className="flex flex-col justify-between py-1">
        <div>
          <p className="text-[8px] tracking-[0.24em] uppercase font-semibold text-[#FFD166] mb-[6px]">Editor&rsquo;s Pick</p>
          <h2 className="text-[18px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#E8E6DD] mb-[4px]">
            {product.name}
          </h2>
          {meta && (
            <p className="text-[10px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.5)] mb-3">{meta}</p>
          )}

          {rows.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-x-[14px] gap-y-[6px] py-[10px] mb-[14px]"
              style={{
                borderTop: '0.5px solid rgba(232,230,221,0.06)',
                borderBottom: '0.5px solid rgba(232,230,221,0.06)',
              }}
            >
              {rows.map(r => (
                <div key={r.key} className="flex justify-between gap-2">
                  <span className="text-[10px] tracking-[0.1em] uppercase text-[rgba(232,230,221,0.4)]">{r.key}</span>
                  <span className="text-[10px] font-medium text-[#E8E6DD] truncate">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="text-[11px] leading-[1.4] text-[rgba(232,230,221,0.6)] py-[10px] mb-[14px] line-clamp-3"
              style={{
                borderTop: '0.5px solid rgba(232,230,221,0.06)',
                borderBottom: '0.5px solid rgba(232,230,221,0.06)',
              }}
            >
              {product.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-end gap-3">
          <div>
            <p className="text-[22px] font-bold leading-none tracking-[-0.01em] text-[#FFD166]">
              {formatPrice(product)}
            </p>
            <p className="text-[9px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.4)] mt-[4px]">
              ✦ {product.starsPrice.toLocaleString()} stars
            </p>
          </div>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#FFD166] text-[#1a1208] px-[18px] py-[9px] rounded-full text-[10px] font-bold tracking-[0.18em] uppercase hover:opacity-90 transition-opacity"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}
