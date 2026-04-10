'use client';

import { useLocale, useTranslations } from 'next-intl';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import { Product } from '@/lib/products';

interface Props {
  product: Product;
  solPerGEL: number;
  onSelect: (p: Product) => void;
}

const CATEGORY_ART: Record<string, { emoji: string; label: string; bg: string; border: string }> = {
  telescope: { emoji: '🔭', label: 'Telescope',  bg: 'radial-gradient(ellipse at 30% 40%, rgba(56,240,255,0.12) 0%, rgba(10,22,40,0.95) 70%)',   border: 'rgba(56,240,255,0.15)' },
  moonlamp:  { emoji: '🌕', label: 'Moon Lamp',  bg: 'radial-gradient(ellipse at 60% 30%, rgba(255,209,102,0.12) 0%, rgba(26,26,46,0.95) 70%)',   border: 'rgba(255,209,102,0.15)' },
  projector: { emoji: '✨', label: 'Projector',  bg: 'radial-gradient(ellipse at 40% 60%, rgba(139,92,246,0.12) 0%, rgba(26,20,9,0.95) 70%)',     border: 'rgba(139,92,246,0.15)' },
  accessory: { emoji: '⚙️', label: 'Accessory',  bg: 'radial-gradient(ellipse at 50% 50%, rgba(100,116,139,0.1) 0%, rgba(13,17,23,0.95) 70%)',   border: 'rgba(100,116,139,0.15)' },
  digital:   { emoji: '🗺️', label: 'Digital',    bg: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.15) 0%, rgba(21,13,46,0.95) 70%)',    border: 'rgba(139,92,246,0.2)' },
};

export default function ProductCard({ product, solPerGEL, onSelect }: Props) {
  const t = useTranslations('marketplace');
  const locale = useLocale();
  const name = locale === 'ka' ? product.name.ka : product.name.en;
  const solPrice = (product.priceGEL * solPerGEL).toFixed(3);
  const art = CATEGORY_ART[product.category] ?? CATEGORY_ART.accessory;

  return (
    <div
      className={`glass-card flex flex-col overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${!product.inStock ? 'opacity-60' : ''}`}
      onClick={() => product.inStock && onSelect(product)}
    >
      {/* Image area — full square image */}
      <div
        className="relative w-full aspect-square flex items-center justify-center"
        style={{ background: art.bg }}
      >
        <span className="text-6xl select-none" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.15))' }}>
          {art.emoji}
        </span>
        {product.image && (
          <img
            src={product.image}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* Gradient overlay at bottom for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(10,14,26,0.85) 0%, transparent 100%)' }} />
        {product.featured && (
          <div className="absolute top-2 left-2">
            <Badge color="brass">{t('aiPick')}</Badge>
          </div>
        )}
        {!product.inStock && (
          <div className="absolute top-2 right-2">
            <Badge color="dim">{t('outOfStock')}</Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-3 flex-1" style={{ borderTop: `1px solid ${art.border}` }}>
        <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{name}</p>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-[#FFD166] font-bold text-base">{product.priceGEL} ₾</p>
          <p className="text-slate-500 text-xs">≈ {solPrice} SOL</p>
        </div>

        <Button
          variant="brass"
          className="w-full text-xs py-2 mt-auto"
          disabled={!product.inStock}
          onClick={e => { e.stopPropagation(); onSelect(product); }}
        >
          {t('buyNow')}
        </Button>
      </div>
    </div>
  );
}
