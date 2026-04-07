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
      className="text-xs font-mono text-[var(--text-secondary)] hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-all"
      title={locale === 'en' ? 'Switch to Georgian' : 'Switch to English'}
    >
      {locale === 'en' ? 'KA' : 'EN'}
    </button>
  );
}
