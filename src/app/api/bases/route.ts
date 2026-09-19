import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivy } from '@/lib/api-auth';
import { basePlaceRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { insertPiece, listPieces, type PieceRow } from '@/lib/base-pieces';
import {
  BUILD_SCOPES, BUILD_WORLDS, CAPS, checkPlacement, quarterOf, yawOfQuarter,
  type BuildScope, type BuildWorld,
} from '@/lib/solar-system/build-rules';

export const dynamic = 'force-dynamic';

const isWorld = (v: unknown): v is BuildWorld => typeof v === 'string' && (BUILD_WORLDS as readonly string[]).includes(v);
const isScope = (v: unknown): v is BuildScope => typeof v === 'string' && (BUILD_SCOPES as readonly string[]).includes(v);

/** What a player is shown of a piece: never whose it is, only whether it is theirs. */
const view = (r: PieceRow, privyId: string | null) => ({
  id: r.id, scope: r.scope, module: r.module, x: r.x, z: r.z, yaw: r.yaw, mine: privyId !== null && r.ownerPrivyId === privyId,
});

const unavailable = () => NextResponse.json({ error: 'Base storage is unavailable' }, { status: 503 });

/** GET /api/bases?world=moon — the colony, plus the caller's own pieces when signed in. */
export async function GET(req: NextRequest) {
  const world = req.nextUrl.searchParams.get('world');
  if (!isWorld(world)) return NextResponse.json({ error: 'Unknown world' }, { status: 400 });
  const privyId = await verifyPrivy(req);
  const rows = await listPieces(world, privyId);
  if (!rows) return unavailable();
  return NextResponse.json({ world, signedIn: privyId !== null, caps: CAPS, pieces: rows.map((r) => view(r, privyId)) });
}

/** POST /api/bases — place one piece: { world, scope, module, x, z, yaw }. */
export async function POST(req: NextRequest) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Sign in to build' }, { status: 401 });

  const { success } = await checkRateLimit(basePlaceRateLimit, `base:${privyId}`);
  if (!success) return NextResponse.json({ error: 'Building too fast' }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }
  const { world, scope, module, x, z, yaw } = body;
  if (!isWorld(world) || !isScope(scope) || typeof module !== 'string' || typeof x !== 'number' || typeof z !== 'number' || typeof yaw !== 'number') {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const rows = await listPieces(world, privyId);
  if (!rows) return unavailable();
  // The pieces that share this piece's ground: the whole colony, or the
  // caller's own private pieces (nobody else's are on their map).
  const others = rows.filter((r) => r.scope === scope && (scope === 'colony' || r.ownerPrivyId === privyId));
  const mine = rows.filter((r) => r.scope === scope && r.ownerPrivyId === privyId).length;
  if (mine >= CAPS[scope]) return NextResponse.json({ error: 'Piece limit reached', problem: 'cap' }, { status: 409 });
  if (scope === 'colony' && others.length >= CAPS.colonyTotal) return NextResponse.json({ error: 'The colony is full', problem: 'cap' }, { status: 409 });

  const problem = checkPlacement(world, scope, { module, x, z, yaw }, others);
  if (problem === 'overlap') return NextResponse.json({ error: 'Something is already there', problem }, { status: 409 });
  if (problem) return NextResponse.json({ error: 'Cannot build there', problem }, { status: 400 });

  const row = await insertPiece({ world, scope, ownerPrivyId: privyId, module, x, z, yaw: yawOfQuarter(quarterOf(yaw)) });
  if (!row) return unavailable();
  return NextResponse.json({ piece: view(row, privyId) }, { status: 201 });
}
