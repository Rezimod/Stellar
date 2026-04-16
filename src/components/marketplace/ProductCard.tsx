'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/dealers';

interface Props {
  product: Product;
  showDealer: boolean;
  dealerName: string;
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Best Seller': { bg: 'rgba(255,209,102,0.15)', color: '#FFD166' },
  'New': { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
  'Popular': { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
};

const SKILL_BADGE_STYLES: Record<string, { background: string; color: string; border: string }> = {
  beginner: { background: 'rgba(52,211,153,0.28)', color: '#34d399', border: '1px solid rgba(52,211,153,0.55)' },
  intermediate: { background: 'rgba(245,158,11,0.28)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.55)' },
  advanced: { background: 'rgba(139,92,246,0.28)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.55)' },
};

const CATEGORY_FALLBACK: Record<string, { icon: string; label: string; bg: string }> = {
  telescope: { icon: '🔭', label: 'Telescope', bg: 'rgba(122,95,255,0.07)' },
  eyepiece:  { icon: '🔬', label: 'Eyepiece',  bg: 'rgba(99,102,241,0.06)' },
  binocular: { icon: '🌌', label: 'Binoculars', bg: 'rgba(20,184,166,0.07)' },
  accessory: { icon: '🔧', label: 'Accessory', bg: 'rgba(245,158,11,0.07)' },
};

export default function ProductCard({ product, showDealer, dealerName }: Props) {
  const [imgError, setImgError] = useState(false);
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;
  const fallback = CATEGORY_FALLBACK[product.category] ?? CATEGORY_FALLBACK.telescope;
  const showImg = !!product.image && !imgError;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="relative flex-shrink-0" style={{
        aspectRatio: '1 / 1',
        background: showImg ? 'rgba(0,0,0,0.3)' : fallback.bg,
        overflow: 'hidden',
      }}>
        {showImg ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: 'contain', padding: '12px' }}
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl leading-none">{fallback.icon}</span>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {fallback.label}
            </p>
          </div>
        )}
        {badgeStyle && (
          <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
            {product.badge}
          </span>
        )}
        {product.skillLevel && (
          <span
            className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
            style={SKILL_BADGE_STYLES[product.skillLevel]}
          >
            {product.skillLevel === 'intermediate' ? 'Mid' : product.skillLevel}
          </span>
        )}
      </div>

      <div className="flex flex-col p-3 gap-1.5">
        <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{product.name}</p>

        {product.specs && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
              <span key={k} className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                {v}
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] line-clamp-2 leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-1.5">
          <div>
            <p className="text-white font-bold text-sm leading-none">
              {product.currencySymbol}{product.price % 1 !== 0 ? product.price.toFixed(2) : product.price.toLocaleString()}
            </p>
            {showDealer && (
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                via {dealerName}
              </p>
            )}
          </div>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Buy →
          </a>
        </div>
      </div>
    </div>
  );
}
