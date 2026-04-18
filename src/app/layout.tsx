import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Cormorant_Garamond, Geist, JetBrains_Mono, Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';
import '../styles/design-tokens.css';
import '../styles/stellar-tokens.css';
import '../styles/animations.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});
const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-georgian',
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
});
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';
import { LocationProvider } from '@/lib/location';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { AppStateProvider } from '@/hooks/useAppState';
import WalletSync from '@/components/providers/WalletSync';
import SwipeBack from '@/components/providers/SwipeBack';
import Nav from '@/components/shared/Nav';
import StarField from '@/components/shared/StarField';
import Footer from '@/components/shared/Footer';
import BottomNav from '@/components/shared/BottomNav';
import AstraPopup from '@/components/shared/AstraPopup';
import OfflineBanner from '@/components/shared/OfflineBanner';
import PullToRefresh from '@/components/shared/PullToRefresh';
import PageTransition from '@/components/layout/PageTransition';
import { Toaster } from '@/components/ui/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
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
    <html lang={locale} className={`${cormorant.variable} ${geist.variable} ${jetbrains.variable} ${notoGeorgian.variable}`}>
      <head>
        <link rel="preconnect" href="https://auth.privy.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.open-meteo.com" />
        <link rel="dns-prefetch" href="https://astroman.ge" />
        <link rel="dns-prefetch" href="https://explorer-api.walletconnect.com" />
        {/* Prevent theme flash — read localStorage before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('stellar_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})()` }} />
      </head>
      <body className="bg-void text-slate-200 min-h-dvh w-full font-sans flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ErrorBoundary>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ThemeProvider>
            <SolanaWalletProvider>
              <LocationProvider>
              <AppStateProvider>
                <WalletSync />
                <StarField />
                <Nav />
                <OfflineBanner />
                <PullToRefresh />
                <SwipeBack>
                  <main className="relative z-10 flex-1 pt-14 pb-[88px]">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </SwipeBack>
                <Footer />
                <BottomNav />
                <AstraPopup />
                <Toaster />
              </AppStateProvider>
              </LocationProvider>
            </SolanaWalletProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
