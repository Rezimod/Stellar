// POST /api/cohort/upsert — write the acquisition-attribution row for a user,
// once, on their first authenticated session. Called from useUserSync right
// after the embedded wallet exists, carrying the UTM snapshot captured at first
// page load plus the signup method detected from the Privy account list.
//
// First write wins: `on conflict (wallet) do nothing` means a returning user's
// cohort is never overwritten by a later visit. The `signup` analytics event is
// emitted only when this call actually inserts a new row (the .returning()
// array is non-empty) — so signup fires exactly once per user, at acquisition.

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { userCohorts } from '@/lib/schema';
import { isValidPublicKey } from '@/lib/validate';
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth';
import { trackServer } from '@/lib/track-server';

export const runtime = 'nodejs';

type SignupMethod = 'email' | 'google' | 'twitter' | 'wallet';
const METHODS = new Set<SignupMethod>(['email', 'google', 'twitter', 'wallet']);

function str(v: unknown, max = 256): string | null {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const wallet = body.wallet;
  if (typeof wallet !== 'string' || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 });
  }
  const owns = await assertOwnsWallet(privyId, wallet);
  if (!owns) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 });
  }

  const method: SignupMethod = METHODS.has(body.method as SignupMethod)
    ? (body.method as SignupMethod)
    : 'email';

  // Country from the platform edge header, if the host provides it. Never fatal.
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null;

  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, db: false });

  try {
    const inserted = await db
      .insert(userCohorts)
      .values({
        wallet,
        privyUserId: privyId,
        utmSource: str(body.utm_source, 64),
        utmMedium: str(body.utm_medium, 64),
        utmCampaign: str(body.utm_campaign, 128),
        utmContent: str(body.utm_content, 128),
        referrer: str(body.referrer, 512),
        landingPath: str(body.landing_path, 256),
        country: country ? country.slice(0, 8) : null,
      })
      .onConflictDoNothing({ target: userCohorts.wallet })
      .returning({ wallet: userCohorts.wallet });

    // Non-empty → a row was actually inserted → this is the user's first
    // session. Emit signup exactly once, here, at acquisition.
    if (inserted.length > 0) {
      trackServer('signup', wallet, { method });
    }

    return NextResponse.json({ ok: true, created: inserted.length > 0 });
  } catch (err) {
    console.error('[cohort/upsert] insert failed:', err);
    // Attribution is best-effort — never surface a hard error to login flow.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
