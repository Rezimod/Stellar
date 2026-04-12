import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import { LocationProvider } from '@/lib/location';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { AppStateProvider } from '@/hooks/useAppState';
import WalletSync from '@/components/providers/WalletSync';
import SwipeBack from '@/components/providers/SwipeBack';
import Nav from '@/components/shared/Nav';
import StarField from '@/components/shared/StarField';
import Footer from '@/components/shared/Footer';
import BottomNav from '@/components/shared/BottomNav';
import OfflineBanner from '@/components/shared/OfflineBanner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070B14',
};

export const metadata: Metadata = {
  title: 'Stellar — Observe the Sky, Earn on Solana',
  description: 'The global astronomy app that brings telescope owners on-chain. Verify observations, earn Stars tokens, collect NFT proofs, and shop at local dealers.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar',
  },
  openGraph: {
    title: 'Stellar — Observe the Sky, Earn on Solana',
    description: 'Photograph the night sky from anywhere in the world. Earn Stars. Collect discovery NFTs. Shop telescopes at your local dealer.',
    images: ['https://stellarrclub.vercel.app/api/og/sky'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellar — Observe the Sky, Earn on Solana',
    description: 'Photograph the night sky from anywhere in the world. Earn Stars. Collect discovery NFTs. Shop telescopes at your local dealer.',
    images: ['https://stellarrclub.vercel.app/api/og/sky'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://stellarrclub.vercel.app/api/og/sky',
    'fc:frame:button:1': 'Start Observing',
    'fc:frame:post_url': 'https://stellarrclub.vercel.app',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
      </head>
      <body className="bg-void text-slate-200 min-h-screen font-sans flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ErrorBoundary>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <SolanaWalletProvider>
              <LocationProvider>
              <AppStateProvider>
                <WalletSync />
                <StarField />
                <Nav />
                <OfflineBanner />
                <SwipeBack>
                  <main className="relative z-10 flex-1 pb-20 md:pb-0">{children}</main>
                </SwipeBack>
                <Footer />
                <BottomNav />
              </AppStateProvider>
              </LocationProvider>
            </SolanaWalletProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
