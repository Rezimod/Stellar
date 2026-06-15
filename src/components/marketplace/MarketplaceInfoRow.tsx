'use client';

import { useRouter } from 'next/navigation';
import { Star, Tag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  /** Scroll to the curated Featured Deals rail (the real "community picks"). */
  onCommunityPicks: () => void;
}

export default function MarketplaceInfoRow({ onCommunityPicks }: Props) {
  const t = useTranslations('marketplacePage');
  const router = useRouter();

  const cards = [
    { icon: Star, titleKey: 'infoEarnTitle', subKey: 'infoEarnSub', onClick: () => router.push('/earn') },
    { icon: Tag, titleKey: 'infoRedeemTitle', subKey: 'infoRedeemSub', onClick: () => router.push('/earn') },
    { icon: Users, titleKey: 'infoPicksTitle', subKey: 'infoPicksSub', onClick: onCommunityPicks },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
      {cards.map(({ icon: Icon, titleKey, subKey, onClick }) => (
        <button
          key={titleKey}
          onClick={onClick}
          className="group flex items-center gap-[12px] rounded-xl p-[14px] text-left transition-[background,border-color] duration-150"
          style={{ background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(232,230,221,0.10)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,0.30)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,221,0.10)'; }}
        >
          <span
            className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,179,71,0.10)', border: '1px solid rgba(255,179,71,0.28)' }}
          >
            <Icon className="w-[16px] h-[16px]" style={{ color: 'var(--terracotta)' }} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight">{t(titleKey)}</p>
            <p className="text-[11.5px] text-white/55 leading-tight mt-[2px]">{t(subKey)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
