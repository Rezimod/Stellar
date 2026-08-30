import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { isValidEmail } from '@/lib/validate';
import { checkRateLimit, emailSubscribeRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  try {
    const { success } = await checkRateLimit(emailSubscribeRateLimit, ip);
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  } catch {
    // Newsletter signup remains available if the optional rate-limit service is down.
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { email } = body;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 500) : '';
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ ok: true });
  }

  try {
    await db.execute(
      sql`INSERT INTO email_subscribers (email, created_at) VALUES (${cleanEmail}, now()) ON CONFLICT (email) DO NOTHING`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }
}
