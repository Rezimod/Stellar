'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Replaces the mockup's "Earn Stars on every purchase" banner. Real CTA into the
// Stars earning surface (/earn). No fabricated reward percentage.
export default function EarnStarsCard() {
  const t = useTranslations('marketplacePage');
  return (
    <div
      className="rounded-xl p-[16px] sm:p-[20px] flex flex-col sm:flex-row sm:items-center gap-[14px] sm:justify-between"
      style={{ background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(255,179,71,0.30)' }}
    >
      <div className="flex items-center gap-[14px]">
        <span
          className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,179,71,0.12)', border: '1px solid rgba(255,179,71,0.35)' }}
        >
          <Star className="w-[18px] h-[18px]" style={{ color: 'var(--terracotta)', fill: 'var(--terracotta)' }} />
        </span>
        <div>
          <p className="font-display text-[16px] sm:text-[17px] text-white leading-tight" style={{ fontWeight: 600 }}>
            {t('earnStarsTitle')}
          </p>
          <p className="text-[12px] text-white/60 leading-snug mt-[3px]">{t('earnStarsSub')}</p>
        </div>
      </div>
      <Link
        href="/earn"
        className="inline-flex items-center justify-center h-[36px] px-[16px] rounded-none text-[12.5px] font-bold tracking-[0.02em] whitespace-nowrap transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px] self-start sm:self-auto"
        style={{
          background: 'var(--terracotta)',
          color: '#1a1208',
          boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
        }}
      >
        {t('earnStarsCta')}
      </Link>
    </div>
  );
}
