import { NextRequest, NextResponse } from 'next/server';
import { earningsForNode } from '@/lib/observatory/earnings';
import { NODES } from '@/lib/observatory/nodes';
import { OPERATOR_TIERS } from '@/lib/observatory/operator-tiers';
import { verifyPrivy } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * The supply side's own view.
 *
 * The ladder is public — it is the offer, and an owner deciding whether to
 * list needs to see it before signing in. Earnings are not: they are returned
 * only for the nodes this account actually operates.
 */
export async function GET(req: NextRequest) {
  const privyId = await verifyPrivy(req);

  const mine = privyId ? NODES.filter((n) => n.operatorPrivyId === privyId) : [];
  const nodes = await Promise.all(
    mine.map(async (node) => ({
      id: node.id,
      name: node.name,
      site: node.site,
      priceGel: node.priceGel,
      sessionMinutes: node.sessionMinutes,
      earnings: await earningsForNode(node.id),
    })),
  );

  return NextResponse.json({ tiers: OPERATOR_TIERS, nodes });
}
