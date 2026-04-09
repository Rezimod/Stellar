import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';

const DEVNET_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

export async function POST(req: NextRequest) {
  let body: { recipientAddress?: unknown; amount?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipientAddress, amount, reason } = body;

  // Validate recipientAddress
  let recipientPublicKey: PublicKey;
  try {
    recipientPublicKey = new PublicKey(recipientAddress as string);
  } catch {
    return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
  }

  // Validate amount
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > 1000
  ) {
    return NextResponse.json({ error: 'amount must be an integer between 1 and 1000' }, { status: 400 });
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'reason must be a non-empty string' }, { status: 400 });
  }

  const mintAddress = process.env.STARS_TOKEN_MINT;
  if (!mintAddress) {
    return NextResponse.json({ error: 'Stars token not configured' }, { status: 503 });
  }

  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) {
    return NextResponse.json({ error: 'Fee payer not configured' }, { status: 503 });
  }

  try {
    const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    const mintPublicKey = new PublicKey(mintAddress);
    const connection = new Connection(DEVNET_URL, 'confirmed');

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      feePayerKeypair,
      mintPublicKey,
      recipientPublicKey
    );

    const signature = await mintTo(
      connection,
      feePayerKeypair,
      mintPublicKey,
      ata.address,
      feePayerKeypair,
      BigInt(amount)
    );

    console.log('[Stars] Awarded', amount, 'to', recipientAddress, 'for', reason);

    return NextResponse.json({
      success: true,
      txId: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
