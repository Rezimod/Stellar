import { NextRequest, NextResponse } from 'next/server';
import { getNode } from '@/lib/observatory/nodes';
import { sessionProvenance } from '@/lib/observatory/captures';
import { settleDueSessions } from '@/lib/observatory/settlements';
import { verifyCronSecret } from '@/lib/cron-auth';

export const runtime = 'nodejs';

/**
 * Close the books on sessions whose slot has ended.
 *
 * Settlement is a server's job, not a browser's: a customer who closes the tab
 * at 21:39 still bought the session, and one who leaves it open must not be
 * able to settle it twice. The ledger's unique index makes a double sweep
 * harmless, so this can run as often as it likes.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const minutes = (nodeId: string) => getNode(nodeId)?.sessionMinutes ?? 0;
  // Read back off the frames the session recorded, never asked of the node
  // now: a Darkview observatory is SIMULATED by default and REAL only while an
  // operator has put it there, so asking at sweep time would pay a simulated
  // session because the telescope happens to be on an hour later.
  const provenance = (session: { id: string }) => sessionProvenance(session.id);

  const result = await settleDueSessions({
    minutesFor: minutes,
    provenanceFor: provenance,
  });

  return NextResponse.json({ ok: true, ...result });
}
