import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { telescopes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { isValidPublicKey } from '@/lib/validate';

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

  const VALID_TYPES = ['refractor', 'reflector', 'cassegrain', 'dobsonian', 'goto', 'binoculars', 'other'];

  if (typeof brand !== 'string' || !brand.trim()) return NextResponse.json({ error: 'Invalid telescope data', field: 'brand' }, { status: 400 });
  if (typeof model !== 'string' || !model.trim()) return NextResponse.json({ error: 'Invalid telescope data', field: 'model' }, { status: 400 });
  if (typeof aperture !== 'string' || !aperture.trim()) return NextResponse.json({ error: 'Invalid telescope data', field: 'aperture' }, { status: 400 });
  if (type != null && (typeof type !== 'string' || !VALID_TYPES.includes(type))) {
    return NextResponse.json({ error: 'Invalid telescope data', field: 'type' }, { status: 400 });
  }
  if (walletAddress != null && (typeof walletAddress !== 'string' || !isValidPublicKey(walletAddress))) {
    return NextResponse.json({ error: 'Invalid telescope data', field: 'walletAddress' }, { status: 400 });
  }

  const cleanBrand = brand.trim().slice(0, 100);
  const cleanModel = model.trim().slice(0, 200);
  const cleanAperture = aperture.trim().slice(0, 50);

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
      brand: cleanBrand,
      model: cleanModel,
      aperture: cleanAperture,
      type: typeof type === 'string' ? type.trim() : null,
      starsAwarded: false,
    })
    .onConflictDoUpdate({
      target: telescopes.privyId,
      set: {
        brand: cleanBrand,
        model: cleanModel,
        aperture: cleanAperture,
        type: typeof type === 'string' ? type.trim() : null,
        walletAddress: typeof walletAddress === 'string' ? walletAddress : null,
      },
    })
    .returning();

  // Award 50 Stars on first registration (non-blocking). /api/award-stars
  // re-checks this telescope row, decides the amount itself, and marks the
  // bonus paid only once the Stars are on chain — so nothing is recorded as
  // awarded here, where a failed request would look like a success.
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
    }).catch((err) => console.error('[telescopes] award-stars request failed:', err));
  }

  return NextResponse.json({ telescope, starsAwarded: isFirst ? 50 : 0 });
}
