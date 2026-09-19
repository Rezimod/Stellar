import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivy } from '@/lib/api-auth';
import { deletePiece } from '@/lib/base-pieces';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** DELETE /api/bases/:id — take down one of your own pieces. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Sign in to build' }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Unknown piece' }, { status: 404 });
  const outcome = await deletePiece(id, privyId);
  if (outcome === 'deleted') return NextResponse.json({ deleted: true });
  if (outcome === 'not_owner') return NextResponse.json({ error: 'That piece is not yours' }, { status: 403 });
  if (outcome === 'not_found') return NextResponse.json({ error: 'Unknown piece' }, { status: 404 });
  return NextResponse.json({ error: 'Base storage is unavailable' }, { status: 503 });
}
