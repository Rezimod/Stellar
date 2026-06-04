import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { pushSubscription } from '@/lib/schema';

export const runtime = 'nodejs';

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  wallet?: string;
  lat?: number;
  lon?: number;
  city?: string;
  prefs?: Record<string, boolean>;
}

export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return new NextResponse(null, { status: 204 });

  let body: SubBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'endpoint and keys required' }, { status: 400 });
  }

  const values = {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    wallet: typeof body.wallet === 'string' ? body.wallet : null,
    lat: Number.isFinite(body.lat) ? body.lat! : null,
    lon: Number.isFinite(body.lon) ? body.lon! : null,
    city: typeof body.city === 'string' ? body.city.slice(0, 120) : null,
    prefs: body.prefs ?? null,
  };

  try {
    await db
      .insert(pushSubscription)
      .values(values)
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: {
          p256dh: values.p256dh,
          auth: values.auth,
          wallet: values.wallet,
          lat: values.lat,
          lon: values.lon,
          city: values.city,
          prefs: values.prefs,
        },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  if (!db) return new NextResponse(null, { status: 204 });

  let endpoint: string | undefined;
  try {
    endpoint = (await req.json())?.endpoint;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

  try {
    await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
