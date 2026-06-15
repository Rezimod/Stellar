'use client';

import { Telescope, Disc3, Binoculars, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Product } from '@/lib/dealers';

type Cat = Product['category'];

const CARDS: { cat: Cat; icon: typeof Telescope; labelKey: string }[] = [
  { cat: 'telescope', icon: Telescope, labelKey: 'telescopes' },
  { cat: 'eyepiece', icon: Disc3, labelKey: 'eyepieces' },
  { cat: 'binocular', icon: Binoculars, labelKey: 'binoculars' },
  { cat: 'accessory', icon: Wrench, labelKey: 'accessories' },
];

interface Props {
  counts: Record<Cat, number>;
  onSelect: (cat: Cat) => void;
}

// Item counts are computed from the live region catalog, not hardcoded.
export default function ShopByCategory({ counts, onSelect }: Props) {
  const t = useTranslations('marketplacePage');
  const visible = CARDS.filter(c => counts[c.cat] > 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px] sm:gap-[12px]">
      {visible.map(({ cat, icon: Icon, labelKey }) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className="group flex flex-col items-start gap-[10px] rounded-xl p-[14px] text-left transition-[background,border-color,transform] duration-150 hover:-translate-y-[1px]"
          style={{ background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(232,230,221,0.10)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,179,71,0.32)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,230,221,0.10)'; }}
        >
          <span
            className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg"
            style={{ background: 'rgba(255,179,71,0.10)', border: '1px solid rgba(255,179,71,0.22)' }}
          >
            <Icon className="w-[17px] h-[17px]" style={{ color: 'var(--terracotta)' }} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-white leading-tight">{t(labelKey)}</p>
            <p className="font-mono tabular-nums text-[11px] text-white/50 leading-tight mt-[2px]">
              {counts[cat]} {t('itemsLabel')}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
