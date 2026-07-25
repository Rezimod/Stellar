import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/** Fail closed in production when CRON_SECRET is unset. */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return auth.length === expected.length && timingSafeEqual(auth, expected);
}
