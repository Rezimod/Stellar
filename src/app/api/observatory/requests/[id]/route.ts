import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivy } from '@/lib/api-auth';
import { cancelRequest } from '@/lib/observatory/requests';

export const dynamic = 'force-dynamic';

/**
 * Withdraw a request that has not been scheduled yet.
 *
 * Once it holds a slot the night is planned around it, and taking that back is
 * the operator's decision rather than a button.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const privyId = await verifyPrivy(req);
  if (!privyId) {
    return NextResponse.json({ error: 'Sign in to cancel a request' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await cancelRequest(id, privyId))) {
    return NextResponse.json(
      { error: 'That request is not yours, or it already holds a slot.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
