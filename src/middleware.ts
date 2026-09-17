import { NextResponse, type NextRequest } from 'next/server';

/** The game has its own document: the root layout reads this header and
 *  renders the minimal shell instead of the site. Old deep links onto a
 *  surface (`?moon`, `?land=`) belong to the game now. */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === '/solar-system' && (searchParams.has('moon') || searchParams.has('land'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/play';
    return NextResponse.redirect(url);
  }
  if (pathname === '/play') {
    const headers = new Headers(req.headers);
    headers.set('x-stellar-game', '1');
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/play', '/solar-system'] };
