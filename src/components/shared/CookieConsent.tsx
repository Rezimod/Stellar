'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stellar_cookie_consent';

type Choice = 'all' | 'necessary';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage blocked — don't render
    }
  }, []);

  function persist(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, ts: Date.now() }));
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed z-[60] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
      }}
    >
      <div
        className="rounded-2xl p-4 sm:p-5 shadow-2xl"
        style={{
          background: '#0F1220',
          border: '1px solid rgba(124,58,237,0.28)',
        }}
      >
        <p
          className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
          style={{ color: '#C4B5FD', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
        >
          Cookies
        </p>
        <p className="text-sm text-slate-200 leading-relaxed">
          We use cookies to remember your sign-in, your region, and to keep Stellar fast.
          You can accept all or keep only the essentials.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => persist('necessary')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Necessary only
          </button>
          <button
            onClick={() => persist('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{
              background: '#7C3AED',
              color: '#fff',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
