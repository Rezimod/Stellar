'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

const ACTIVE_BG = '#FFB347';
const ACTIVE_FG = '#0A1735';
const INACTIVE_FG = 'rgba(255,255,255,0.55)';

export default function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: 'en' | 'ka') {
    if (next === locale) return;
    document.cookie = `stellar_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  const cellStyle = (active: boolean): React.CSSProperties => ({
    padding: '0 8px',
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    background: active ? ACTIVE_BG : 'transparent',
    color: active ? ACTIVE_FG : INACTIVE_FG,
    border: 'none',
    cursor: active ? 'default' : 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
  });

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        height: 26,
        display: 'inline-flex',
        alignItems: 'stretch',
        borderRadius: 9999,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'transparent',
        opacity: pending ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label="English"
        style={cellStyle(locale === 'en')}
      >
        EN
      </button>
      <span aria-hidden style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
      <button
        type="button"
        onClick={() => setLocale('ka')}
        aria-pressed={locale === 'ka'}
        aria-label="ქართული"
        style={cellStyle(locale === 'ka')}
      >
        KA
      </button>
    </div>
  );
}
