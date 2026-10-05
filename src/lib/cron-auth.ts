import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/** Fails closed when CRON_SECRET is unset, locally too: a dev server can share a real database. */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return auth.length === expected.length && timingSafeEqual(auth, expected);
}
