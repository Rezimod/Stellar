'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface Props {
  onShopTelescopes: () => void;
  onShopDeals: () => void;
}

// Hero leads the storefront. Backdrop is a real astrophoto (Andromeda) rather
// than a synthetic glow gradient, in keeping with the brand's "photograph where
// you can" principle.
export default function MarketplaceHero({ onShopTelescopes, onShopDeals }: Props) {
  const t = useTranslations('marketplacePage');
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(232,230,221,0.10)' }}>
      <Image
        src="/hero/andromeda.jpg"
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 1080px"
        className="object-cover"
        priority
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(7,11,20,0.94) 0%, rgba(7,11,20,0.80) 45%, rgba(7,11,20,0.35) 100%)' }}
      />
      <div className="relative z-10 flex items-center justify-between gap-[12px] px-[14px] py-[14px] sm:px-[32px] sm:py-[22px] min-h-[112px] sm:min-h-[160px]">
        <div className="max-w-[60%] sm:max-w-[56%]">
          <h1 className="font-display text-[21px] sm:text-[32px] leading-[1.1] text-white" style={{ fontWeight: 600 }}>
            {t('heroTitleLead')}{' '}
            <span style={{ color: 'var(--terracotta)' }}>{t('heroTitleAccent')}</span>
          </h1>
          <div className="mt-[10px] sm:mt-[14px] flex flex-wrap items-center gap-[8px]">
            <button
              onClick={onShopTelescopes}
              className="inline-flex items-center justify-center h-[32px] sm:h-[36px] px-[13px] sm:px-[16px] rounded-none text-[12px] sm:text-[12.5px] font-bold tracking-[0.02em] transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px]"
              style={{
                background: 'var(--terracotta)',
                color: '#1a1208',
                boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
              }}
            >
              {t('heroShopTelescopes')}
            </button>
            <button
              onClick={onShopDeals}
              className="inline-flex items-center justify-center h-[32px] sm:h-[36px] px-[13px] sm:px-[16px] rounded-none text-[12px] sm:text-[12.5px] font-semibold tracking-[0.02em] text-white transition-colors duration-150"
              style={{ background: 'rgba(15,18,28,0.55)', border: '1px solid rgba(255,255,255,0.22)' }}
            >
              {t('heroShopDeals')}
            </button>
          </div>
        </div>
        <div className="relative w-[42%] sm:w-[44%] h-[112px] sm:h-[164px] self-center flex-shrink-0">
          <Image
            src="/hero/telescope.png"
            alt={t('heroTelescopeAlt')}
            fill
            sizes="(max-width: 768px) 40vw, 420px"
            className="object-contain object-right drop-shadow-[0_10px_28px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>
    </div>
  );
}
