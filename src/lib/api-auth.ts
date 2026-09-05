// Shared auth helpers for API routes.
//
// Value routes, including mint, require a verified Privy session and a linked
// wallet. A raw wallet public key is never proof of control. External wallets
// can use these routes after linking to the authenticated Privy account.
//
// `assertOwnsWallet` verifies the wallet against the Privy session's own
// linked accounts (the source of truth), not a mirrored DB row. It fails
// closed: an unknown wallet, or a session Privy can't resolve, is rejected.

import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

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

// Every wallet linked to a Privy session — embedded (walletClientType 'privy')
// AND external (Phantom/Solflare/Backpack). Use this when you need the user's
// real wallet regardless of how they signed in; the `users` table only mirrors
// the embedded wallet, so an external-wallet login has no row there.
export async function getSessionWalletAddresses(privyId: string): Promise<string[]> {
  try {
    const user = await getPrivy().getUserById(privyId);
    const accounts = (user.linkedAccounts ?? []) as Array<{ type: string; address?: string }>;
    return accounts
      .filter((a) => a.type === 'wallet' && typeof a.address === 'string' && a.address.length > 0)
      .map((a) => a.address as string);
  } catch {
    return [];
  }
}

// Returns true only when `walletAddress` is one of the wallets actually linked
// to this Privy session (embedded or external). Fails closed: if Privy can't be
// reached or the wallet isn't linked, returns false. This is the sole
// authorization primitive protecting value/PII routes, so it must not trust a
// client-populated DB row — an attacker who never calls /api/users/upsert would
// otherwise have no row and slip through.
export async function assertOwnsWallet(
  privyId: string,
  walletAddress: string,
): Promise<boolean> {
  const linked = await getSessionWalletAddresses(privyId);
  return linked.includes(walletAddress);
}
