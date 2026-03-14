import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/providers/WalletProvider';
import { AppStateProvider } from '@/hooks/useAppState';
import Nav from '@/components/shared/Nav';
import StarField from '@/components/shared/StarField';
import Footer from '@/components/shared/Footer';
import BottomNav from '@/components/shared/BottomNav';

export const metadata: Metadata = {
  title: 'STELLAR — Verified Sky Observations',
  description: 'Observe. Verify. Collect. Stargazing verified by satellite and sealed on Solana.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="bg-void text-slate-200 min-h-screen font-sans flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <SolanaWalletProvider>
          <AppStateProvider>
            <StarField />
            <Nav />
            <main className="relative z-10 flex-1 pb-20 sm:pb-0">{children}</main>
            <Footer />
            <BottomNav />
          </AppStateProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
