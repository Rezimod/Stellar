'use client';

import { useTransition, useEffect, useState } from 'react';

function getLocaleCookie(): string {
  const match = document.cookie.match(/stellar_locale=([^;]+)/);
  return match ? match[1] : 'en';
}

export default function LanguageToggle() {
  const [locale, setLocale] = useState<string>('en');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocale(getLocaleCookie());
  }, []);

  const toggle = () => {
    const next = locale === 'en' ? 'ka' : 'en';
    startTransition(() => {
      document.cookie = `stellar_locale=${next}; path=/; max-age=31536000`;
      window.location.reload();
    });
  };

  return (
    <button
      onClick={toggle}
      className="text-xs font-mono text-[var(--text-secondary)] hover:text-text-primary px-2 py-1 rounded hover:bg-[var(--surface)] transition-all"
      title={locale === 'en' ? 'Switch to Georgian / გადართვა ქართულზე' : 'Switch to English'}
      aria-label={locale === 'en' ? 'Switch to Georgian language' : 'Switch to English language'}
    >
      {locale === 'en'
        ? <span>🇬🇪 <span className="hidden sm:inline">Georgian</span><span className="sm:hidden">KA</span></span>
        : <span>🇬🇧 <span className="hidden sm:inline">English</span><span className="sm:hidden">EN</span></span>}
    </button>
  );
}
