import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    reactCompiler: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.celestron.com' },
      { protocol: 'https', hostname: 'www.bresser.com' },
      { protocol: 'https', hostname: 'images.bresser.de' },
      { protocol: 'https', hostname: 'astroman.ge' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://*.privy.io",
      "style-src 'self' 'unsafe-inline' https://auth.privy.io",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://auth.privy.io",
      "connect-src 'self' https://api.devnet.solana.com wss://api.devnet.solana.com https://api.open-meteo.com https://api.coingecko.com https://mainnet.helius-rpc.com https://*.helius-rpc.com https://auth.privy.io https://api.privy.io https://*.privy.io https://*.rpc.privy.systems wss://relay.walletconnect.com wss://relay.walletconnect.org https://pulse.walletconnect.com https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://nominatim.openstreetmap.org",
      "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=self, geolocation=self' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
