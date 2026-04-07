'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Telescope, Moon, Star, Wrench, Sparkles } from 'lucide-react';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import { Product } from '@/lib/products';

interface Props {
  product: Product;
  solPerGEL: number;
  onSelect: (p: Product) => void;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  telescope: <Telescope size={32} className="text-[#38F0FF]/40" />,
  moonlamp:  <Moon size={32} className="text-slate-400/40" />,
  projector: <Star size={32} className="text-[#FFD166]/40" />,
  accessory: <Wrench size={32} className="text-slate-500/40" />,
  digital:   <Sparkles size={32} className="text-[#8B5CF6]/40" />,
};

const CATEGORY_GRADIENT: Record<string, string> = {
  telescope: 'from-[#0a1628] to-[#0e2040]',
  moonlamp:  'from-[#1a1a2e] to-[#16213e]',
  projector: 'from-[#1a1409] to-[#2a1f05]',
  accessory: 'from-[#0d1117] to-[#161b22]',
  digital:   'from-[#150d2e] to-[#1e1040]',
};

export default function ProductCard({ product, solPerGEL, onSelect }: Props) {
  const t = useTranslations('marketplace');
  const locale = useLocale();
  const name = locale === 'ka' ? product.name.ka : product.name.en;
  const solPrice = (product.priceGEL * solPerGEL).toFixed(3);

  return (
    <div
      className={`glass-card flex flex-col overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${!product.inStock ? 'opacity-60' : ''}`}
      onClick={() => product.inStock && onSelect(product)}
    >
      {/* Image area */}
      <div className={`relative w-full aspect-video bg-gradient-to-br ${CATEGORY_GRADIENT[product.category]} flex items-center justify-center`}>
        <img
          src={product.image}
          alt={name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {CATEGORY_ICON[product.category]}
        </div>
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
      <div className="flex flex-col gap-2 p-3 flex-1">
        <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{name}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge color="dim">{product.category}</Badge>
          {product.aiRecommendFor?.length ? <Badge color="cyan">{t('aiPick')}</Badge> : null}
        </div>

        {/* Price */}
        <div className="mt-auto pt-2">
          <p className="text-white font-bold">{product.priceGEL} ₾</p>
          <p className="text-slate-500 text-xs">≈ {solPrice} SOL</p>
        </div>

        <Button
          variant="brass"
          className="w-full text-xs py-2 mt-1"
          disabled={!product.inStock}
          onClick={e => { e.stopPropagation(); onSelect(product); }}
        >
          {t('buyNow')}
        </Button>
      </div>
    </div>
  );
}
