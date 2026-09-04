import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivy } from '@/lib/api-auth';
import { checkWindow, priceTetriFor } from '@/lib/observatory/capture-requests';
import { getNode } from '@/lib/observatory/nodes';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { placeRequest, requestsFor } from '@/lib/observatory/requests';
import { observatoryRequestRateLimit } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to see your requests' }, { status: 401 });
  }
  return NextResponse.json({ requests: await requestsFor(privyId) });
}

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to request a capture' }, { status: 401 });
  }

  const limit = await checkRateLimit(observatoryRequestRateLimit, privyId);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests — try again later.' }, { status: 429 });
  }

  let body: { nodeId?: unknown; targetId?: unknown; windowStart?: unknown; windowEnd?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const { nodeId, targetId, windowStart, windowEnd } = body;
  if (
    typeof nodeId !== 'string' ||
    typeof targetId !== 'string' ||
    typeof windowStart !== 'string' ||
    typeof windowEnd !== 'string'
  ) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const node = getNode(nodeId);
  const target = SIM_TARGET_BY_ID.get(targetId);
  if (!node || !target) {
    return NextResponse.json({ error: 'No such instrument or target' }, { status: 404 });
  }

  // Priced from the target, server-side. A client that could name its own price
  // would be naming the operator's wage.
  const priceTetri = priceTetriFor(targetId);
  if (priceTetri === null) {
    return NextResponse.json({ error: 'That target is not offered' }, { status: 400 });
  }

  const start = new Date(windowStart);
  const end = new Date(windowEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const window = checkWindow(start, end);
  if (!window.ok) {
    return NextResponse.json({ error: window.reason }, { status: 400 });
  }

  const { outcome, id } = await placeRequest({
    privyId,
    nodeId: node.id,
    targetId,
    targetName: target.name,
    windowStart: start,
    windowEnd: end,
    priceTetri,
  });

  if (outcome === 'at_limit') {
    return NextResponse.json(
      { error: 'You already have as many open requests as the queue takes.' },
      { status: 409 },
    );
  }
  if (outcome === 'unavailable') {
    return NextResponse.json({ error: 'The queue is offline right now.' }, { status: 503 });
  }

  return NextResponse.json({ id, priceTetri }, { status: 201 });
}
