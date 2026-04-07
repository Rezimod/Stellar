import { getTranslations } from 'next-intl/server';
import ProductGrid from '@/components/marketplace/ProductGrid';

export default async function MarketplacePage() {
  const t = await getTranslations('marketplace');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 animate-page-enter">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        {t('title')}
      </h1>
      <ProductGrid />
    </div>
  );
}
