import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stellar Hub — Your Astronomy Dashboard, Stats & Rewards | Stellar',
  description:
    'Your personal astronomy dashboard — track observations, Stars earned, streaks, rewards and discovery NFTs, all in one place on Stellar.',
  alternates: { canonical: '/hub' },
  openGraph: {
    title: 'Stellar Hub — Your Astronomy Dashboard, Stats & Rewards | Stellar',
    description:
      'Track your observations, Stars, streaks, rewards and discovery NFTs in one dashboard.',
    url: 'https://stellarr.club/hub',
  },
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
