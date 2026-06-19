import { NextRequest, NextResponse } from 'next/server';

// Per-request CSP with a nonce. Moved here from next.config.ts `headers()` so
// script-src can drop 'unsafe-inline' in favour of a fresh nonce + 'strict-dynamic'.
// Next 15 reads the nonce from the request-side Content-Security-Policy header and
// stamps it onto its own inline bootstrap scripts automatically. The host allowlist
// is kept as a CSP2 fallback for browsers that ignore 'strict-dynamic'.
//
// 'wasm-unsafe-eval' (not 'unsafe-eval'): allows WebAssembly compilation that the
// Solana/crypto stack needs without re-opening eval(). If Privy login regresses with
// an eval/wasm CSP violation, widen this back to 'unsafe-eval'.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://auth.privy.io https://*.privy.io https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://auth.privy.io",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://auth.privy.io",
    "connect-src 'self' https://api.devnet.solana.com wss://api.devnet.solana.com https://api.open-meteo.com https://api.coingecko.com https://mainnet.helius-rpc.com https://*.helius-rpc.com wss://*.helius-rpc.com wss://mainnet.helius-rpc.com wss://devnet.helius-rpc.com https://auth.privy.io https://api.privy.io https://*.privy.io https://*.rpc.privy.systems https://challenges.cloudflare.com wss://relay.walletconnect.com wss://relay.walletconnect.org https://pulse.walletconnect.com https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://nominatim.openstreetmap.org",
    "frame-src https://auth.privy.io https://challenges.cloudflare.com https://verify.walletconnect.com https://verify.walletconnect.org",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next reads this request header to nonce its own inline scripts.
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // All document routes. Static assets, the image optimizer, the API, and the
    // favicon don't render inline scripts and don't need the nonce.
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
