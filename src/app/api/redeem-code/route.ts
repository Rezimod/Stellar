import { NextRequest, NextResponse } from 'next/server';
import { getStarsBalance } from '@/lib/solana';
import { redeemRateLimit, checkRateLimit } from '@/lib/rate-limit';

const TIER_CODES: Record<string, { minStars: number; code: string | undefined }> = {
  'Free Moon Lamp': { minStars: 250, code: process.env.REWARD_CODE_MOONLAMP },
  '10% Telescope Discount': { minStars: 500, code: process.env.REWARD_CODE_10PCT },
  '20% Telescope Discount': { minStars: 1000, code: process.env.REWARD_CODE_20PCT },
};

export async function POST(req: NextRequest) {
  let body: { tier?: unknown; walletAddress?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tier, walletAddress } = body;

  if (typeof tier !== 'string' || typeof walletAddress !== 'string') {
    return NextResponse.json({ error: 'tier and walletAddress are required' }, { status: 400 });
  }

  const { success, remaining } = await checkRateLimit(redeemRateLimit, walletAddress);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  const tierConfig = TIER_CODES[tier];
  if (!tierConfig) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }
  if (!tierConfig.code) {
    return NextResponse.json({ error: 'Reward not configured' }, { status: 503 });
  }

  const balance = await getStarsBalance(walletAddress).catch(() => 0);
  if (balance < tierConfig.minStars) {
    return NextResponse.json({ error: 'Insufficient Stars balance' }, { status: 403 });
  }

  return NextResponse.json({ code: tierConfig.code });
}
