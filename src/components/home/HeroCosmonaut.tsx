'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import HeroStarfield from './HeroStarfield';
import HeroTicker from './HeroTicker';
import SkyTonightCard from './SkyTonightCard';

/* ─────────────────────────────────────────────────────────────────────
   Home hero — Spacefox "Earth-limb horizon" design, built to the mockup:
   Space Grotesk display, gradient headline, glass "Sky tonight" card,
   amber pill CTAs. Data (events, sky score, conditions, mission) is wired
   to the app's live sources. Font is scoped via --font-hero.
   ──────────────────────────────────────────────────────────────────── */
const HERO_FONT = "var(--font-hero), system-ui, sans-serif";
const MONO = "var(--font-mono), ui-monospace, monospace";

export default function HeroCosmonaut() {
  const t = useTranslations('homepage');

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: '100vh', background: '#04060f', fontFamily: HERO_FONT }}
    >
      {/* === Backdrop: nebula wash + starfield + earth limb === */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 70% -10%, rgba(64,44,120,0.35), transparent 55%), radial-gradient(90% 70% at 12% 8%, rgba(28,60,130,0.28), transparent 60%)',
          }}
        />
        <HeroStarfield density={240} />

        <div className="absolute inset-x-0 bottom-0 h-[46%]">
          <Image
            src="/hero/earth-limb.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
            style={{
              opacity: 0.85,
              maskImage: 'linear-gradient(180deg, transparent 0%, black 45%)',
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 45%)',
            }}
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-[44%]"
          style={{
            background:
              'linear-gradient(180deg, transparent, rgba(4,6,15,0.55) 70%, rgba(4,6,15,0.92))',
          }}
        />
        <div
          className="heroV2-atmo absolute bottom-[34%] left-[10%] right-[10%] h-[120px]"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 100%, rgba(110,170,255,0.28), transparent 70%)',
            filter: 'blur(18px)',
          }}
        />
      </div>

      {/* === Ticker (full-bleed, below the fixed nav) === */}
      <div className="relative z-20 pt-14">
        <HeroTicker />
      </div>

      {/* === Hero grid === */}
      <div className="relative z-10 mx-auto grid max-w-[1460px] grid-cols-1 items-center gap-14 px-6 pb-28 pt-16 sm:px-10 lg:grid-cols-[1fr_minmax(360px,420px)] lg:gap-20 lg:px-12 lg:pb-40 lg:pt-24">
        {/* Headline column */}
        <div className="heroV2-rise flex max-w-[740px] flex-col">
          <h1
            className="m-0"
            style={{
              fontFamily: HERO_FONT,
              fontWeight: 700,
              fontSize: 'clamp(56px, 6.2vw, 90px)',
              lineHeight: 1.04,
              letterSpacing: '-0.025em',
              color: '#f6f8ff',
              textWrap: 'balance',
            }}
          >
            {t('panels.hero.headline1')}
            <br />
            <span
              style={{
                background: 'linear-gradient(92deg, #ffe9c4 0%, #ffbc57 45%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {t('panels.hero.headline2')}
            </span>
          </h1>

          <p
            className="mt-6 max-w-[520px]"
            style={{
              fontFamily: HERO_FONT,
              fontWeight: 400,
              fontSize: 20,
              lineHeight: 1.55,
              color: '#aab4d4',
            }}
          >
            {t('panels.hero.sub')}
          </p>

          <div className="mt-10 flex flex-col flex-wrap items-stretch gap-4 sm:flex-row sm:items-center">
            {/* Primary — Earn Rewards */}
            <Link href="/missions" className="heroV2-cta-primary" style={{ fontFamily: HERO_FONT }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#241503" aria-hidden>
                <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
              </svg>
              {t('panels.hero.cta1')}
            </Link>
            {/* Secondary — Start Observing */}
            <Link href="/sky" className="heroV2-cta-secondary" style={{ fontFamily: HERO_FONT }}>
              {t('panels.hero.cta2')}
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#eef2ff"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <span
              className="text-center sm:text-left"
              style={{ fontFamily: MONO, fontWeight: 500, fontSize: 12.5, color: '#7f8cad' }}
            >
              {t('panels.hero.microcopy')}
            </span>
          </div>
        </div>

        {/* Sky-tonight card */}
        <div className="w-full justify-self-center lg:justify-self-end lg:max-w-[420px]">
          <SkyTonightCard />
        </div>
      </div>
    </section>
  );
}
