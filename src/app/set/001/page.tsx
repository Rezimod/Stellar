import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import AlmanacDate from '@/components/stellar/AlmanacDate';
import CapsuleCounter, { type TierCard } from '@/components/stellar/CapsuleCounter';
import ShelfFilter from '@/components/stellar/ShelfFilter';
import ShopCard from '@/components/stellar/ShopCard';
import StellarShell from '@/components/stellar/StellarShell';
import StellarView from '@/components/stellar/StellarView';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { RARITIES, type Rarity } from '@/lib/rarity';
import { card } from '@/lib/schema';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { cardStatus } from '@/lib/stellar/almanac';
import { capsulesOnSale, readSetSupply } from '@/lib/stellar/capsule';
import { DIRECT_CARD_PRICE_USD } from '@/lib/stellar/economics';
import { nightRow } from '@/lib/stellar/night';
import { siteNightDate } from '@/lib/stellar/target';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'First Light — capsules and cards',
  description:
    'A hundred cards, numbered outward from Earth: the Solar System, the Stars, the Deep Sky, the Galaxies, the Extremes, the Frontier and the Almanac. Opened from four capsules, from $5.',
};

export default async function FirstLightPage() {
  const node = getNode('tbilisi-01')!;
  const db = getDb();

  let remaining = new Map<string, number>();
  let status: string = SET_001.status;
  let tonight: string | null = null;
  let onSale: Record<string, number> | null = null;
  if (db) {
    try {
      const [supply, night, listed] = await Promise.all([
        readSetSupply(db, SET_001.code),
        nightRow(db, siteNightDate(node.timezone, new Date())),
        capsulesOnSale(db, { limit: 1000 }).catch((err) => {
          console.error('[stellar] cannot read capsules on sale', err);
          return null;
        }),
      ]);
      if (supply) {
        status = supply.status;
        remaining = new Map(supply.cards.map((c) => [c.designation, c.remaining]));
      }
      if (listed) {
        onSale = {};
        for (const c of listed) if (c.tier) onSale[c.tier] = (onSale[c.tier] ?? 0) + 1;
      }
      if (night) {
        const [row] = await db.select({ designation: card.designation }).from(card).where(eq(card.id, night.cardId));
        tonight = row?.designation ?? null;
      }
    } catch (err) {
      console.error('[stellar] cannot read the set', err);
    }
  }

  // Scarcest first, the way a shelf puts its best stock at eye level; the set's own order within a rarity.
  const now = new Date();
  const sorted = [...SET_001_CARDS].sort(
    (a, b) => RARITIES.indexOf(b.seed.rarity as Rarity) - RARITIES.indexOf(a.seed.rarity as Rarity),
  );
  // A sealed card is out of every capsule.
  const tierCards: TierCard[] = sorted
    .filter((c) => cardStatus(c, now) === 'open')
    .map(({ seed }) => ({ designation: seed.designation, name: seed.name, rarity: seed.rarity as Rarity, editionSize: seed.editionSize }));
  const editions = SET_001_CARDS.reduce((sum, c) => sum + c.seed.editionSize, 0);

  return (
    <StellarShell>
      <StellarView step="set" />
      <div className="sd-fl">
        <CapsuleCounter cards={tierCards} onSale={onSale} />

        <section className="sd-fl__set" aria-labelledby="fl-title">
          <header className="sd-fl__head">
            <div>
              <h1 className="sd-fl__title" id="fl-title">
                First Light
              </h1>
              <p className="sd-fl__meta">
                Founding set · {editions.toLocaleString('en-GB')} editions · {status === 'released' ? 'Released' : 'Pre-release'}
              </p>
            </div>
            <ShelfFilter total={SET_001_CARDS.length} />
          </header>

          <ul className="sd-fl__grid">
            {sorted.map((c) => {
              const { seed, record } = c;
              const rarity = seed.rarity as Rarity;
              const sealed = cardStatus(c, now) === 'sealed';
              return (
                <li key={seed.designation} data-shelf-item data-section={record.family} data-name={`${seed.name} ${seed.designation}`.toLowerCase()}>
                  <ShopCard
                    designation={seed.designation}
                    name={seed.name}
                    rarity={rarity}
                    sub={
                      record.section === 'almanac' ? (
                        <AlmanacDate startUtc={record.eventStartUtc!} endUtc={record.eventEndUtc!} countdown short />
                      ) : (
                        `${remaining.get(seed.designation) ?? seed.editionSize} of ${seed.editionSize} left`
                      )
                    }
                    price={sealed ? 'Sealed' : `$${DIRECT_CARD_PRICE_USD[rarity]}`}
                    tag={seed.designation === tonight ? 'Tonight' : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </StellarShell>
  );
}
