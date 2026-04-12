import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export async function POST(req: NextRequest) {
  let body: { walletAddress?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let userKey: PublicKey;
  try {
    userKey = new PublicKey(body.walletAddress as string);
  } catch {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }

  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) {
    // Fee payer not configured — return a local activation token (dev/demo mode)
    return NextResponse.json({ txId: 'local_' + Date.now().toString(36) });
  }

  try {
    const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
    const connection = new Connection(
      process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
      'confirmed'
    );

    const memo = JSON.stringify({
      app: 'stellar',
      type: 'membership',
      user: userKey.toString(),
      ts: Date.now(),
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: feePayerKeypair.publicKey,
    }).add({
      keys: [{ pubkey: feePayerKeypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    });

    transaction.sign(feePayerKeypair);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    return NextResponse.json({
      txId: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[club/activate] Error:', message);
    // Fall back to local activation so the UX isn't blocked
    return NextResponse.json({ txId: 'local_' + Date.now().toString(36), warning: message });
  }
}
