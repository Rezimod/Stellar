'use client';

import Link from 'next/link';
import { Star, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { priceToSol, priceToUsd } from '@/lib/dealers';
import { MARKETPLACE_STARS_PER_GEL } from '@/lib/stars-economy';

interface Props {
  balance: number;
  signedIn: boolean;
  solPerGEL: number;
  solPriceUsd: number;
}

const fmtUsd = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(2));
const fmtSol = (n: number) => (n >= 10 ? n.toFixed(2) : n.toFixed(3));

// The fiat/SOL equivalents are conversions of the *Stars balance* (Stars → GEL
// list-price equivalent → USD/SOL via the live rate). Real numbers only.
export default function MarketplaceBalanceCard({ balance, signedIn, solPerGEL, solPriceUsd }: Props) {
  const t = useTranslations('marketplacePage');
  const gel = balance > 0 ? balance / MARKETPLACE_STARS_PER_GEL : 0;
  const usd = priceToUsd(gel, 'GEL', solPerGEL, solPriceUsd);
  const sol = priceToSol(gel, 'GEL', solPerGEL, solPriceUsd);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr] gap-[14px] sm:gap-[16px]">
      {/* Balance */}
      <div
        className="rounded-xl p-[16px] sm:p-[18px] flex items-center justify-between gap-[12px]"
        style={{ background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(232,230,221,0.10)' }}
      >
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.16em] uppercase text-white/55 mb-[6px]">{t('yourBalance')}</p>
          <div className="flex items-baseline gap-[8px]">
            <Star className="w-[18px] h-[18px] flex-shrink-0 self-center" style={{ color: 'var(--terracotta)', fill: 'var(--terracotta)' }} />
            <span className="font-mono tabular-nums text-[26px] sm:text-[30px] font-semibold leading-none text-white">
              {balance.toLocaleString()}
            </span>
            <span className="text-[12px] tracking-[0.14em] uppercase text-white/55">{t('starsLabel')}</span>
          </div>
          {!signedIn && (
            <p className="mt-[8px] text-[11px] text-white/55">{t('signInToEarn')}</p>
          )}
        </div>
        {balance > 0 && (usd > 0 || sol > 0) && (
          <div className="text-right shrink-0">
            {usd > 0 && (
              <p className="font-mono tabular-nums text-[14px] text-white leading-tight">≈ ${fmtUsd(usd)}</p>
            )}
            {sol > 0 && (
              <p className="font-mono tabular-nums text-[12px] text-white/55 leading-tight">{fmtSol(sol)} SOL</p>
            )}
          </div>
        )}
      </div>

      {/* Redeem companion (replaces the mockup's fake countdown promo) */}
      <Link
        href="/earn"
        className="group rounded-xl p-[16px] sm:p-[18px] flex flex-col justify-center transition-[background,border-color] duration-150"
        style={{ background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(255,179,71,0.30)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,0.30)'; }}
      >
        <div className="flex items-center gap-[8px] mb-[6px]">
          <Tag className="w-[16px] h-[16px]" style={{ color: 'var(--terracotta)' }} />
          <span className="text-[13px] font-semibold text-white">{t('redeemStars')}</span>
        </div>
        <p className="text-[11.5px] leading-[1.45] text-white/60">{t('redeemStarsCopy')}</p>
        <span className="mt-[10px] text-[10.5px] tracking-[0.16em] uppercase font-semibold text-white/55 group-hover:text-[var(--terracotta)] transition-colors">
          {t('redeemStarsCta')}
        </span>
      </Link>
    </div>
  );
}
