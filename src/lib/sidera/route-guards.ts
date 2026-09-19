/**
 * The checks every Sidera route makes before it does anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { getSessionWalletAddresses, verifyPrivy } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

type Limiter = { limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }> };

/** A 429 when the caller is over the limit, a 503 when the limiter cannot be reached; null to proceed. */
export async function limited(limiter: Limiter, id: string): Promise<NextResponse | null> {
  try {
    const { success, reset } = await checkRateLimit(limiter, id);
    if (success) return null;
    const retry = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429, headers: { 'Retry-After': String(retry) } });
  } catch {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** The cron secret, or a Privy session holding one of ADMIN_WALLETS. */
export async function isSideraAdmin(req: NextRequest): Promise<boolean> {
  if (verifyCronSecret(req)) return true;
  const admins = new Set((process.env.ADMIN_WALLETS ?? '').split(',').map((w) => w.trim()).filter(Boolean));
  if (admins.size === 0) return false;
  const privyId = await verifyPrivy(req);
  if (!privyId) return false;
  return (await getSessionWalletAddresses(privyId)).some((w) => admins.has(w));
}
