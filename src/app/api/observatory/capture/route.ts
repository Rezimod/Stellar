import { NextRequest, NextResponse } from 'next/server';
import { capturesForSession, recordCapture } from '@/lib/observatory/captures';
import { ROI_BY_ID, TRAIN_BY_ID } from '@/lib/observatory/optics';
import { getNode } from '@/lib/observatory/nodes';
import { reservationById } from '@/lib/observatory/reservations';
import { PREP_LEAD_MS } from '@/lib/observatory/session-phase';
import { verifyPrivy } from '@/lib/api-auth';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { checkRateLimit, observatoryCaptureRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** The longest sub this rig can be asked for, and the most it can stack. */
const MAX_EXPOSURE_SEC = 600;
const MAX_SUBS = 100_000;

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to capture' }, { status: 401 });
  }
  const limit = await checkRateLimit(observatoryCaptureRateLimit, privyId);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many captures — try again later' }, { status: 429 });
  }

  let body: {
    sessionId?: unknown;
    targetId?: unknown;
    targetName?: unknown;
    exposureSec?: unknown;
    subs?: unknown;
    opticalTrain?: unknown;
    roi?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  const { sessionId, targetId, exposureSec, subs, opticalTrain, roi } = body;
  if (
    typeof sessionId !== 'string' ||
    typeof targetId !== 'string' ||
    typeof exposureSec !== 'number' ||
    typeof subs !== 'number' ||
    !Number.isFinite(exposureSec) ||
    !Number.isInteger(subs) ||
    exposureSec <= 0 ||
    exposureSec > MAX_EXPOSURE_SEC ||
    subs < 1 ||
    subs > MAX_SUBS
  ) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  const target = SIM_TARGET_BY_ID.get(targetId);
  if (!target) {
    return NextResponse.json({ error: 'No such object' }, { status: 400 });
  }

  // The light path is the client's to describe — it is a console setting, not
  // a claim about the sky — but only in the configurations this rig has. An
  // unknown train or crop would make the gallery redraw a field that never
  // existed, so it is rejected rather than defaulted.
  const train = typeof opticalTrain === 'string' ? opticalTrain : 'native';
  const readout = typeof roi === 'string' ? roi : 'full';
  if (!TRAIN_BY_ID.has(train) || !ROI_BY_ID.has(readout)) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const reservation = await reservationById(sessionId);
  if (!reservation || reservation.privyId !== privyId) {
    return NextResponse.json({ error: 'No such session' }, { status: 404 });
  }

  // A capture belongs to the slot that was booked. Outside it, the instrument
  // is somebody else's.
  const now = Date.now();
  const opensAt = new Date(reservation.startsAt).getTime() - PREP_LEAD_MS;
  const endsAt = new Date(reservation.endsAt).getTime();
  if (now < opensAt || now >= endsAt) {
    return NextResponse.json({ error: 'That session is not running' }, { status: 409 });
  }

  const node = getNode(reservation.nodeId);
  if (!node) {
    return NextResponse.json({ error: 'No such session' }, { status: 404 });
  }

  // This endpoint records the browser simulator. A connected telescope's
  // current mode cannot turn browser-supplied settings into sensor evidence.

  const result = await recordCapture({
    sessionId: reservation.id,
    nodeId: node.id,
    privyId,
    targetId,
    targetName: target.name,
    provenance: 'simulated',
    exposureSec,
    subs,
    opticalTrain: train,
    roi: readout,
    capturedAt: new Date(now),
  });

  if (!result.recorded) {
    return NextResponse.json({ error: 'The capture could not be stored' }, { status: 503 });
  }

  return NextResponse.json(
    { capture: result.capture, admitted: result.admitted, reason: result.reason },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to see your captures' }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get('session');
  if (!sessionId) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  return NextResponse.json({ captures: await capturesForSession(sessionId, privyId) });
}
