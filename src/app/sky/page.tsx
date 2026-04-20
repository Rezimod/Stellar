import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import BackButton from '@/components/shared/BackButton';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import TonightHighlights from '@/components/sky/TonightHighlights';
import ForecastGrid from '@/components/sky/ForecastGrid';
import PlanetGrid from '@/components/sky/PlanetGrid';
import EventBanner from '@/components/sky/EventBanner';
import ObserveCTA from '@/components/sky/ObserveCTA';
import BestTargets from '@/components/sky/BestTargets';
import SkyAstraCta from '@/components/sky/SkyAstraCta';
import PageContainer from '@/components/layout/PageContainer';

export async function generateMetadata() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app';
    const res = await fetch(`${appUrl}/api/sky/score?lat=41.6941&lon=44.8337`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    if (data?.score) {
      return {
        title: `Sky Score ${data.score}/100 — Stellar`,
        description: `${data.grade} sky conditions tonight. Check planet positions, 7-day forecast, and best observation windows.`,
      };
    }
  } catch {}
  return {
    title: "Tonight's Sky — Stellar",
    description: 'Live sky conditions, planet tracker, and 7-day astronomy forecast.',
  };
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <h2
        className="text-[11px] uppercase tracking-[0.18em] font-semibold"
        style={{ color: 'oklch(0.94 0.015 80 / 0.6)' }}
      >
        {children}
      </h2>
      {hint && (
        <span
          className="text-[12px] tabular-nums"
          style={{ color: 'oklch(0.94 0.015 80 / 0.45)', fontFamily: 'var(--font-mono)' }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

// ── Hairline section divider ──────────────────────────────────────────────────
function Rule() {
  return <div style={{ height: 1, background: 'oklch(0.94 0.015 80 / 0.08)' }} />;
}

// ── Skeleton blocks (no glass, no pulse-purple) ───────────────────────────────
function Block({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        background: 'oklch(0.94 0.015 80 / 0.03)',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    />
  );
}

function ErrorFallback({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-start justify-center gap-2 px-4"
      style={{ height, background: 'oklch(0.94 0.015 80 / 0.02)' }}
    >
      <p className="text-sm" style={{ color: 'oklch(0.94 0.015 80 / 0.55)' }}>
        Couldn&apos;t load this section.
      </p>
      <a href="/sky" className="text-xs underline" style={{ color: 'oklch(0.78 0.12 240)' }}>
        Try again
      </a>
    </div>
  );
}

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <PageContainer variant="wide" className="pt-4 pb-16 animate-page-enter flex flex-col gap-12">
      <BackButton />

      {/* ── HERO — verdict, score, atmosphere, moon, planets ─────────────── */}
      <ErrorBoundary fallback={<ErrorFallback height={320} />}>
        <Suspense fallback={<Block height={320} />}>
          <TonightHighlights />
        </Suspense>
      </ErrorBoundary>

      <Rule />

      {/* ── 7-DAY FORECAST ───────────────────────────────────────────────── */}
      <section className="flex flex-col">
        <SectionLabel hint="Open-Meteo · updated hourly">{t('next7') ?? 'Next 7 nights'}</SectionLabel>
        <ErrorBoundary fallback={<ErrorFallback height={200} />}>
          <Suspense fallback={<Block height={200} />}>
            <ForecastGrid />
          </Suspense>
        </ErrorBoundary>
      </section>

      <Rule />

      {/* ── PLANETS ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col">
        <SectionLabel hint="astronomy-engine · live positions">
          {t('planets')}
        </SectionLabel>
        <p className="text-[13px] mb-5 max-w-[60ch]" style={{ color: 'oklch(0.94 0.015 80 / 0.6)' }}>
          {t('planetHint')}
        </p>
        <ErrorBoundary fallback={<ErrorFallback height={180} />}>
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Block key={i} height={112} />
                ))}
              </div>
            }
          >
            <PlanetGrid />
          </Suspense>
        </ErrorBoundary>
      </section>

      <Rule />

      {/* ── BEST TARGETS TONIGHT ─────────────────────────────────────────── */}
      <section className="flex flex-col">
        <SectionLabel>Targets worth pointing at</SectionLabel>
        <ErrorBoundary fallback={<ErrorFallback height={180} />}>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Block key={i} height={112} />
                ))}
              </div>
            }
          >
            <BestTargets />
          </Suspense>
        </ErrorBoundary>
      </section>

      <Rule />

      {/* ── ACTIVITY ROW: observe + events side by side on desktop ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <div className="flex flex-col">
          <SectionLabel>Earn observer advantage</SectionLabel>
          <Suspense fallback={<Block height={120} />}>
            <ObserveCTA />
          </Suspense>
        </div>
        <div className="flex flex-col">
          <SectionLabel>Upcoming sky events</SectionLabel>
          <Suspense fallback={<Block height={120} />}>
            <EventBanner />
          </Suspense>
        </div>
      </section>

      {/* ── ASTRA — quiet footer dock ────────────────────────────────────── */}
      <Rule />
      <SkyAstraCta />
    </PageContainer>
  );
}
