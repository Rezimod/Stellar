'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import SolanaPayModal from './SolanaPayModal';
import { Product } from '@/lib/products';

interface Props {
  product: Product;
  solPerGEL: number;
  onClose: () => void;
}

const CATEGORY_ART: Record<string, { emoji: string; bg: string }> = {
  telescope: { emoji: '🔭', bg: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.12) 0%, rgba(10,22,40,0.95) 70%)' },
  moonlamp:  { emoji: '🌕', bg: 'radial-gradient(ellipse at 60% 30%, rgba(255,209,102,0.12) 0%, rgba(26,26,46,0.95) 70%)' },
  projector: { emoji: '✨', bg: 'radial-gradient(ellipse at 40% 60%, rgba(139,92,246,0.12) 0%, rgba(26,20,9,0.95) 70%)' },
  accessory: { emoji: '⚙️', bg: 'radial-gradient(ellipse at 50% 50%, rgba(100,116,139,0.1) 0%, rgba(13,17,23,0.95) 70%)' },
  digital:   { emoji: '🗺️', bg: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.15) 0%, rgba(21,13,46,0.95) 70%)' },
};

export default function ProductDetail({ product, solPerGEL, onClose }: Props) {
  const t = useTranslations('marketplace');
  const locale = useLocale();
  const name = locale === 'ka' ? product.name.ka : product.name.en;
  const description = locale === 'ka' ? product.description.ka : product.description.en;
  const solPrice = (product.priceGEL * solPerGEL).toFixed(3);

  const [visible, setVisible] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [showSolanaPay, setShowSolanaPay] = useState(false);

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

  const solOrderId = `STELLAR-${product.id}-${Date.now()}`;

  return (
    <>
    {showSolanaPay && (
      <SolanaPayModal
        productName={locale === 'ka' ? product.name.ka : product.name.en}
        amountSOL={parseFloat(solPrice)}
        priceGEL={product.priceGEL}
        orderId={solOrderId}
        onConfirmed={(sig) => {
          setShowSolanaPay(false);
          setOrderRef(`SOL-${sig.slice(0, 12)}`);
        }}
        onClose={() => setShowSolanaPay(false)}
      />
    )}
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-end sm:justify-end"
      onClick={handleClose}
    >
      {/* Mobile: bottom sheet | Desktop: right panel */}
      <div
        className={`
          w-full sm:w-96 sm:h-full
          bg-[#0F1827]
          border-t sm:border-t-0 sm:border-l border-[#818cf8]/10
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
        {(() => {
          const art = CATEGORY_ART[product.category] ?? CATEGORY_ART.accessory;
          return (
            <div
              className="relative w-full aspect-video flex-shrink-0 flex items-center justify-center"
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
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
              >
                <X size={15} />
              </button>
            </div>
          );
        })()}

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
            <p className="text-[#818cf8] text-xs">
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
                onClick={() => setShowSolanaPay(true)}
              >
                {t('paySol')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
