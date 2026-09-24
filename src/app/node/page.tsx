import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';
import ObservatoryConsole, { type TonightCard } from '@/components/sidera/observatory/ObservatoryConsole';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { tonightView } from '@/lib/sidera/night';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Observatory — Sidera',
  description:
    'Connect to a telescope under a dark sky, park, calibrate, choose a target, point and capture. Simulated frames of the real sky.',
};

/** The observatory: the live console. Quick start points Node 01 at tonight's card. */
export default async function ObservatoryPage() {
  const node = getNode('tbilisi-01')!;
  let tonight: TonightCard = null;
  let nodeCloud: number | null = null;
  const db = getDb();
  if (db) {
    try {
      const view = await tonightView(db, node, new Date());
      nodeCloud = view.decided?.cloudForecast ?? null;
      // The decided card, else the one leading the vote, else the highest.
      const lead =
        view.decided?.designation ??
        view.voting.candidates.reduce<(typeof view.voting.candidates)[number] | null>((best, c) => (!best || c.votes > best.votes ? c : best), null)?.designation;
      const card = lead ? SET_001_CARD_BY_DESIGNATION.get(lead) : undefined;
      if (card?.seed.targetId) tonight = { designation: card.seed.designation, name: card.seed.name, targetId: card.seed.targetId };
    } catch (err) {
      console.error('[sidera] cannot read tonight for the observatory', err);
    }
  }
  return (
    <SideraShell bare>
      <ObservatoryConsole tonight={tonight} nodeCloud={nodeCloud} />
    </SideraShell>
  );
}
