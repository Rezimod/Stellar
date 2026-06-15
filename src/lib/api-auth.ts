// Shared auth helpers for API routes.
//
// Two patterns are used across this app:
//
//   1. Privy-only routes (chat, redeem-code, orders, feed/follow, …) require
//      a verified Privy session. Use `verifyPrivy(req)` — returns the user's
//      privyId or null.
//
//   2. Mixed routes (mint) accept *either* a Privy session OR a raw wallet
//      pubkey (Phantom/Solflare/Backpack flow). For these, use `verifyPrivy`
//      and treat absence as "external wallet" — but if a Privy token IS
//      provided, ensure the body's walletAddress matches the session's recorded
//      wallet via `assertOwnsWallet`. Reward/token minting routes should require
//      Privy or a real wallet signature before issuing value.
//
// `assertOwnsWallet` looks up `users.walletAddress` for the privyId and
// rejects when the body wallet doesn't match a non-null linked wallet. If
// the user row isn't created yet (first call before /api/users/upsert) we
// allow the wallet through — the upsert call right after login will tie
// them together.

import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { users } from './schema';

let _privy: PrivyClient | null = null;
function getPrivy(): PrivyClient {
  if (!_privy) {
    _privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
    );
  }
  return _privy;
}

export async function verifyPrivy(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    return claims.userId;
  } catch {
    return null;
  }
}

// Returns true when `walletAddress` matches the wallet linked to this Privy
// user. On first use, atomically binds the wallet if the row exists but has
// no address yet — prevents a session from hopping between wallets mid-flow.
// If the user row hasn't been created yet (upsert still in flight), allow once.
export async function assertOwnsWallet(
  privyId: string,
  walletAddress: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return true; // DB-disabled local dev: skip the check.
  const rows = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.privyId, privyId))
    .limit(1);
  const linked = rows[0]?.walletAddress ?? null;
  if (linked) return linked === walletAddress;

  if (rows.length > 0) {
    const bound = await db
      .update(users)
      .set({ walletAddress, updatedAt: new Date() })
      .where(and(eq(users.privyId, privyId), isNull(users.walletAddress)))
      .returning({ walletAddress: users.walletAddress });
    if (bound.length > 0) return true;

    const retry = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    return retry[0]?.walletAddress === walletAddress;
  }

  return true;
}
