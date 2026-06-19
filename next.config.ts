import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    // Disabled: Vercel webpack occasionally crashed with
    // `uncaughtException TypeError: Cannot read properties of undefined (reading 'length')`
    // during "Creating an optimized production build" while this was enabled.
    reactCompiler: false,
    // Privy/Solana barrel optimization can crash Vercel webpack (undefined `.length`).
    optimizePackageImports: ['lucide-react'],
  },
  serverExternalPackages: ['three', 'astronomy-engine'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.celestron.com' },
      { protocol: 'https', hostname: 'www.bresser.com' },
      { protocol: 'https', hostname: 'images.bresser.de' },
      { protocol: 'https', hostname: 'astroman.ge' },
      { protocol: 'https', hostname: 'levenhuk.com' },
      { protocol: 'https', hostname: 'www.levenhuk.com' },
    ],
  },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@farcaster/mini-app-solana': { browser: './src/lib/empty-module.ts' },
      // Optional Privy fiat-onramp peer dep we don't use — silences a build warning.
      '@stripe/crypto': { browser: './src/lib/empty-module.ts' },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@farcaster/mini-app-solana': false,
      // Optional Privy fiat-onramp peer dep we don't use — silences a build warning.
      '@stripe/crypto': false,
    };
    if (process.env.VERCEL) {
      config.cache = false;
    }
    return config;
  },
  async headers() {
    // Content-Security-Policy is set per-request in src/middleware.ts so script-src
    // can carry a nonce + 'strict-dynamic' instead of 'unsafe-inline'. The static
    // security headers below stay here.
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
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=self, geolocation=self' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
