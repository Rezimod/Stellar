import { NextResponse, type NextRequest } from 'next/server';
import { INVITE_COOKIE, inviteCodes } from '@/lib/invite';

/**
 * The closed beta. While SIDERA_INVITE_CODES names any code, a page opens only
 * to a visitor carrying one of them, set by /invite/<code>. Unset, the gate is
 * not there at all. APIs, assets and the on-chain metadata routes are never
 * behind it: minted cards and the reveal still have to reach them.
 */

export function middleware(req: NextRequest) {
  const codes = inviteCodes();
  if (codes.length === 0) return NextResponse.next();
  const held = req.cookies.get(INVITE_COOKIE)?.value;
  if (held && codes.includes(held)) return NextResponse.next();
  return NextResponse.rewrite(new URL('/invite', req.url));
}

export const config = {
  matcher: [
    '/((?!api/|_next/|m/|invite|cards/|_og|opengraph-image|icon|apple-icon|robots\\.txt|sitemap\\.xml|.*\\.[^/]+$).*)',
  ],
};
