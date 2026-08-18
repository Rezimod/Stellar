import type { Metadata } from 'next';
import './discovery.css';
import DiscoveryImmersive from '@/components/discovery/DiscoveryImmersive';
import DiscoveryNav from '@/components/discovery/DiscoveryNav';

const TITLE = 'Stellarr Discovery — The Universe Reveals October 21';
const DESCRIPTION =
  '10,000 cosmic objects. Some are worth a real telescope. Reveal: Oct 21, 2026.';

/**
 * Shell for every /discovery surface.
 *
 * No wallet providers here on purpose: ConnectionProvider, WalletProvider and
 * WalletModalProvider are already mounted app-wide in the root layout (see
 * components/providers/WalletAdapterProvider — Mainnet endpoint, Phantom /
 * Solflare / Backpack adapters). Mounting a second set inside this subtree
 * would give discovery its own adapter instances, so a wallet connected here
 * would read as disconnected everywhere else in the app.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/discovery' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://stellarr.club/discovery',
    siteName: 'Stellar',
    images: [{ url: '/api/discovery/share-card', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/api/discovery/share-card'],
  },
};

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DiscoveryImmersive />
      <DiscoveryNav />
      {children}
    </>
  );
}
