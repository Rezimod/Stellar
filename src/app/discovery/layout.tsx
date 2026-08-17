import type { Metadata } from 'next';
import './discovery.css';
import DiscoveryImmersive from '@/components/discovery/DiscoveryImmersive';

export const metadata: Metadata = {
  title: 'Stellarr Discovery — The Universe Is Being Revealed',
  description:
    '10,000 cosmic objects. One reveal date. Some are worth a telescope. Cosmic Discovery Passes reveal simultaneously on 21 October 2026, at the peak of the Orionids.',
  alternates: { canonical: '/discovery' },
  openGraph: {
    title: 'Stellarr Discovery — The Universe Is Being Revealed',
    description:
      '10,000 cosmic objects. One reveal date. Some are worth a telescope. Reveal: 21 October 2026.',
    url: 'https://stellarr.club/discovery',
    siteName: 'Stellar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellarr Discovery — The Universe Is Being Revealed',
    description: '10,000 cosmic objects. One reveal date. Reveal: 21 October 2026.',
  },
};

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DiscoveryImmersive />
      {children}
    </>
  );
}
