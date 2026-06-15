'use client';

import { Truck, ShieldCheck, BadgeCheck, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { icon: Truck, titleKey: 'trustShippingTitle', subKey: 'trustShippingSub' },
  { icon: ShieldCheck, titleKey: 'trustPaymentTitle', subKey: 'trustPaymentSub' },
  { icon: RotateCcw, titleKey: 'trustProtectionTitle', subKey: 'trustProtectionSub' },
  { icon: BadgeCheck, titleKey: 'trustBrandsTitle', subKey: 'trustBrandsSub' },
] as const;

// Static, truthful trust signals. No invented "4.8★ average" — the catalog has
// no ratings, so the fourth badge states a real fact (authentic dealer brands).
export default function TrustRow() {
  const t = useTranslations('marketplacePage');
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px] sm:gap-[12px]">
      {ITEMS.map(({ icon: Icon, titleKey, subKey }) => (
        <div
          key={titleKey}
          className="flex items-center gap-[10px] rounded-xl px-[12px] py-[11px]"
          style={{ background: 'rgba(232,230,221,0.035)', border: '1px solid rgba(232,230,221,0.09)' }}
        >
          <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: 'var(--seafoam)' }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white leading-tight truncate">{t(titleKey)}</p>
            <p className="text-[10px] tracking-[0.06em] uppercase text-white/50 leading-tight truncate">{t(subKey)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
