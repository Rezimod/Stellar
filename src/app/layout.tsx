import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Anton, Bowlby_One, Orbitron, Geist, JetBrains_Mono, Michroma, Oswald } from 'next/font/google';
import './stellar-base.css';
import '../styles/stellar-theme.css';
import '../styles/stellar-motion.css';
import '../styles/stellar-pages.css';
import '../styles/stellar-reveal.css';
import '../styles/stellar-supernova.css';
import '../styles/stellar-type.css';
import '../styles/stellar-home.css';
import '../styles/stellar-odyssey.css';
import '../styles/stellar-mobile.css';
import { AnalyticsBoot } from '@/components/providers/AnalyticsBoot';
import JsonLd from '@/components/shared/JsonLd';

// Stellar's three faces: Orbitron for the wordmark and display, Geist for
// text, JetBrains Mono for figures. The legacy pages add their own in app/(stellar).
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['500', '600', '700', '800', '900'],
  display: 'swap',
});
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
// The card poster's faces: Bowlby One for the striped title, Anton for the
// condensed headlines and figures, Oswald for the spaced-out lines.
const bowlby = Bowlby_One({ subsets: ['latin'], variable: '--font-bowlby', weight: '400', display: 'swap' });
const anton = Anton({ subsets: ['latin'], variable: '--font-anton', weight: '400', display: 'swap' });
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', weight: ['300', '400', '500'], display: 'swap' });
// The card's own face: Michroma, the wide Eurostile of 2001's screens, for names, numbers and the sealed card.
const michroma = Michroma({ subsets: ['latin'], variable: '--font-michroma', weight: '400', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: {
    default: 'Stellar — the cosmos, issued in editions',
    template: '%s',
  },
  metadataBase: new URL('https://stellarr.club'),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar',
  },
  openGraph: {
    siteName: 'Stellar',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

/**
 * The root every page shares, kept to what a Stellar page needs: fonts, the
 * Stellar stylesheet, analytics. Wallets and sign-in load on demand
 * (StellarAuth); the legacy Stellar providers and chrome live in app/(stellar).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${orbitron.variable} ${geist.variable} ${jetbrainsMono.variable} ${bowlby.variable} ${anton.variable} ${oswald.variable} ${michroma.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Stellar" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <JsonLd />
      </head>
      <body>
        <AnalyticsBoot />
        {children}
      </body>
    </html>
  );
}
