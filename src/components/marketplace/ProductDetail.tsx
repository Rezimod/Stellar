'use client';

import { useEffect, useState } from 'react';
import { X, Telescope, Moon, Star, Wrench, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import { Product } from '@/lib/products';

interface Props {
  product: Product;
  solPerGEL: number;
  onClose: () => void;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  telescope: <Telescope size={40} className="text-[#38F0FF]/40" />,
  moonlamp:  <Moon size={40} className="text-slate-400/40" />,
  projector: <Star size={40} className="text-[#FFD166]/40" />,
  accessory: <Wrench size={40} className="text-slate-500/40" />,
  digital:   <Sparkles size={40} className="text-[#8B5CF6]/40" />,
};

const CATEGORY_GRADIENT: Record<string, string> = {
  telescope: 'from-[#0a1628] to-[#0e2040]',
  moonlamp:  'from-[#1a1a2e] to-[#16213e]',
  projector: 'from-[#1a1409] to-[#2a1f05]',
  accessory: 'from-[#0d1117] to-[#161b22]',
  digital:   'from-[#150d2e] to-[#1e1040]',
};

export default function ProductDetail({ product, solPerGEL, onClose }: Props) {
  const t = useTranslations('marketplace');
  const locale = useLocale();
  const name = locale === 'ka' ? product.name.ka : product.name.en;
  const description = locale === 'ka' ? product.description.ka : product.description.en;
  const solPrice = (product.priceGEL * solPerGEL).toFixed(3);

  const [visible, setVisible] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleCardPay = () => {
    const timestamp = Date.now();
    const ref = `STELLAR-${product.id}-${timestamp}`;
    try {
      const prev = JSON.parse(localStorage.getItem('stellar_orders') ?? '[]') as unknown[];
      localStorage.setItem('stellar_orders', JSON.stringify([...prev, { product, timestamp, ref }]));
    } catch { /* ignore */ }
    setOrderRef(ref);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-end sm:justify-end"
      onClick={handleClose}
    >
      {/* Mobile: bottom sheet | Desktop: right panel */}
      <div
        className={`
          w-full sm:w-96 sm:h-full
          bg-[#0F1827]
          border-t sm:border-t-0 sm:border-l border-[#38F0FF]/10
          flex flex-col
          transition-transform duration-300
          rounded-t-2xl sm:rounded-none
          max-h-[90dvh] sm:max-h-full
          ${visible
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
          }
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className={`relative w-full aspect-video flex-shrink-0 bg-gradient-to-br ${CATEGORY_GRADIENT[product.category]} flex items-center justify-center`}>
          <img
            src={product.image}
            alt={name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {CATEGORY_ICON[product.category]}
          </div>
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
          {/* Name + badges */}
          <div>
            <h2 className="text-white font-bold text-lg leading-snug mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              {name}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge color="dim">{product.category}</Badge>
              {product.featured && <Badge color="brass">{t('aiPick')}</Badge>}
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-400 text-sm leading-relaxed">{description}</p>

          {/* AI recommendations */}
          {product.aiRecommendFor?.length ? (
            <p className="text-[#38F0FF] text-xs">
              ASTRA recommends for: {product.aiRecommendFor.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
            </p>
          ) : null}

          {/* Price */}
          <div>
            <p className="text-white text-3xl font-bold">{product.priceGEL} ₾</p>
            <p className="text-slate-500 text-sm">≈ {solPrice} SOL</p>
          </div>

          {/* Order confirmation */}
          {orderRef ? (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <p className="text-[#34d399] font-semibold mb-2">{t('contactPrompt')}:</p>
              <p className="text-slate-300">📞 +995 555 123 456</p>
              <p className="text-slate-300">💬 Telegram: @astroman_ge</p>
              <p className="text-slate-500 text-xs mt-2">Reference: <span className="font-mono text-slate-400">{orderRef}</span></p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="brass" className="w-full" onClick={handleCardPay}>
                {t('payCard')}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm py-2"
                onClick={() => alert(t('solComingSoon'))}
              >
                {t('paySol')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
