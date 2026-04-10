import { NextRequest, NextResponse } from 'next/server';
import { getStarsBalance } from '@/lib/solana';

const TIER_CODES: Record<string, { minStars: number; code: string }> = {
  'Free Moon Lamp': { minStars: 250, code: 'MOONLAMP25' },
  '10% Telescope Discount': { minStars: 500, code: 'STELLAR10' },
  '20% Telescope Discount': { minStars: 1000, code: 'STELLAR20' },
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

  const tierConfig = TIER_CODES[tier];
  if (!tierConfig) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const balance = await getStarsBalance(walletAddress).catch(() => 0);
  if (balance < tierConfig.minStars) {
    return NextResponse.json({ error: 'Insufficient Stars balance' }, { status: 403 });
  }

  return NextResponse.json({ code: tierConfig.code });
}
