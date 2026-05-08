// Shared auth helpers for API routes.
//
// Two patterns are used across this app:
//
//   1. Privy-only routes (chat, redeem-code, orders, feed/follow, …) require
//      a verified Privy session. Use `verifyPrivy(req)` — returns the user's
//      privyId or null.
//
//   2. Mixed routes (mint, award-stars) accept *either* a Privy session OR a
//      raw wallet pubkey (Phantom/Solflare/Backpack flow). The CLAUDE.md
//      design notes explicitly preserve this. For these, use `verifyPrivy`
//      and treat absence as "external wallet" — but if a Privy token IS
//      provided, ensure the body's walletAddress matches the session's
//      recorded wallet via `assertOwnsWallet`.
//
// `assertOwnsWallet` looks up `users.walletAddress` for the privyId and
// rejects when the body wallet doesn't match a non-null linked wallet. If
// the user row isn't created yet (first call before /api/users/upsert) we
// allow the wallet through — the upsert call right after login will tie
// them together.

import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { eq } from 'drizzle-orm';
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

// Returns true if either no wallet is linked yet (allow), or the linked
// wallet matches `walletAddress`. Returns false when a different wallet is
// already linked to this Privy user.
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
  if (!linked) return true;
  return linked === walletAddress;
}
