'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';

const STARS = [
  { top: '18%',  left: '12%', size: 1.5, opacity: 0.55, gold: false, mobile: true },
  { top: '32%',  left: '88%', size: 1,   opacity: 0.45, gold: false, mobile: true },
  { top: '70%',  left: '8%',  size: 1,   opacity: 0.35, gold: true,  mobile: true },
  { top: '78%',  left: '92%', size: 1.5, opacity: 0.5,  gold: false, mobile: true },
  { top: '24%',  left: '70%', size: 1,   opacity: 0.4,  gold: false, mobile: false },
  { top: '55%',  left: '20%', size: 1,   opacity: 0.3,  gold: false, mobile: false },
  { top: '12%',  left: '40%', size: 1,   opacity: 0.45, gold: false, mobile: false },
];

export default function HeroSection() {
  const { authenticated, ready, displayName } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);

  const greeting = ready && authenticated ? displayName : null;

  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-[radial-gradient(ellipse_at_50%_0%,rgba(232, 130, 107,0.06)_0%,transparent_60%)]">
      {STARS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute rounded-full ${s.mobile ? '' : 'hidden md:block'}`}
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            background: s.gold ? 'var(--terracotta)' : '#E8E6DD',
          }}
        />
      ))}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center stagger-in">
        <div className="flex flex-col items-center text-center w-full" style={{ maxWidth: 640 }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(232,230,221,0.4)]">
          BUILT ON SOLANA · COLOSSEUM FRONTIER
        </span>

        <h1 className="mt-5 font-display font-medium tracking-[-0.03em] leading-[1] md:leading-[0.95] text-[40px] md:text-[64px] text-[#E8E6DD]">
          <span className="block">Astronomy,</span>
          <span className="block italic text-[var(--terracotta)]">on chain.</span>
        </h1>

        <p className="mt-6 max-w-[440px] px-2 text-[15px] md:text-[16px] leading-[1.65] text-[rgba(232,230,221,0.65)]">
          Stellar brings astrolovers on chain. Observe the night sky, earn rewards,
          and seal your discoveries on Solana.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
          <div className="relative w-full sm:w-auto sm:p-[6px]">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden rounded-[14px] border-[0.5px] border-dashed border-[rgba(232, 130, 107,0.18)] sm:block"
            />
            <Link
              href="/missions"
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--terracotta)] px-6 py-3 text-[13px] font-medium text-[#1a1208] transition-[filter,transform] hover:brightness-110"
            >
              <span>Start observing</span>
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {ready && !authenticated ? (
            <>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-[0.5px] border-[rgba(232,230,221,0.2)] px-6 py-3 text-[13px] font-medium text-[rgba(232,230,221,0.85)] transition-colors hover:border-[rgba(232,230,221,0.35)]"
              >
                Sign in
              </button>
              <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
            </>
          ) : (
            <Link
              href="/profile"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-[0.5px] border-[rgba(232,230,221,0.2)] px-6 py-3 text-[13px] font-medium text-[rgba(232,230,221,0.85)] transition-colors hover:border-[rgba(232,230,221,0.35)]"
            >
              Your profile
            </Link>
          )}
        </div>

        {greeting && (
          <p className="mt-5 text-[11px] text-[rgba(232,230,221,0.4)] font-mono tracking-[0.16em] uppercase">
            Signed in as {greeting}
          </p>
        )}
        </div>
      </div>
    </section>
  );
}
