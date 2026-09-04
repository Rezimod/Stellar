import { NextRequest, NextResponse } from 'next/server';
import { capturesForSession, recordCapture } from '@/lib/observatory/captures';
import { ROI_BY_ID, TRAIN_BY_ID } from '@/lib/observatory/optics';
import { adapterFor, getNode } from '@/lib/observatory/nodes';
import { reservationById } from '@/lib/observatory/reservations';
import { PREP_LEAD_MS } from '@/lib/observatory/session-phase';
import { verifyPrivy } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** The longest sub this rig can be asked for, and the most it can stack. */
const MAX_EXPOSURE_SEC = 600;
const MAX_SUBS = 100_000;

export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to capture' }, { status: 401 });
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

  const { sessionId, targetId, targetName, exposureSec, subs, opticalTrain, roi } = body;
  if (
    typeof sessionId !== 'string' ||
    typeof targetId !== 'string' ||
    typeof targetName !== 'string' ||
    typeof exposureSec !== 'number' ||
    typeof subs !== 'number' ||
    !Number.isFinite(exposureSec) ||
    !Number.isFinite(subs) ||
    exposureSec <= 0 ||
    exposureSec > MAX_EXPOSURE_SEC ||
    subs < 1 ||
    subs > MAX_SUBS
  ) {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
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

  // Provenance comes from the adapter, never from the request body: a client
  // cannot describe its own frame as instrument-grade. It is asked for at the
  // moment of capture rather than read off the class, because a node platform
  // can be running its own simulator while connected.
  const provenance = await adapterFor(node).provenanceNow(node, new Date(now));

  const result = await recordCapture({
    sessionId: reservation.id,
    nodeId: node.id,
    privyId,
    targetId,
    targetName,
    provenance,
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
