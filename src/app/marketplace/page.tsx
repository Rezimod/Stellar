import { getTranslations } from 'next-intl/server';

export default async function MarketplacePage() {
  const t = await getTranslations('marketplace');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-page-enter">
      <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>

      {/* Filter skeleton */}
      <div className="flex gap-2 mb-6 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-white/10 rounded-full" />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse flex flex-col gap-3">
            <div className="w-full aspect-square bg-white/10 rounded-lg" />
            <div className="h-3 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/5 rounded" />
            <div className="h-8 w-full bg-[#8B5CF6]/20 rounded-lg mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
