import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivy } from '@/lib/api-auth';
import { getDb } from '@/lib/db';
import { paused } from '@/lib/kill-switch';
import { getNode } from '@/lib/observatory/nodes';
import { sideraVoteRateLimit } from '@/lib/rate-limit';
import { allCards, castVote, voteWeight, votingNight } from '@/lib/sidera/night';
import { holderWallet, limited, NO_LINKED_WALLET } from '@/lib/sidera/route-guards';
import { observableTonight } from '@/lib/sidera/target';

export const runtime = 'nodejs';

/**
 * A holder's vote for the night's card. It counts for tonight until tonight is
 * decided, then for tomorrow; casting again changes it. Only a card Node 01
 * can photograph that night can be voted for, and the weight is fixed now,
 * from the editions the holder holds.
 */
export async function POST(req: NextRequest) {
  const p = paused();
  if (p) return p;
  const privyId = await verifyPrivy(req);
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { walletAddress: named, designation } = body ?? {};
  if (typeof designation !== 'string' || designation.length > 32) {
    return NextResponse.json({ error: 'designation required' }, { status: 400 });
  }
  // The wallet is the one Privy lists for this session; the page's choice is only a preference.
  const walletAddress = await holderWallet(privyId, named);
  if (!walletAddress) return NextResponse.json({ error: NO_LINKED_WALLET }, { status: 403 });
  const l = await limited(sideraVoteRateLimit, walletAddress);
  if (l) return l;

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const node = getNode('tbilisi-01')!;

  const weight = await voteWeight(db, walletAddress);
  if (weight === 0) return NextResponse.json({ error: 'Only a holder of at least one card can vote.' }, { status: 403 });

  const night = await votingNight(db, node, new Date());
  const target = observableTonight(await allCards(db), node, night).find((o) => o.card.designation === designation);
  if (!target) {
    return NextResponse.json({ error: `${designation} cannot be photographed on the night of ${night}.` }, { status: 400 });
  }

  await castVote(db, { wallet: walletAddress, cardId: target.card.id, night, weight });
  return NextResponse.json({ ok: true, night, designation, weight });
}
