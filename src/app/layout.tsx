import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/providers/WalletProvider';
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
  title: 'STELLAR — Verified Sky Observations',
  description: 'Observe. Verify. Collect. Stargazing verified by satellite and sealed on Solana.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'STELLAR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className="bg-void text-slate-200 min-h-screen font-sans flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
      </body>
    </html>
  );
}
