import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { observatoryOperatorInterest } from '@/lib/schema';
import { verifyPrivy } from '@/lib/api-auth';
import { checkRateLimit, operatorInterestRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX = { email: 200, city: 80, telescope: 120, mount: 120, camera: 120, note: 600 } as const;

function clean(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.length > limit ? null : trimmed;
}

/** Register a telescope for the network. Open to anyone — signing in is not the point yet. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { success } = await checkRateLimit(operatorInterestRateLimit, `obs:interest:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const email = clean(body.email, MAX.email);
  const city = clean(body.city, MAX.city);
  const telescope = clean(body.telescope, MAX.telescope);
  if (!email || !email.includes('@') || !city || !telescope) {
    return NextResponse.json(
      { error: 'Email, city and telescope are needed' },
      { status: 400 },
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Registration is unavailable right now' }, { status: 503 });
  }

  const privyId = await verifyPrivy(req);
  const address = email.toLowerCase();
  const gear = {
    city,
    telescope,
    mount: clean(body.mount, MAX.mount),
    camera: clean(body.camera, MAX.camera),
    note: clean(body.note, MAX.note),
  };

  try {
    // One row per owner. The first submission for an address wins; only the
    // account that made it may update the gear later. A stranger typing
    // someone else's email overwrites nothing, and is told nothing about
    // whether the address was already on the list.
    const inserted = await db
      .insert(observatoryOperatorInterest)
      .values({ privyId, email: address, ...gear })
      .onConflictDoNothing({ target: observatoryOperatorInterest.email })
      .returning({ id: observatoryOperatorInterest.id });

    if (inserted.length === 0 && privyId) {
      await db
        .update(observatoryOperatorInterest)
        .set(gear)
        .where(and(
          eq(observatoryOperatorInterest.email, address),
          eq(observatoryOperatorInterest.privyId, privyId),
        ));
    }

    return NextResponse.json({ registered: true }, { status: 201 });
  } catch (err) {
    console.error('[observatory] cannot register interest', err);
    return NextResponse.json({ error: 'Registration is unavailable right now' }, { status: 503 });
  }
}
