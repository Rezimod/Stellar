import { NextRequest, NextResponse } from 'next/server';
import { getStarsBalance } from '@/lib/solana';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ balance: 0 });
  try {
    const balance = await getStarsBalance(address);
    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
