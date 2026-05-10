import { NextRequest, NextResponse } from 'next/server';

// Rate limiting moved to individual route handlers via Upstash Redis — see src/lib/rate-limit.ts
// The in-memory Map approach broke on Vercel serverless (each invocation gets a fresh Map).

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Override Next.js's auto `Cache-Control: no-store` on dynamic page routes
  // so the browser can put pages in its back/forward cache (bfcache). Direct
  // loads still revalidate (max-age=0), but back/forward navigation becomes
  // instant. This is the single biggest perceived-speed win for the site.
  // Skip API + Next internals — they set their own headers.
  const path = req.nextUrl.pathname;
  if (!path.startsWith('/api/') && !path.startsWith('/_next/')) {
    res.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  }

  return res;
}

export const config = {
  // Match every request except static assets and Next internals so we can set
  // page-level cache headers. /api/chat and /api/observe/verify still flow
  // through here (rate limiting was moved to Upstash inside each handler).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand|images|qr-links|fonts|manifest.json|robots.txt|sitemap.xml|opengraph-image|apple-touch-icon).*)',
  ],
};
