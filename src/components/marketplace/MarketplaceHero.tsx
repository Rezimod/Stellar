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
      <div className="relative z-10 flex items-center justify-between gap-[12px] px-[14px] py-[12px] sm:px-[28px] sm:py-[18px] min-h-[104px] sm:min-h-[160px]">
        <div className="max-w-[62%] sm:max-w-[58%]">
          <h1 className="font-display text-[19px] sm:text-[28px] leading-[1.1] text-white" style={{ fontWeight: 600 }}>
            {t('heroTitleLead')}{' '}
            <span style={{ color: 'var(--terracotta)' }}>{t('heroTitleAccent')}</span>
          </h1>
          <p className="mt-[5px] sm:mt-[8px] text-[12px] sm:text-[13.5px] leading-[1.4] text-white/70 max-w-[36ch]">
            {t('heroSubtitle')}
          </p>
          <div className="mt-[9px] sm:mt-[14px] flex flex-wrap items-center gap-[8px]">
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
        <div className="relative w-[34%] sm:w-[36%] aspect-square self-end flex-shrink-0">
          <Image
            src="https://astroman.ge/wp-content/uploads/2024/08/Telescope.jpg"
            alt={t('heroTelescopeAlt')}
            fill
            sizes="(max-width: 768px) 34vw, 360px"
            className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
          />
        </div>
      </div>
    </div>
  );
}
