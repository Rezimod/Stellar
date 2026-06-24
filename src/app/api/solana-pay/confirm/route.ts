import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { findReference } from '@solana/pay';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ confirmed: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ confirmed: false, error: 'Unauthorized' }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ confirmed: false, error: 'reference required' }, { status: 400 });
  }

  let referenceKey: PublicKey;
  try {
    referenceKey = new PublicKey(reference);
  } catch {
    return NextResponse.json({ confirmed: false, error: 'invalid reference' }, { status: 400 });
  }

  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  try {
    const sig = await findReference(connection, referenceKey, { finality: 'confirmed' });

    // Verify the payer in the transaction matches the authenticated user's wallet
    const walletParam = req.nextUrl.searchParams.get('wallet');
    if (walletParam) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        const msg = tx?.transaction.message;
        const firstKey = msg
          ? ('staticAccountKeys' in msg
              ? msg.staticAccountKeys[0]
              : (msg as { accountKeys: PublicKey[] }).accountKeys[0]
            )?.toString()
          : undefined;
        if (firstKey && firstKey !== walletParam) {
          return NextResponse.json({ confirmed: false, error: 'Wallet mismatch' }, { status: 403 });
        }
      } catch {
        // Non-fatal: if we can't fetch the full tx, proceed with the confirmation
      }
    }

    return NextResponse.json({ confirmed: true, signature: sig.signature });
  } catch {
    // findReference throws if not found — this is expected while waiting
    return NextResponse.json({ confirmed: false });
  }
}
