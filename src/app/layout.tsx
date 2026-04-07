import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SolanaWalletProvider } from '@/components/providers/PrivyProvider';
import { AppStateProvider } from '@/hooks/useAppState';
import Nav from '@/components/shared/Nav';
import StarField from '@/components/shared/StarField';
import Footer from '@/components/shared/Footer';
import BottomNav from '@/components/shared/BottomNav';
import OfflineBanner from '@/components/shared/OfflineBanner';
import AstroChat from '@/components/shared/AstroChat';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070B14',
};

export const metadata: Metadata = {
  title: 'STELLAR — Your AI-Powered Window to the Cosmos',
  description: 'The all-in-one astronomy app: 7-day sky forecast, AI companion, real marketplace — powered by invisible Solana infrastructure.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'STELLAR',
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SolanaWalletProvider>
            <AppStateProvider>
              <StarField />
              <Nav />
              <OfflineBanner />
              <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
              <Footer />
              <BottomNav />
              <AstroChat />
            </AppStateProvider>
          </SolanaWalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
