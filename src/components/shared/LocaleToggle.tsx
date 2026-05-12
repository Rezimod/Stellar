'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: 'en' | 'ka') {
    if (next === locale) return;
    document.cookie = `stellar_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-full border border-white/12 bg-transparent px-1 py-0.5"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label="English"
        className="min-h-9 min-w-9 rounded-full px-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050812]"
        style={{
          fontFamily: 'var(--font-mono)',
          color: locale === 'en' ? '#FFB347' : 'rgba(255,255,255,0.55)',
        }}
      >
        en
      </button>
      <span
        aria-hidden
        className="select-none text-[11px] uppercase tracking-[0.12em]"
        style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}
      >
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale('ka')}
        aria-pressed={locale === 'ka'}
        aria-label="ქართული"
        className="min-h-9 min-w-9 rounded-full px-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050812]"
        style={{
          fontFamily: 'var(--font-mono)',
          color: locale === 'ka' ? '#FFB347' : 'rgba(255,255,255,0.55)',
        }}
      >
        ka
      </button>
    </div>
  );
}
