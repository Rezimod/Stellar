'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

const LOCALE_OPTIONS = [
  { value: 'en', label: 'EN', ariaLabel: 'English' },
  { value: 'ka', label: 'KA', ariaLabel: 'ქართული' },
] as const;

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
      className="relative inline-grid h-8 w-[74px] grid-cols-2 items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full border border-[#ffb347]/15 bg-[#ffb347]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_-14px_rgba(255,179,71,0.9)] transition-transform duration-200 ease-out"
        style={{
          transform: locale === 'ka' ? 'translateX(calc(100% - 1px))' : 'translateX(0)',
        }}
      />
      {LOCALE_OPTIONS.map(option => {
        const active = locale === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            disabled={pending}
            className="relative z-10 rounded-full px-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050812] disabled:cursor-default"
            style={{
              fontFamily: 'var(--font-body)',
              color: active ? '#FFF4DA' : 'rgba(255,255,255,0.56)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
