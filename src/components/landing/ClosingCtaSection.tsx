'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';

const STARS = [
  { top: '20%', left: '15%', size: 1.5, opacity: 0.5,  gold: true,  mobile: true },
  { top: '70%', left: '85%', size: 1,   opacity: 0.4,  gold: false, mobile: true },
  { top: '30%', left: '80%', size: 1,   opacity: 0.35, gold: false, mobile: false },
  { top: '75%', left: '20%', size: 1.2, opacity: 0.45, gold: false, mobile: false },
];

export default function ClosingCtaSection() {
  const { authenticated, ready } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section className="relative overflow-hidden py-20 md:py-24 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,209,102,0.08)_0%,transparent_70%)]">
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
            background: s.gold ? '#FFD166' : '#E8E6DD',
          }}
        />
      ))}

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center"
        style={{ alignItems: 'center' }}>
        <div className="flex flex-col items-center text-center w-full" style={{ maxWidth: 640 }}>
        <h2 className="font-serif font-medium tracking-[-0.02em] leading-[1.1] text-[26px] md:text-[38px] text-[#E8E6DD]">
          <span className="block">The sky is open.</span>
          <span className="block italic text-[#FFD166]">Take your first observation.</span>
        </h2>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
          <Link
            href="/missions"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFD166] px-6 py-3 text-[13px] font-medium text-[#1a1208] transition-[filter,transform] hover:brightness-110"
          >
            Start observing  →
          </Link>

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
              href="/sky"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-[0.5px] border-[rgba(232,230,221,0.2)] px-6 py-3 text-[13px] font-medium text-[rgba(232,230,221,0.85)] transition-colors hover:border-[rgba(232,230,221,0.35)]"
            >
              Tonight&apos;s sky
            </Link>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
