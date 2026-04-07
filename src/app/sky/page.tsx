import { getTranslations } from 'next-intl/server';
import TonightHighlights from '@/components/sky/TonightHighlights';
import ForecastGrid from '@/components/sky/ForecastGrid';
import PlanetGrid from '@/components/sky/PlanetGrid';
import EventBanner from '@/components/sky/EventBanner';

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-page-enter flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <TonightHighlights />
        <ForecastGrid />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('planets')}</h2>
        <PlanetGrid />
      </div>
      <EventBanner />
    </div>
  );
}
