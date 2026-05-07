import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Saira, JetBrains_Mono, Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';
import '../styles/design-tokens.css';
import '../styles/stellar-tokens.css';
import '../styles/animations.css';
import '../styles/wallet-adapter-overrides.css';

const saira = Saira({
  subsets: ['latin'],
  variable: '--font-saira',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
  display: 'swap',
});
const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  variable: '--font-georgian',
  weight: ['400', '600'],
  display: 'swap',
  preload: false,
});
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import { WalletAdapterProvider } from '@/components/providers/WalletAdapterProvider';
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
import DeferredGlobals from '@/components/shared/DeferredGlobals';
import PageTransition from '@/components/layout/PageTransition';
import { Toaster } from '@/components/ui/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1735',
};

export const metadata: Metadata = {
  title: 'Stellar — Astronomy, on chain',
  description:
    'The companion app for telescope, smartphone, and camera owners. Photograph the sky, earn Stars, redeem for real telescopes at Astroman.',
  metadataBase: new URL('https://stellarrclub.vercel.app'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar',
  },
  openGraph: {
    title: 'Stellar — Astronomy, on chain',
    description:
      'The companion app for telescope, smartphone, and camera owners. Photograph the sky, earn Stars, redeem for real telescopes at Astroman.',
    url: 'https://stellarrclub.vercel.app',
    siteName: 'Stellar',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellar — Astronomy, on chain',
    description:
      'Photograph the sky, earn Stars, redeem for real telescopes at Astroman.',
    images: ['/opengraph-image'],
    creator: '@StellarClub26',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://stellarrclub.vercel.app/opengraph-image',
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
    <html lang={locale} className={`${saira.variable} ${jetbrainsMono.variable} ${notoGeorgian.variable}`}>
      <head>
        <link rel="preconnect" href="https://auth.privy.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.open-meteo.com" />
        <link rel="dns-prefetch" href="https://astroman.ge" />
        <link rel="dns-prefetch" href="https://explorer-api.walletconnect.com" />
        {/* Prevent theme flash — read localStorage before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('stellar_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})()` }} />
      </head>
      <body className="bg-canvas text-text-primary min-h-dvh w-full font-body flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ErrorBoundary>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ThemeProvider>
            <SolanaWalletProvider>
            <WalletAdapterProvider>
              <LocationProvider>
              <AppStateProvider>
                <WalletSync />
                <StarField />
                <Nav />
                <SwipeBack>
                  <main className="relative z-10 flex-1 pt-14 pb-[88px]">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </SwipeBack>
                <Footer />
                <BottomNav />
                <DeferredGlobals />
                <Toaster />
              </AppStateProvider>
              </LocationProvider>
            </WalletAdapterProvider>
            </SolanaWalletProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
