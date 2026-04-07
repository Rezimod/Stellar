import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export default async function SkyPage() {
  const t = await getTranslations('sky');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-page-enter">
      <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>

      {/* 7-day forecast skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-3 w-16 bg-white/10 rounded mb-3" />
            <div className="h-6 w-10 bg-white/10 rounded mb-2" />
            <div className="h-3 w-20 bg-white/5 rounded mb-1" />
            <div className="h-3 w-14 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Planet tracker skeleton */}
      <h2 className="text-lg font-semibold text-white mb-4">{t('planets')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 w-16 bg-white/10 rounded mb-2" />
              <div className="h-3 w-20 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
