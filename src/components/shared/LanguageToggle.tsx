'use client';

import { useCallback } from 'react';

type Locale = 'en' | 'ka';

export default function LanguageToggle() {
  const currentLocale: Locale = typeof window !== 'undefined'
    ? (document.documentElement.lang as Locale) || 'en'
    : 'en';

  const handleToggle = useCallback(async () => {
    const newLocale: Locale = currentLocale === 'en' ? 'ka' : 'en';

    // Set the cookie
    document.cookie = `stellar_locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // Reload page to apply new locale
    window.location.reload();
  }, [currentLocale]);

  const displayLabel = currentLocale === 'en' ? 'GE' : 'EN';

  return (
    <button
      onClick={handleToggle}
      className="language-toggle nav-icon-btn"
      aria-label={`Switch to ${currentLocale === 'en' ? 'Georgian' : 'English'}`}
      title={`Switch to ${currentLocale === 'en' ? 'Georgian' : 'English'}`}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        transition: 'all 0.15s ease',
      }}
    >
      {displayLabel}
    </button>
  );
}
