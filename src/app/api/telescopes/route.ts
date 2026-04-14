import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { telescopes } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let privyId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    privyId = claims.userId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ telescope: null });

  const rows = await db.select().from(telescopes).where(eq(telescopes.privyId, privyId)).limit(1);
  return NextResponse.json({ telescope: rows[0] ?? null });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let privyId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    privyId = claims.userId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { brand?: unknown; model?: unknown; aperture?: unknown; type?: unknown; walletAddress?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { brand, model, aperture, type, walletAddress } = body;
  if (typeof brand !== 'string' || !brand.trim()) return NextResponse.json({ error: 'brand required' }, { status: 400 });
  if (typeof model !== 'string' || !model.trim()) return NextResponse.json({ error: 'model required' }, { status: 400 });
  if (typeof aperture !== 'string' || !aperture.trim()) return NextResponse.json({ error: 'aperture required' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  // Check if already registered (first registration earns Stars)
  const existing = await db.select({ id: telescopes.id, starsAwarded: telescopes.starsAwarded })
    .from(telescopes).where(eq(telescopes.privyId, privyId)).limit(1);
  const isFirst = existing.length === 0;

  const [telescope] = await db
    .insert(telescopes)
    .values({
      privyId,
      walletAddress: typeof walletAddress === 'string' ? walletAddress : null,
      brand: brand.trim(),
      model: model.trim(),
      aperture: aperture.trim(),
      type: typeof type === 'string' ? type.trim() : null,
      starsAwarded: false,
    })
    .onConflictDoUpdate({
      target: telescopes.privyId,
      set: {
        brand: brand.trim(),
        model: model.trim(),
        aperture: aperture.trim(),
        type: typeof type === 'string' ? type.trim() : null,
        walletAddress: typeof walletAddress === 'string' ? walletAddress : null,
      },
    })
    .returning();

  // Award 50 Stars on first registration (non-blocking)
  if (isFirst && typeof walletAddress === 'string' && walletAddress) {
    fetch(`${req.nextUrl.origin}/api/award-stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientAddress: walletAddress,
        amount: 50,
        reason: 'telescope:first-registration',
        idempotencyKey: `telescope:${privyId}:first`,
      }),
    }).then(() => {
      db.update(telescopes)
        .set({ starsAwarded: true })
        .where(eq(telescopes.privyId, privyId))
        .catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ telescope, starsAwarded: isFirst ? 50 : 0 });
}
