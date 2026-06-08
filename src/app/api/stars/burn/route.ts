// POST /api/stars/burn — atomically burns Stars on behalf of the user.
//
// Action: 'prepare' | 'submit'.
//
//   prepare → server validates eligibility and builds a Burn transaction
//     with the fee payer set as gas sponsor, partial-signs as fee payer, and
//     returns the serialized tx + base64 last-blockhash for client signing.
//
//   submit  → client sends the user-signed transaction back; server submits
//     it to the cluster, confirms, validates the on-chain tx truly contains
//     a Burn for `amount` from this user's ATA, and inserts a stars_burns
//     row. Idempotency is enforced by the unique (order_id, kind) index —
//     a retry on the same orderId returns the cached signature.
//
// Burn `kind`s:
//   - 'discount-burn'  : Stars-for-discount on a marketplace order. Capped
//                        at MAX_BURN_RATIO (30%) of the GEL price.
//   - 'shop-purchase'  : full price of a Star-Shop item (priceStars). §5.
//   - 'redeem-code'    : turn Stars into a one-time code redeemable at the
//                        Astroman till. No max cap. §5.

import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createBurnInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { eq, and } from 'drizzle-orm';
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { orders, starsBurns } from '@/lib/schema';
import { getStarsBalance } from '@/lib/solana';
import { STARS_TOKEN_PROGRAM_ID } from '@/lib/stars';
import { isValidPublicKey } from '@/lib/validate';
import { computeMaxBurn, validateBurn } from '@/lib/stars-economy';
import { assertOwnsWallet } from '@/lib/api-auth';

export const maxDuration = 60;

const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

type Kind = 'discount-burn' | 'shop-purchase' | 'redeem-code';

interface PrepareBody {
  action: 'prepare';
  walletAddress: string;
  amount: number;
  kind: Kind;
  orderId?: string;
}

interface SubmitBody {
  action: 'submit';
  walletAddress: string;
  amount: number;
  kind: Kind;
  signedTxB64: string;
  orderId?: string;
  redeemCodeId?: string;
}

type Body = PrepareBody | SubmitBody;

async function authenticate(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const claims = await privy.verifyAuthToken(token);
    return claims.userId;
  } catch {
    return null;
  }
}

function getFeePayer(): Keypair | null {
  const pk = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!pk) return null;
  try {
    return Keypair.fromSecretKey(bs58.decode(pk));
  } catch {
    return null;
  }
}

function getMint(): PublicKey | null {
  const mint = process.env.STARS_TOKEN_MINT;
  if (!mint) return null;
  try {
    return new PublicKey(mint);
  } catch {
    return null;
  }
}

async function validateEligibility(args: {
  kind: Kind;
  walletAddress: string;
  amount: number;
  orderId?: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { kind, walletAddress, amount, orderId } = args;

  const balance = await getStarsBalance(walletAddress).catch(() => 0);

  if (kind === 'discount-burn') {
    if (!orderId) return { ok: false, status: 400, error: 'orderId required for discount-burn' };
    const db = getDb();
    if (!db) return { ok: false, status: 503, error: 'Database not configured' };
    const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = rows[0];
    if (!order) return { ok: false, status: 404, error: 'Order not found' };
    if (order.walletAddress !== walletAddress) {
      return { ok: false, status: 403, error: 'Order belongs to another wallet' };
    }
    if (order.currency !== 'GEL') {
      return { ok: false, status: 400, error: 'Burns are only supported for GEL-priced products right now' };
    }
    if (order.burnStars !== amount) {
      return { ok: false, status: 400, error: `Burn amount mismatch: order has ${order.burnStars}, request asked ${amount}` };
    }
    const v = validateBurn({ priceGEL: order.amountFiat + order.gelDiscount, stars: amount, balance });
    if (!v.ok) return { ok: false, status: 400, error: v.reason };
  } else {
    // shop-purchase / redeem-code: just check balance covers it.
    if (amount <= 0 || !Number.isInteger(amount)) {
      return { ok: false, status: 400, error: 'amount must be a positive integer' };
    }
    if (amount > balance) {
      return { ok: false, status: 400, error: `Insufficient Stars (have ${balance}, need ${amount})` };
    }
  }

  return { ok: true };
}

async function buildBurnTx(args: {
  walletAddress: string;
  amount: number;
}): Promise<{ tx: Transaction; blockhash: string } | null> {
  const feePayer = getFeePayer();
  const mint = getMint();
  if (!feePayer || !mint) return null;

  const owner = new PublicKey(args.walletAddress);
  const ata = await getAssociatedTokenAddress(mint, owner, false, STARS_TOKEN_PROGRAM_ID);

  const burnIx: TransactionInstruction = createBurnInstruction(
    ata,
    mint,
    owner,
    BigInt(args.amount),
    [],
    STARS_TOKEN_PROGRAM_ID,
  );

  const connection = new Connection(RPC, 'confirmed');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction();
  tx.feePayer = feePayer.publicKey;
  tx.recentBlockhash = blockhash;
  tx.add(burnIx);

  // Fee payer signs first so the user's wallet only needs to add its sig.
  tx.partialSign(feePayer);

  return { tx, blockhash };
}

function isCachedBurnError(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505';
}

function decodeBurnAmount(ixData: Buffer): bigint | null {
  // SPL Token Burn = discriminator 8 + u64 amount LE
  // SPL Token BurnChecked = discriminator 15 + u64 amount LE + u8 decimals
  if (!ixData || ixData.length < 9) return null;
  const discriminator = ixData[0];
  if (discriminator !== 8 && discriminator !== 15) return null;
  return ixData.readBigUInt64LE(1);
}

export async function POST(req: NextRequest) {
  const privyId = await authenticate(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || (body.action !== 'prepare' && body.action !== 'submit')) {
    return NextResponse.json({ error: 'action must be "prepare" or "submit"' }, { status: 400 });
  }
  if (!isValidPublicKey(body.walletAddress)) {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, body.walletAddress);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || body.amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 });
  }
  if (body.kind !== 'discount-burn' && body.kind !== 'shop-purchase' && body.kind !== 'redeem-code') {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  const feePayer = getFeePayer();
  const mint = getMint();
  if (!feePayer || !mint) {
    return NextResponse.json({ error: 'Stars token not configured' }, { status: 503 });
  }

  // ─── Idempotency: already-burned for this orderId+kind? Return cached. ───
  if (body.orderId) {
    const db = getDb();
    if (db) {
      const existing = await db
        .select()
        .from(starsBurns)
        .where(and(eq(starsBurns.orderId, body.orderId), eq(starsBurns.kind, body.kind)))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({
          signature: existing[0].signature,
          burned: existing[0].amount,
          cached: true,
        });
      }
    }
  }

  // ─── PREPARE ──────────────────────────────────────────────────────────────
  if (body.action === 'prepare') {
    const eligibility = await validateEligibility({
      kind: body.kind,
      walletAddress: body.walletAddress,
      amount: body.amount,
      orderId: body.orderId,
    });
    if (!eligibility.ok) {
      return NextResponse.json({ error: eligibility.error }, { status: eligibility.status });
    }

    const built = await buildBurnTx({ walletAddress: body.walletAddress, amount: body.amount });
    if (!built) {
      return NextResponse.json({ error: 'Could not build burn transaction' }, { status: 500 });
    }

    const serialized = built.tx.serialize({ requireAllSignatures: false }).toString('base64');
    return NextResponse.json({ tx: serialized, blockhash: built.blockhash });
  }

  // ─── SUBMIT ───────────────────────────────────────────────────────────────
  if (!body.signedTxB64) {
    return NextResponse.json({ error: 'signedTxB64 required for submit' }, { status: 400 });
  }
  let signedTx: Transaction;
  try {
    signedTx = Transaction.from(Buffer.from(body.signedTxB64, 'base64'));
  } catch {
    return NextResponse.json({ error: 'Invalid signed transaction' }, { status: 400 });
  }

  // Sanity: fee payer matches, instruction is a burn for `amount` from user's ATA.
  if (!signedTx.feePayer?.equals(feePayer.publicKey)) {
    return NextResponse.json({ error: 'feePayer mismatch' }, { status: 400 });
  }

  const owner = new PublicKey(body.walletAddress);
  const expectedAta = await getAssociatedTokenAddress(mint, owner, false, STARS_TOKEN_PROGRAM_ID);

  const burnIx = signedTx.instructions.find(
    ix => ix.programId.equals(STARS_TOKEN_PROGRAM_ID),
  );
  if (!burnIx) {
    return NextResponse.json({ error: 'No SPL token instruction in transaction' }, { status: 400 });
  }
  // SPL Burn ix layout: data[0] = 8 (Burn) or 15 (BurnChecked); accounts: [source, mint, authority, ...]
  if (!burnIx.keys[0].pubkey.equals(expectedAta)) {
    return NextResponse.json({ error: 'Burn source must be user\'s ATA' }, { status: 400 });
  }
  if (!burnIx.keys[1].pubkey.equals(mint)) {
    return NextResponse.json({ error: 'Burn mint must be Stars token' }, { status: 400 });
  }
  if (!burnIx.keys[2].pubkey.equals(owner)) {
    return NextResponse.json({ error: 'Burn authority must be the wallet owner' }, { status: 400 });
  }
  const burnAmount = decodeBurnAmount(Buffer.from(burnIx.data));
  if (burnAmount === null) {
    return NextResponse.json({ error: 'SPL token instruction must be Burn/BurnChecked' }, { status: 400 });
  }
  if (burnAmount !== BigInt(body.amount)) {
    return NextResponse.json({ error: 'Burn amount in transaction does not match request amount' }, { status: 400 });
  }

  // (Re)validate eligibility just before submission — guards against price /
  // balance changes between prepare and submit.
  const eligibility = await validateEligibility({
    kind: body.kind,
    walletAddress: body.walletAddress,
    amount: body.amount,
    orderId: body.orderId,
  });
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.error }, { status: eligibility.status });
  }

  const connection = new Connection(RPC, 'confirmed');
  let signature: string;
  try {
    signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Burn submission failed: ${msg}` }, { status: 500 });
  }

  // Record the burn. Unique (order_id, kind) prevents double-record on retry.
  const db = getDb();
  if (db) {
    try {
      await db.insert(starsBurns).values({
        orderId: body.orderId ?? null,
        redeemCodeId: body.redeemCodeId ?? null,
        walletAddress: body.walletAddress,
        amount: body.amount,
        kind: body.kind,
        signature,
      });
    } catch (err) {
      if (!isCachedBurnError(err)) {
        console.error('[stars/burn] DB write failed (tx already on chain)', err);
      }
    }

    // For discount-burn against an order, stamp the order with the burn sig.
    if (body.kind === 'discount-burn' && body.orderId) {
      try {
        await db.update(orders)
          .set({ burnSignature: signature })
          .where(eq(orders.id, body.orderId));
      } catch {
        // Ignore — burn is recorded in stars_burns regardless.
      }
    }
  }

  return NextResponse.json({ signature, burned: body.amount });
}

// Convenience GET — returns the maximum burnable Stars for a given order.
export async function GET(req: NextRequest) {
  const privyId = await authenticate(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get('orderId');
  const wallet = req.nextUrl.searchParams.get('walletAddress');
  if (!orderId || !wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'orderId + walletAddress required' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, wallet);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.currency !== 'GEL') return NextResponse.json({ maxBurn: 0, balance: 0 });
  const balance = await getStarsBalance(wallet).catch(() => 0);
  const maxBurn = computeMaxBurn(order.amountFiat + order.gelDiscount, balance);
  return NextResponse.json({ maxBurn, balance });
}
