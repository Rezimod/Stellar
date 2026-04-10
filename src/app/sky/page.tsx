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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <Suspense fallback={<div className="h-[120px] rounded-xl bg-white/5 animate-pulse" />}>
          <TonightHighlights />
        </Suspense>
        <Suspense fallback={<div className="h-12 rounded-xl bg-white/5 animate-pulse" />}>
          <SunMoonBar />
        </Suspense>
        <Suspense fallback={<div className="h-48 rounded-xl bg-white/5 animate-pulse" />}>
          <ForecastGrid />
        </Suspense>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('planets')}</h2>
        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse"/>)}</div>}>
          <PlanetGrid />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <EventBanner />
      </Suspense>
    </div>
  );
}
