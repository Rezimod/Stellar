import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { PrivyClient } from '@privy-io/server-auth';
import { redeemRateLimit, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Tier = 'basic' | 'plus' | 'premium';

interface TierConfig {
  minStars: number;
  discountPct: number;
  label: string;
}

const TIERS: Record<Tier, TierConfig> = {
  basic:   { minStars: 250,  discountPct: 10, label: '10% off any Astroman product' },
  plus:    { minStars: 500,  discountPct: 20, label: '20% off any Astroman product' },
  premium: { minStars: 1000, discountPct: 15, label: 'Free accessory (eyepiece kit or moon filter) + 15% off telescopes' },
};

interface RedemptionCode {
  code: string;
  wallet: string;
  starsRedeemed: number;
  tier: Tier;
  discountPct: number;
  createdAt: number;
  used: boolean;
}

declare global {
  var __stellarRedemptions: Map<string, RedemptionCode> | undefined;
}

function store(): Map<string, RedemptionCode> {
  if (!globalThis.__stellarRedemptions) {
    globalThis.__stellarRedemptions = new Map();
  }
  return globalThis.__stellarRedemptions;
}

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

function isTier(v: unknown): v is Tier {
  return v === 'basic' || v === 'plus' || v === 'premium';
}

function generateCode(tier: Tier, wallet: string): string {
  const prefix = wallet.slice(0, 4);
  const stamp = Date.now().toString(36).toUpperCase();
  return `STELLAR-${tier.toUpperCase()}-${prefix}-${stamp}`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { walletAddress?: unknown; starsAmount?: unknown; tier?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { walletAddress, starsAmount, tier } = body;

  if (typeof walletAddress !== 'string' || walletAddress.length === 0) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }
  try {
    new PublicKey(walletAddress);
  } catch {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  if (typeof starsAmount !== 'number' || !Number.isInteger(starsAmount) || starsAmount <= 0) {
    return NextResponse.json({ error: 'starsAmount must be a positive integer' }, { status: 400 });
  }

  if (!isTier(tier)) {
    return NextResponse.json({ error: 'tier must be basic | plus | premium' }, { status: 400 });
  }

  const cfg = TIERS[tier];
  if (starsAmount < cfg.minStars) {
    return NextResponse.json(
      { error: `Tier '${tier}' requires at least ${cfg.minStars} Stars (you sent ${starsAmount})` },
      { status: 400 },
    );
  }

  const { success, remaining } = await checkRateLimit(redeemRateLimit, walletAddress).catch(
    () => ({ success: true, remaining: 0, reset: 0 }),
  );
  if (!success) {
    return NextResponse.json(
      { error: 'Too many redemption requests. Wait a bit and try again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  }

  const code = generateCode(tier, walletAddress);
  const record: RedemptionCode = {
    code,
    wallet: walletAddress,
    starsRedeemed: starsAmount,
    tier,
    discountPct: cfg.discountPct,
    createdAt: Date.now(),
    used: false,
  };
  store().set(code, record);

  return NextResponse.json({
    code,
    tier,
    discount: cfg.label,
    validAt: ['astroman.ge', 'Astroman Tbilisi store (Vake)'],
    expiresIn: '30 days',
    instruction: 'Show this code at checkout on astroman.ge or at the physical store',
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await privy.verifyAuthToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ codes: [] });
  const mine = Array.from(store().values()).filter((r) => r.wallet === wallet);
  return NextResponse.json({ codes: mine });
}
