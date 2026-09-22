import { NextRequest, NextResponse } from 'next/server';
import { INVITE_COOKIE, inviteCodes } from '@/lib/invite';

/** An invitation link. A valid code is kept for a year; anything else goes to the closed door. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!inviteCodes().includes(code)) return NextResponse.redirect(new URL('/invite', req.url));

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(INVITE_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
