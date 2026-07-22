import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Feed — Share Astronomical Observations & Discoveries | Stellar',
  description:
    'See what stargazers are capturing tonight. Share your astronomical observations, photos and discoveries with the Stellar community feed.',
  alternates: { canonical: '/feed' },
  openGraph: {
    title: 'Community Feed — Share Astronomical Observations & Discoveries | Stellar',
    description:
      'See what stargazers are capturing tonight and share your own observations with the Stellar community.',
    url: 'https://stellarr.club/feed',
  },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">Community Feed — Astronomical Observations &amp; Discoveries</h1>
      {children}
    </>
  );
}
