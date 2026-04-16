import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import BackButton from '@/components/shared/BackButton';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import TonightHighlights from '@/components/sky/TonightHighlights';
import SunMoonBar from '@/components/sky/SunMoonBar';
import ForecastGrid from '@/components/sky/ForecastGrid';
import PlanetGrid from '@/components/sky/PlanetGrid';
import EventBanner from '@/components/sky/EventBanner';
import ObserveCTA from '@/components/sky/ObserveCTA';
import BestTargets from '@/components/sky/BestTargets';
import SkyAstraCta from '@/components/sky/SkyAstraCta';

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
        description: `${data.grade} sky conditions tonight. ${data.emoji} Check planet positions, 7-day forecast, and best observation windows.`,
      };
    }
  } catch {}
  return {
    title: "Tonight's Sky — Stellar",
    description: 'Live sky conditions, planet tracker, and 7-day astronomy forecast.',
  };
}

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 animate-page-enter flex flex-col gap-6">
      <BackButton />

      {/* Summary card */}
      <div className="flex flex-col gap-3">
        <ErrorBoundary fallback={<div className="h-[180px] rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2"><p className="text-sm text-slate-500">Couldn&apos;t load section</p><a href="/sky" className="text-xs text-blue-400 underline">Try again</a></div>}>
          <Suspense fallback={<div className="h-[180px] rounded-xl bg-white/5 animate-pulse" />}>
            <TonightHighlights />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary fallback={<div className="h-16 rounded-xl bg-white/5 flex items-center justify-center gap-3"><p className="text-sm text-slate-500">Couldn&apos;t load section</p><a href="/sky" className="text-xs text-blue-400 underline">Try again</a></div>}>
          <Suspense fallback={<div className="h-16 rounded-xl bg-white/5 animate-pulse" />}>
            <SunMoonBar />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Start Observing CTA */}
      <Suspense fallback={null}>
        <ObserveCTA />
      </Suspense>

      {/* 7-day forecast */}
      <ErrorBoundary fallback={<div className="h-48 rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2"><p className="text-sm text-slate-500">Couldn&apos;t load section</p><a href="/sky" className="text-xs text-blue-400 underline">Try again</a></div>}>
        <Suspense fallback={<div className="h-48 rounded-xl bg-white/5 animate-pulse" />}>
          <ForecastGrid />
        </Suspense>
      </ErrorBoundary>

      {/* Planet tracker */}
      <div className="flex flex-col gap-3">
        <div>
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
          >
            {t('planets')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('planetHint')}
          </p>
        </div>
        <ErrorBoundary fallback={
          <div className="h-28 rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-slate-500">Couldn&apos;t load planet data</p>
            <a href="/sky" className="text-xs text-blue-400 underline">Try again</a>
          </div>
        }>
          <Suspense fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          }>
            <PlanetGrid />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Best targets tonight */}
      <div className="flex flex-col gap-3">
        <ErrorBoundary fallback={
          <div className="h-28 rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-slate-500">Couldn&apos;t load best targets</p>
            <a href="/sky" className="text-xs text-blue-400 underline">Try again</a>
          </div>
        }>
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          }>
            <BestTargets />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Upcoming events */}
      <Suspense fallback={null}>
        <EventBanner />
      </Suspense>

      {/* Ask ASTRA */}
      <SkyAstraCta />
    </div>
  );
}
