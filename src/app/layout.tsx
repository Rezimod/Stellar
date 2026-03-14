import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/providers/WalletProvider';
import { AppStateProvider } from '@/hooks/useAppState';
import Nav from '@/components/shared/Nav';
import StarField from '@/components/shared/StarField';

export const metadata: Metadata = {
  title: 'Proof of Observation — Astroman',
  description: 'Strava for astronomy on Solana. Verify your stargazing. Earn on-chain rewards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void text-slate-200 min-h-screen font-sans">
        <SolanaWalletProvider>
          <AppStateProvider>
            <StarField />
            <Nav />
            <main className="relative z-10 pt-16">{children}</main>
          </AppStateProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
