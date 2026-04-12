import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});
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
  title: 'Stellar — Observe the Night Sky',
  description: 'Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana. Shop telescopes from your local dealer.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar',
  },
  openGraph: {
    title: 'Stellar — Observe the Night Sky',
    description: 'Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana. Shop telescopes from your local dealer.',
    images: ['https://stellarrclub.vercel.app/api/og/sky'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellar — Observe the Night Sky',
    description: 'Photograph the night sky. Get AI-verified. Earn Stars tokens on Solana. Shop telescopes from your local dealer.',
    images: ['https://stellarrclub.vercel.app/api/og/sky'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://stellarrclub.vercel.app/api/og/sky',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': "Tonight's Sky →",
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://stellarrclub.vercel.app',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable}`}>
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
