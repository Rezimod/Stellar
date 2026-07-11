'use client';

/**
 * /start — Georgian campaign landing (Astroman→Stellarr QR flyer + email/SMS).
 * Georgian by default with a small EN toggle; one screen, one action, no app
 * chrome. Strings are inline [ka, en] (same pattern as /moon) so the first
 * paint is Georgian without waiting for the locale cookie round-trip. On first
 * visit the stellar_locale cookie is set to `ka` so the rest of the flow
 * (observe → verify → result) renders Georgian too. UTMs are snapshotted to
 * localStorage by AnalyticsBoot and the raw query is carried on the CTA link.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { Mail, ScanEye, Sparkles } from 'lucide-react';
import AstroLogo from '@/components/shared/AstroLogo';
import StarMark from '@/components/ui/StarMark';

const STR = {
  headline:  ['ცა შენს ტელეფონში 🌌', 'The sky, in your phone 🌌'],
  subline:   ['დაუმიზნე ტელეფონი ცას და ნახე, რას უყურებ.', 'Point your phone at the sky and see what you’re looking at.'],
  step1:     ['შედი მეილით', 'Sign in with email'],
  step2:     ['დაუმიზნე ტელეფონი ცას', 'Point your phone at the sky'],
  step3:     ['აღმოაჩინე და დააგროვე ✦ STARS', 'Discover and collect ✦ STARS'],
  cta:       ['დავიწყოთ', 'Let’s start'],
  trust:     ['გაიხსნება პირდაპირ ბრაუზერში — ჩამოტვირთვა არ სჭირდება.', 'Opens right in your browser — nothing to download.'],
} as const;

const STEP_ICONS = [Mail, ScanEye, Sparkles];

function setLocaleCookie(locale: 'ka' | 'en') {
  document.cookie = `stellar_locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export default function StartPage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [lang, setLang] = useState(0); // 0 = ka (default), 1 = en
  const t = (k: keyof typeof STR) => STR[k][lang];

  const flowTarget = () =>
    `/observe/free-observation${typeof window !== 'undefined' ? window.location.search : ''}`;

  const { login } = useLogin({ onComplete: () => router.push(flowTarget()) });

  // Campaign arrivals get the Georgian app; an explicit `en` cookie is respected.
  useEffect(() => {
    const existing = document.cookie.match(/(?:^|;\s*)stellar_locale=(\w+)/)?.[1];
    if (existing === 'en') { setLang(1); return; }
    if (existing !== 'ka') { setLocaleCookie('ka'); router.refresh(); }
  }, [router]);

  const switchLang = (next: 0 | 1) => {
    if (next === lang) return;
    setLang(next);
    setLocaleCookie(next ? 'en' : 'ka');
    router.refresh();
  };

  const start = () => {
    if (!ready) return;
    if (authenticated) router.push(flowTarget());
    else login({ loginMethods: ['email', 'google', 'twitter'] });
  };

  return (
    <div className="relative -mt-14 flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">

      {/* EN/KA toggle — top right */}
      <div
        className="absolute right-4 flex items-center gap-0.5 rounded-full p-0.5"
        style={{ top: 'max(16px, env(safe-area-inset-top))', background: 'var(--surface)', border: '1px solid var(--border)' }}
        role="group"
        aria-label="Language"
      >
        {(['KA', 'EN'] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => switchLang(i as 0 | 1)}
            aria-pressed={lang === i}
            className="rounded-full px-2.5 text-[10px] font-semibold tracking-[0.12em] transition-colors"
            style={{
              minHeight: 0,
              paddingTop: 5,
              paddingBottom: 5,
              color: lang === i ? 'var(--canvas)' : 'var(--text-muted)',
              background: lang === i ? 'var(--terracotta)' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <AstroLogo size={30} showWordmark />

        <div className="flex flex-col gap-2.5">
          <h1
            className="text-balance"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'clamp(26px, 8vw, 34px)', lineHeight: 1.15, color: 'var(--text)' }}
          >
            {t('headline')}
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('subline')}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          {([1, 2, 3] as const).map((n, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--terracotta)' }}
                >
                  <Icon size={13} strokeWidth={2} />
                </span>
                <span className="text-[13px] leading-snug" style={{ color: 'var(--text)' }}>
                  {t(`step${n}` as keyof typeof STR)}
                </span>
                <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{n}</span>
              </div>
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={start}
            disabled={!ready}
            className="w-full rounded-xl py-3.5 text-[15px] font-bold tracking-wide transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--terracotta)', color: 'var(--canvas)', boxShadow: '0 0 28px var(--accent-glow)' }}
          >
            {t('cta')}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <StarMark size={11} style={{ color: 'var(--terracotta)', flexShrink: 0 }} />
            {t('trust')}
          </p>
        </div>
      </div>
    </div>
  );
}
