'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Product, ProductCategory } from '@/lib/products';
import ProductCard from './ProductCard';
import ProductDetail from './ProductDetail';

type Filter = 'all' | ProductCategory;

const FILTERS: { key: Filter; label: (t: ReturnType<typeof useTranslations<'marketplace'>>) => string }[] = [
  { key: 'all',       label: t => t('filterAll') },
  { key: 'telescope', label: t => t('filterTelescopes') },
  { key: 'moonlamp',  label: t => t('filterMoonLamps') },
  { key: 'digital',   label: t => t('filterDigital') },
];

export default function ProductGrid() {
  const t = useTranslations('marketplace');
  const [products, setProducts] = useState<Product[]>([]);
  const [solPerGEL, setSolPerGEL] = useState(0.00135);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [prodRes, priceRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/price/sol'),
      ]);
      const [prods, price] = await Promise.all([
        prodRes.json() as Promise<Product[]>,
        priceRes.json() as Promise<{ solPerGEL: number }>,
      ]);
      setProducts(prods);
      setSolPerGEL(price.solPerGEL);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = filter === 'all'
    ? products
    : products.filter(p => p.category === filter);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Filter skeleton */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <div key={f.key} className="h-8 w-20 bg-white/10 rounded-full" />
          ))}
        </div>
        {/* Card skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <div className="w-full aspect-video bg-white/5" />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-8 w-full bg-white/5 rounded-lg mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-slate-400 text-sm mb-4">{t('errorLoad')}</p>
        <button
          onClick={load}
          className="text-xs text-[#38F0FF] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filter === f.key
                ? 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/30'
                : 'text-slate-400 bg-white/5 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label(t)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visible.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            solPerGEL={solPerGEL}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Detail overlay */}
      {selected && (
        <ProductDetail
          product={selected}
          solPerGEL={solPerGEL}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
