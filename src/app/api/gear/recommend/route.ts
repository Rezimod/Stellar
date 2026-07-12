import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/schema';
import { getGearRecommendations } from '@/lib/gear-recommender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let userId: string | null = null;
  if (token) {
    try {
      const claims = await getPrivy().verifyAuthToken(token);
      userId = claims.userId;
    } catch {
      // Allow anonymous recommendations
    }
  }

  try {
    const body = (await req.json()) as {
      experienceLevel: string;
      budgetGEL: number;
      observingInterests: string[];
      portability: string;
      locale?: string;
    };

    if (
      !body.experienceLevel ||
      typeof body.budgetGEL !== 'number' ||
      !Array.isArray(body.observingInterests) ||
      !body.portability
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const locale = (body.locale === 'ka' ? 'ka' : 'en') as 'en' | 'ka';
    let starsBalance = 0;

    // If authenticated, get user's Stars balance for personalization
    if (userId) {
      try {
        // For now, we'll skip getting Stars balance from Solana
        // In a real implementation, fetch from /api/stars-balance
        // For this MVP, we'll let the recommender know about it optionally
      } catch {
        // Silently fail and continue
      }
    }

    const recommendations = await getGearRecommendations({
      experienceLevel: body.experienceLevel as 'beginner' | 'intermediate' | 'advanced',
      budgetGEL: body.budgetGEL,
      observingInterests: body.observingInterests,
      portability: body.portability as 'stationary' | 'portable' | 'ultra-portable',
      starsBalance,
      locale,
    });

    return NextResponse.json({ recommendations }, { status: 200 });
  } catch (err) {
    console.error('[GearRecommend] Error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
