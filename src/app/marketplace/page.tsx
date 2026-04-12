'use client';

import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useLocation } from '@/lib/location';
import LocationPicker from '@/components/LocationPicker';
import { getProductsByRegion, getDealersByRegion, GLOBAL_FALLBACK } from '@/lib/dealers';
import type { Product } from '@/lib/dealers';
import StarsRedemption from '@/components/shared/StarsRedemption';
import BackButton from '@/components/shared/BackButton';
import { ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import Image from 'next/image';

type CategoryFilter = 'all' | 'telescope' | 'eyepiece' | 'binocular' | 'accessory';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'telescope', label: 'Telescopes' },
  { key: 'eyepiece', label: 'Eyepieces' },
  { key: 'binocular', label: 'Binoculars' },
  { key: 'accessory', label: 'Accessories' },
];

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Best Seller': { bg: 'rgba(255,209,102,0.15)', color: '#FFD166' },
  'New': { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
  'Popular': { bg: 'rgba(56,240,255,0.15)', color: '#38F0FF' },
};

const CATEGORY_FALLBACK: Record<string, { icon: string; label: string; bg: string }> = {
  telescope: { icon: '🔭', label: 'Telescope', bg: 'rgba(122,95,255,0.07)' },
  eyepiece:  { icon: '🔬', label: 'Eyepiece',  bg: 'rgba(56,240,255,0.06)' },
  binocular: { icon: '🌌', label: 'Binoculars', bg: 'rgba(20,184,166,0.07)' },
  accessory: { icon: '🔧', label: 'Accessory', bg: 'rgba(245,158,11,0.07)' },
};

function ProductCard({ product, showDealer, dealerName }: {
  product: Product;
  showDealer: boolean;
  dealerName: string;
}) {
  const [imgError, setImgError] = useState(false);
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;
  const fallback = CATEGORY_FALLBACK[product.category] ?? CATEGORY_FALLBACK.telescope;
  const firstSpec = product.specs ? Object.values(product.specs)[0] : null;
  const showImg = !!product.image && !imgError;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Image — fixed height so all cards align */}
      <div className="relative flex-shrink-0" style={{ height: 140, background: showImg ? 'rgba(0,0,0,0.2)' : fallback.bg }}>
        {showImg ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: 'cover' }}
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <span className="text-4xl leading-none">{fallback.icon}</span>
            <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {fallback.label}
            </p>
          </div>
        )}
        {badgeStyle && (
          <span
            className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: badgeStyle.bg, color: badgeStyle.color }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Info — fixed layout, no flex-1 stretching */}
      <div className="flex flex-col p-2 gap-1">
        <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{product.name}</p>
        <p className="text-[10px] line-clamp-2 leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {product.description}
        </p>

        {firstSpec && (
          <span
            className="self-start text-[10px] px-1.5 py-0.5 rounded mt-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
          >
            {firstSpec}
          </span>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-1">
          <div>
            <p className="text-white font-bold text-sm leading-none">
              {product.currencySymbol}{product.price % 1 !== 0 ? product.price.toFixed(2) : product.price.toLocaleString()}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#14B8A6' }}>
              {product.starsPrice.toLocaleString()} ✦
            </p>
          </div>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 min-h-[44px] flex items-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Buy →
          </a>
        </div>

        {showDealer && (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            via {dealerName}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { state } = useAppState();
  const { location } = useLocation();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [starsBalance, setStarsBalance] = useState(0);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [address]);

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);

  const dealers = getDealersByRegion(location.region);
  const allProducts = getProductsByRegion(location.region);
  const showDealer = dealers.length > 1;

  const products = filter === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === filter);

  function getDealerName(dealerId: string): string {
    return dealers.find(d => d.id === dealerId)?.name ?? dealerId;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          Marketplace
        </h1>
        <LocationPicker compact />
      </div>

      {/* Dealer branding */}
      <div className="mb-5">
        {dealers.length === 1 ? (
          <a
            href={dealers[0].website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
            style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}
          >
            Powered by {dealers[0].name} <ExternalLink size={11} />
          </a>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Showing picks from {dealers.length} partner stores
          </p>
        )}
      </div>

      {/* Stars redemption */}
      {authenticated && (
        <div className="mb-5">
          <StarsRedemption starsBalance={starsBalance || totalStars} walletAddress={address ?? undefined} />
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-5 scrollbar-hide">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={
              filter === f.key
                ? { background: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.3)', color: '#34d399' }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-white font-semibold">No stores in your region yet</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Products from Astroman ship worldwide.
            </p>
          </div>
          <div className="grid gap-3 grid-cols-2">
            {GLOBAL_FALLBACK.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                showDealer={false}
                dealerName="Astroman"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              showDealer={showDealer}
              dealerName={getDealerName(p.dealerId)}
            />
          ))}
        </div>
      )}

      {/* Partner banner */}
      <div
        className="mt-10 py-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-white font-semibold text-sm mb-1">Become a Partner Store</p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Sell your telescopes to astronomers worldwide through Stellar.
        </p>
        <a
          href="mailto:rezi@astroman.ge"
          className="text-xs"
          style={{ color: '#34d399' }}
        >
          Contact us →
        </a>
      </div>
    </div>
  );
}
