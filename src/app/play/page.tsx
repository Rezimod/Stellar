import type { Metadata, Viewport } from 'next';
import PlayClient from '@/components/play/PlayClient';
import '../solar-system/solar-system.css';
import './play.css';

export const metadata: Metadata = {
  title: 'Stellar Explore',
  description: 'Land at Stellar Base on the Moon. A lunar expedition from Georgia, inside a real astronomy platform.',
  manifest: '/play.webmanifest',
  alternates: { canonical: '/play' },
  robots: { index: false, follow: false },
};

/** Flown with two thumbs: a second finger on the deck is a second key, never a pinch. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050812',
};

export default function PlayPage() {
  return <PlayClient />;
}
