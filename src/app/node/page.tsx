import type { Metadata } from 'next';
import StellarShell from '@/components/stellar/StellarShell';
import StellarTabBar from '@/components/stellar/StellarTabBar';
import ObservatoryConsole, { type TonightCard } from '@/components/stellar/observatory/ObservatoryConsole';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { isRarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { tonightView } from '@/lib/stellar/night';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Observatory — demo · Skychaser',
  description:
    'A demo of the observatory console: park, calibrate, choose a target, point and capture. Simulated frames of the real sky until first light in November 2026.',
};

/** The observatory: the console as a demo until first light. Quick start points it at tonight's card. */
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
      if (card?.seed.targetId && isRarity(card.seed.rarity))
        tonight = { designation: card.seed.designation, name: card.seed.name, targetId: card.seed.targetId, rarity: card.seed.rarity };
    } catch (err) {
      console.error('[stellar] cannot read tonight for the observatory', err);
    }
  }
  return (
    <StellarShell bare>
      <ObservatoryConsole tonight={tonight} nodeCloud={nodeCloud} />
      <StellarTabBar />
    </StellarShell>
  );
}
