import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { verifyPrivy } from '@/lib/api-auth';
import { getDb } from '@/lib/db';
import { firstLightOrder } from '@/lib/schema';
import {
  COMMISSION_TETRI,
  FIRST_LIGHT_TIERS,
  placeById,
  priceTetriFor,
  type FirstLightTier,
} from '@/lib/observatory/first-light';
import { MAX_WINDOW_DAYS, priceTetriFor as capturePrice } from '@/lib/observatory/capture-requests';
import { cancelRequest, placeRequest } from '@/lib/observatory/requests';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { checkRateLimit, observatoryRequestRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** The node a commissioned photograph is asked of, while there is one. */
const NODE_ID = 'tbilisi-01';

export async function GET(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Sign in to see your orders' }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ orders: [] });

  try {
    const rows = await db
      .select()
      .from(firstLightOrder)
      .where(eq(firstLightOrder.privyId, privyId))
      .orderBy(desc(firstLightOrder.createdAt))
      .limit(30);
    return NextResponse.json({ orders: rows });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Sign in to order' }, { status: 401 });

  const limit = await checkRateLimit(observatoryRequestRateLimit, privyId);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many orders — try again later.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const recipient = typeof body.recipient === 'string' ? body.recipient.trim().slice(0, 40) : '';
  const occasion = typeof body.occasion === 'string' ? body.occasion.trim().slice(0, 60) : '';
  const tier = body.tier as FirstLightTier;
  const commissioned = body.commissioned === true;

  if (!recipient) {
    return NextResponse.json({ error: 'A poster needs a name on it.' }, { status: 400 });
  }
  if (!(tier in FIRST_LIGHT_TIERS)) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const place = placeById(typeof body.placeId === 'string' ? body.placeId : '');
  const target = SIM_TARGET_BY_ID.get(typeof body.targetId === 'string' ? body.targetId : '');
  if (!place || !target) {
    return NextResponse.json({ error: 'No such place or object' }, { status: 404 });
  }

  const moment = new Date(typeof body.moment === 'string' ? body.moment : '');
  if (Number.isNaN(moment.getTime())) {
    return NextResponse.json({ error: 'That is not a date.' }, { status: 400 });
  }

  // Priced server-side from the tier, never from the body: a client that could
  // name its own price would be naming the operator's share of it.
  const priceTetri = priceTetriFor(tier, commissioned);

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Orders are offline right now.' }, { status: 503 });

  // A commissioned poster *is* a capture request with a print attached — same
  // queue, same scheduler, same operator ladder. Placed first, so an order is
  // never recorded promising a photograph nothing is going to take.
  let captureRequestId: string | null = null;
  if (commissioned) {
    const now = new Date();
    const { outcome, id } = await placeRequest({
      privyId,
      nodeId: NODE_ID,
      targetId: target.id,
      targetName: target.name,
      windowStart: now,
      windowEnd: new Date(now.getTime() + MAX_WINDOW_DAYS * 86_400_000),
      // What the photograph costs the network, not what the poster costs the
      // customer: the ladder pays out of the capture, and the frame is ours.
      priceTetri: capturePrice(target.id) ?? COMMISSION_TETRI,
    });
    if (outcome !== 'queued' || !id) {
      return NextResponse.json(
        {
          error:
            outcome === 'at_limit'
              ? 'You already have as many photographs on order as the queue takes.'
              : 'The capture queue is offline, so a commissioned poster cannot be promised right now.',
        },
        { status: outcome === 'at_limit' ? 409 : 503 },
      );
    }
    captureRequestId = id;
  }

  try {
    const [row] = await db
      .insert(firstLightOrder)
      .values({
        privyId,
        recipient,
        occasion: occasion || null,
        placeId: place.id,
        moment,
        targetId: target.id,
        targetName: target.name,
        tier,
        commissioned,
        priceTetri,
        captureRequestId,
      })
      .returning({ id: firstLightOrder.id });

    return NextResponse.json({ id: row.id, priceTetri }, { status: 201 });
  } catch (err) {
    console.error('[first-light] cannot record order', err);
    // The queue entry was placed a moment ago and belongs to an order that
    // does not exist. Withdraw it rather than leave the instrument booked to
    // photograph something nobody is waiting for.
    if (captureRequestId) await cancelRequest(captureRequestId, privyId);
    return NextResponse.json({ error: 'The order could not be recorded.' }, { status: 503 });
  }
}
