import { getTranslations } from 'next-intl/server';
import ForecastGrid from '@/components/sky/ForecastGrid';
import PlanetGrid from '@/components/sky/PlanetGrid';

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-page-enter flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>
        <ForecastGrid />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('planets')}</h2>
        <PlanetGrid />
      </div>
    </div>
  );
}
