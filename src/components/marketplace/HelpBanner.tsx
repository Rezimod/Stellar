'use client';

import Link from 'next/link';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ASTRA reads the `q` search param as an initial query (src/app/chat/page.tsx),
// so we can open the chat pre-seeded in gear-recommendation mode.
const SEED_QUERY = 'Help me choose astronomy gear for my budget and observing goals.';

export default function HelpBanner() {
  const t = useTranslations('marketplacePage');
  return (
    <div
      className="rounded-xl p-[16px] sm:p-[20px] flex flex-col sm:flex-row sm:items-center gap-[14px] sm:justify-between"
      style={{ background: 'rgba(var(--ink-warm), 0.045)', border: '1px solid rgba(var(--ink-warm), 0.10)' }}
    >
      <div className="flex items-center gap-[14px]">
        <span
          className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,179,71,0.10)', border: '1px solid rgba(255,179,71,0.30)' }}
        >
          <Sparkles className="w-[18px] h-[18px]" style={{ color: 'var(--accent-text)' }} />
        </span>
        <div>
          <p className="font-display text-[16px] sm:text-[17px] text-white leading-tight" style={{ fontWeight: 600 }}>
            {t('helpTitle')}
          </p>
          <p className="text-[12px] text-white/60 leading-snug mt-[3px]">{t('helpSub')}</p>
        </div>
      </div>
      <Link
        href={`/chat?q=${encodeURIComponent(SEED_QUERY)}`}
        className="inline-flex items-center justify-center gap-[7px] h-[38px] px-[16px] rounded-none text-[12.5px] font-bold tracking-[0.04em] whitespace-nowrap transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px] self-start sm:self-auto"
        style={{
          background: 'var(--terracotta)',
          color: '#1a1208',
          boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
        }}
      >
        <MessageCircle className="w-[15px] h-[15px]" />
        {t('helpCta')}
      </Link>
    </div>
  );
}
