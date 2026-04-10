'use client';

import { useTranslations } from 'next-intl';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { useState, useEffect } from 'react';
import ProductGrid from '@/components/marketplace/ProductGrid';
import StarsRedemption from '@/components/shared/StarsRedemption';

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { state } = useAppState();
  const [starsBalance, setStarsBalance] = useState(0);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [address]);

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 animate-page-enter">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166]" style={{ fontFamily: 'Georgia, serif' }}>
          {t('title')}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          <a href="https://astroman.ge?utm_source=stellar&utm_medium=app"
            target="_blank" rel="noopener noreferrer"
            className="hover:text-[#FFD166] transition-colors">
            astroman.ge
          </a>
          {' '}· Georgia&apos;s premier astronomy store
        </p>
      </div>
      {authenticated && (
        <div className="mb-4">
          <StarsRedemption starsBalance={starsBalance || totalStars} walletAddress={address ?? undefined} />
        </div>
      )}
      <ProductGrid />
    </div>
  );
}
