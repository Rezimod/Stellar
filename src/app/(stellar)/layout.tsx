import { Space_Grotesk } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import '../globals.css';
import '../../styles/design-tokens.css';
import '../../styles/stellar-tokens.css';
import '../../styles/animations.css';
import '../../styles/wallet-adapter-overrides.css';
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
import { LegacyPrivy } from '@/components/sidera/SideraAuth';

// Homepage hero display face — Space Grotesk (hero-only; not a global token).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/**
 * The legacy Stellar pages still served on this deployment (/nfts,
 * /observatory/*, /m/*, /node/simulator; the rest redirect in middleware).
 * Everything they need — wallets, Privy, i18n, the Stellar chrome and its
 * stylesheets — lives here, so none of it loads on a Sidera page.
 */
export default async function StellarLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <div className={`${spaceGrotesk.variable} bg-canvas text-text-primary min-h-dvh w-full font-body flex flex-col`}>
      {/* Prevent theme flash — read localStorage before first paint */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('stellar_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})()` }} />
      <a href="#stellar-main" className="skip-link">Skip to main content</a>
      <ErrorBoundary>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
          <SolanaWalletProvider>
          <LegacyPrivy>
          <WalletAdapterProvider>
            <LocationProvider>
            <AppStateProvider>
              <WalletSync />
              <StarField />
              <Nav />
              <SwipeBack>
                <main id="stellar-main" role="main" className="relative z-10 flex-1 pt-14 pb-8 sm:pb-12">
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
          </LegacyPrivy>
          </SolanaWalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </ErrorBoundary>
    </div>
  );
}
