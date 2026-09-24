import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import CapsuleTiers, { type TierCard } from '@/components/sidera/CapsuleTiers';
import ShopFloor from '@/components/sidera/ShopFloor';
import type { ShopCardProps } from '@/components/sidera/ShopCard';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { RARITIES, type Rarity } from '@/lib/rarity';
import { card } from '@/lib/schema';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { readSetSupply } from '@/lib/sidera/capsule';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import { nightRow } from '@/lib/sidera/night';
import { siteNightDate } from '@/lib/sidera/target';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Sidera — the night sky, issued in editions',
  description:
    'Twenty-four cards, each held as a numbered edition. A telescope in Tbilisi photographs one real object a night, and everyone holding that card gets the photograph.',
};

export default async function HomePage() {
  const node = getNode('tbilisi-01')!;
  const db = getDb();

  let remaining = new Map<string, number>();
  let tonight: string | null = null;
  if (db) {
    try {
      const [supply, night] = await Promise.all([
        readSetSupply(db, SET_001.code),
        nightRow(db, siteNightDate(node.timezone, new Date())),
      ]);
      if (supply) remaining = new Map(supply.cards.map((c) => [c.designation, c.remaining]));
      if (night) {
        const [row] = await db.select({ designation: card.designation }).from(card).where(eq(card.id, night.cardId));
        tonight = row?.designation ?? null;
      }
    } catch (err) {
      console.error('[sidera] cannot read the floor', err);
    }
  }

  // Scarcest first, the way a shelf puts its best stock at eye level.
  const seeds = SET_001_CARDS.map(({ seed }) => seed).sort(
    (a, b) => RARITIES.indexOf(b.rarity as Rarity) - RARITIES.indexOf(a.rarity as Rarity),
  );
  const cards: ShopCardProps[] = seeds.map((seed) => {
    const rarity = seed.rarity as Rarity;
    const left = remaining.get(seed.designation) ?? seed.editionSize;
    return {
      designation: seed.designation,
      name: seed.name,
      rarity,
      sub: `${left} of ${seed.editionSize} left`,
      price: `$${DIRECT_CARD_PRICE_USD[rarity]}`,
      tag: seed.designation === tonight ? 'Tonight' : undefined,
    };
  });
  const tierCards: TierCard[] = seeds.map((seed) => ({
    designation: seed.designation,
    name: seed.name,
    rarity: seed.rarity as Rarity,
    editionSize: seed.editionSize,
  }));

  return (
    <SideraShell title="Sidera">
      <SideraView step="landing" />
      <div className="sd-shop">
        <CapsuleTiers cards={tierCards} />
        <div className="sd-shop__set">
          <span className="sd-label">Set 001 · {cards.length} cards</span>
          <Link href="/capsules/log" className="sd-shop__chip">
            Provably fair · log
          </Link>
        </div>
        <ShopFloor cards={cards} />
      </div>
    </SideraShell>
  );
}
