import { NextRequest, NextResponse } from 'next/server';
import { adapterFor, getNode } from '@/lib/observatory/nodes';
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

  const priceTetri = (nodeId: string) => Math.round((getNode(nodeId)?.priceGel ?? 0) * 100);
  const minutes = (nodeId: string) => getNode(nodeId)?.sessionMinutes ?? 0;
  const provenance = (nodeId: string) => {
    const node = getNode(nodeId);
    // A session on a node that no longer exists is not evidence of anything.
    return node ? adapterFor(node).provenance : 'simulated';
  };

  const result = await settleDueSessions({
    feeTetriFor: priceTetri,
    minutesFor: minutes,
    provenanceFor: provenance,
  });

  return NextResponse.json({ ok: true, ...result });
}
