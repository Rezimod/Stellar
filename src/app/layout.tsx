import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Orbitron, Geist, JetBrains_Mono } from 'next/font/google';
import './sidera-base.css';
import '../styles/sidera-tokens.css';
import { AnalyticsBoot } from '@/components/providers/AnalyticsBoot';
import JsonLd from '@/components/shared/JsonLd';

// Sidera's three faces: Orbitron for the wordmark and display, Geist for
// text, JetBrains Mono for figures. The legacy pages add their own in app/(stellar).
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['500', '600', '700'],
  display: 'swap',
});
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050812',
};

export const metadata: Metadata = {
  title: {
    default: 'Sidera — the night sky, issued in editions',
    template: '%s',
  },
  metadataBase: new URL('https://sidera.stellarr.club'),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sidera',
  },
  openGraph: {
    siteName: 'Sidera',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

/**
 * The root every page shares, kept to what a Sidera page needs: fonts, the
 * Sidera stylesheet, analytics. Wallets and sign-in load on demand
 * (SideraAuth); the legacy Stellar providers and chrome live in app/(stellar).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${geist.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Sidera" />
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
