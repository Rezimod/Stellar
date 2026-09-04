import { NextRequest, NextResponse } from 'next/server';
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

  try {
    // One row per owner: a second submission updates the gear rather than
    // filling the list with the same person twice.
    await db
      .insert(observatoryOperatorInterest)
      .values({
        privyId: await verifyPrivy(req),
        email: email.toLowerCase(),
        city,
        telescope,
        mount: clean(body.mount, MAX.mount),
        camera: clean(body.camera, MAX.camera),
        note: clean(body.note, MAX.note),
      })
      .onConflictDoUpdate({
        target: observatoryOperatorInterest.email,
        set: {
          city,
          telescope,
          mount: clean(body.mount, MAX.mount),
          camera: clean(body.camera, MAX.camera),
          note: clean(body.note, MAX.note),
        },
      });

    return NextResponse.json({ registered: true }, { status: 201 });
  } catch (err) {
    console.error('[observatory] cannot register interest', err);
    return NextResponse.json({ error: 'Registration is unavailable right now' }, { status: 503 });
  }
}
