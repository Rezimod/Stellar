import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import BackButton from '@/components/shared/BackButton';
import TonightHighlights from '@/components/sky/TonightHighlights';
import SunMoonBar from '@/components/sky/SunMoonBar';
import ForecastGrid from '@/components/sky/ForecastGrid';
import PlanetGrid from '@/components/sky/PlanetGrid';
import EventBanner from '@/components/sky/EventBanner';

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-page-enter flex flex-col gap-10">
      <BackButton />

      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-3xl text-white tracking-tight"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
        >
          Tonight&apos;s Sky
        </h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Real-time conditions · 7-day forecast · Planet tracker
        </p>
      </div>

      {/* Summary card */}
      <div className="flex flex-col gap-3">
        <Suspense fallback={<div className="h-[180px] rounded-xl bg-white/5 animate-pulse" />}>
          <TonightHighlights />
        </Suspense>
        <Suspense fallback={<div className="h-16 rounded-xl bg-white/5 animate-pulse" />}>
          <SunMoonBar />
        </Suspense>
      </div>

      {/* 7-day forecast */}
      <div className="flex flex-col gap-3">
        <h2
          className="text-lg font-semibold text-white"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
        >
          7-Day Forecast
        </h2>
        <Suspense fallback={<div className="h-48 rounded-xl bg-white/5 animate-pulse" />}>
          <ForecastGrid />
        </Suspense>
      </div>

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
            Tap any planet for rise / transit / set details
          </p>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        }>
          <PlanetGrid />
        </Suspense>
      </div>

      {/* Upcoming events */}
      <Suspense fallback={null}>
        <EventBanner />
      </Suspense>
    </div>
  );
}
