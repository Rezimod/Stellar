import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { AppStateProvider } from '@/hooks/useAppState';
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
  title: 'Stellar — Astronomy on Solana',
  description: 'Observe the night sky, earn Stars, and seal your discoveries as compressed NFTs on Solana.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'STELLAR',
  },
  openGraph: {
    title: 'Stellar — Astronomy on Solana',
    description: 'Observe the night sky, earn Stars, and seal your discoveries as compressed NFTs on Solana.',
    images: ['https://stellarrclub.vercel.app/api/og/sky'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellar — Astronomy on Solana',
    description: 'Observe the night sky, earn Stars, and seal your discoveries as compressed NFTs on Solana.',
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
              <AppStateProvider>
                <StarField />
                <Nav />
                <OfflineBanner />
                <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
                <Footer />
                <BottomNav />
              </AppStateProvider>
            </SolanaWalletProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
