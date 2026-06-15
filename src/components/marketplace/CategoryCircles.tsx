'use client';

import { Telescope, Disc3, Binoculars, Wrench, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Product } from '@/lib/dealers';

type Cat = Product['category'];
export type CategoryFilter = 'all' | Cat;

// The mockup shows a "Mounts" circle; the catalog has no mount category, so we
// surface the real ones (telescopes, eyepieces, binoculars, accessories) plus
// an "All" reset.
const CIRCLES: { key: CategoryFilter; icon: typeof Telescope; labelKey: string }[] = [
  { key: 'telescope', icon: Telescope, labelKey: 'telescopes' },
  { key: 'eyepiece', icon: Disc3, labelKey: 'eyepieces' },
  { key: 'binocular', icon: Binoculars, labelKey: 'binoculars' },
  { key: 'accessory', icon: Wrench, labelKey: 'accessories' },
  { key: 'all', icon: LayoutGrid, labelKey: 'allCategory' },
];

interface Props {
  active: CategoryFilter;
  counts: Record<Cat, number>;
  onSelect: (cat: CategoryFilter) => void;
}

export default function CategoryCircles({ active, counts, onSelect }: Props) {
  const t = useTranslations('marketplacePage');
  const visible = CIRCLES.filter(c => c.key === 'all' || counts[c.key as Cat] > 0);
  return (
    <div className="flex items-start justify-between gap-[6px] overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-[20px]">
      {visible.map(({ key, icon: Icon, labelKey }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex flex-col items-center gap-[7px] flex-shrink-0 w-[64px] group"
            aria-pressed={isActive}
          >
            <span
              className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-full transition-[background,border-color,transform] duration-150 group-hover:-translate-y-[1px]"
              style={isActive
                ? { background: 'var(--terracotta)', border: '1px solid var(--terracotta)', boxShadow: '0 4px 14px rgba(255,179,71,0.22)' }
                : { background: 'rgba(232,230,221,0.045)', border: '1px solid rgba(232,230,221,0.12)' }}
            >
              <Icon className="w-[20px] h-[20px]" style={{ color: isActive ? '#1a1208' : 'var(--terracotta)' }} />
            </span>
            <span
              className="text-[10.5px] text-center leading-tight tracking-[0.02em]"
              style={{ color: isActive ? 'var(--terracotta)' : 'rgba(255,255,255,0.65)', fontWeight: isActive ? 700 : 500 }}
            >
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
