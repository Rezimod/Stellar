import { NextResponse, type NextRequest } from 'next/server';
import { INVITE_COOKIE, inviteCodes } from '@/lib/invite';

/**
 * Stellar pages this deployment still builds but Sidera does not offer. Each
 * goes to the Sidera page that does its job. Kept: /nfts (the legacy view of
 * minted observations), /observatory/* (the operator tools), and every
 * on-chain-referenced route (never matched here).
 */
const RETIRED: Array<[RegExp, string]> = [
  // Cards of the first Set 001, replaced by First Light before anything sold.
  [/^\/card\/(MOON|TRANQUILITY-BASE|VENUS|MARS|PLUTO|SIRIUS|POLARIS|BETELGEUSE|M16|M87|TWIN-SUN|TIDE-WORLD|RING-HABITAT|UNIT-7|SENTINEL|BLACK-SLAB|DERELICT|WORMHOLE)\/?$/i, '/set/001'],
  [/^\/(sky|moon)(\/|$)/, '/tonight'],
  [/^\/observatory\/?$/, '/node'],
  [/^\/(profile|u)(\/|$)/, '/collection'],
  [/^\/(shop|marketplace|first-light|star|faq|darksky|settings|returns|cookie-policy|security-policy|accessibility)(\/|$)/, '/'],
];

/**
 * The closed beta. While SIDERA_INVITE_CODES names any code, a page opens only
 * to a visitor carrying one of them, set by /invite/<code>. Unset, the gate is
 * not there at all. APIs, assets and the on-chain metadata routes are never
 * behind it: minted cards and the reveal still have to reach them.
 */

export function middleware(req: NextRequest) {
  const retired = RETIRED.find(([from]) => from.test(req.nextUrl.pathname));
  if (retired) return NextResponse.redirect(new URL(retired[1], req.url), 307);

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
