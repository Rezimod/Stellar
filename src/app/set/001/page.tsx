import type { Metadata } from 'next';
import AlmanacDate from '@/components/sidera/AlmanacDate';
import ShelfFilter from '@/components/sidera/ShelfFilter';
import ShopCard from '@/components/sidera/ShopCard';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import { getDb } from '@/lib/db';
import { SET_GROUPS, groupCards } from '@/lib/sets/groups';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { cardStatus } from '@/lib/sidera/almanac';
import { readSetSupply } from '@/lib/sidera/capsule';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import { holderView } from '@/lib/sidera/repo';
import type { Rarity } from '@/lib/rarity';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'First Light',
  description: 'Twenty-four cards: sixteen real objects, numbered outward from Earth, and eight dated events in the sky, each a numbered edition.',
};

const pad = (n: number) => String(n).padStart(3, '0');

type Supply = { allocated: number; editionSize: number };


export default async function Set001Page({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string | string[] }>;
}) {
  const { wallet: raw } = await searchParams;
  const wallet = typeof raw === 'string' ? raw.trim() : '';

  const db = getDb();
  let supply: Map<string, Supply> | null = null;
  let status: string = SET_001.status;
  let held: Map<string, number> | null = null;
  if (db) {
    try {
      const read = await readSetSupply(db, SET_001.code);
      if (read) {
        status = read.status;
        supply = new Map(read.cards.map((c) => [c.designation, { allocated: c.allocated, editionSize: c.editionSize }]));
      }
      if (wallet) {
        const mine = await holderView(db, wallet);
        held = new Map(mine.map((e) => [e.designation, e.editionNumber]));
      }
    } catch (err) {
      console.error('[sidera] cannot read set supply', err);
    }
  }

  const now = new Date();
  const totalEditions = SET_001_CARDS.reduce((sum, c) => sum + c.seed.editionSize, 0);
  const observable = SET_001_CARDS.filter((c) => c.seed.observationStatus !== 'not_available').length;

  return (
    <SideraShell title="First Light">
      <SideraView step="set" />
      <section className="sd-container sd-top">
        <DataRow
          className="sd-strip"
          items={[
            { label: 'Cards', value: SET_001_CARDS.length },
            { label: 'Editions', value: totalEditions.toLocaleString('en-GB') },
            { label: 'Node 01 can shoot', value: `${observable} of ${SET_001_CARDS.length}` },
            { label: 'Status', value: status === 'released' ? 'Released' : 'Pre-release' },
          ]}
        />
        <ShelfFilter />
      </section>

      {SET_GROUPS.map((g, gi) => {
        const cards = groupCards(SET_001_CARDS, g.key);
        return (
          <section key={g.key} className="sd-container sd-chapter-block" data-shelf-section>
            <Chapter n={String(gi + 1).padStart(2, '0')} title={g.short} aside={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`} />
            <ul className="sd-floor__grid">
              {cards.map((c) => {
                const s = supply?.get(c.seed.designation);
                const mine = held?.get(c.seed.designation);
                const rarity = c.seed.rarity as Rarity;
                const left = s ? s.editionSize - s.allocated : c.seed.editionSize;
                const sealed = cardStatus(c, now) === 'sealed';
                return (
                  <li key={c.seed.designation} data-shelf-item data-section={c.record.section} data-rarity={rarity} className="sd-shelf__item">
                    <ShopCard
                      designation={c.seed.designation}
                      name={c.seed.name}
                      rarity={rarity}
                      sub={
                        c.record.section === 'almanac' ? (
                          <AlmanacDate startUtc={c.record.eventStartUtc!} endUtc={c.record.eventEndUtc!} countdown short />
                        ) : (
                          `${left} of ${c.seed.editionSize} left`
                        )
                      }
                      price={sealed ? 'Sealed' : `$${DIRECT_CARD_PRICE_USD[rarity]}`}
                      tag={mine !== undefined ? `No. ${pad(mine)}` : held !== null ? 'Not held' : undefined}
                      dim={held !== null && mine === undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {wallet && held === null && (
        <p className="sd-container sd-note">The Collection cannot be read at the moment, so every card is shown as held by no one.</p>
      )}
    </SideraShell>
  );
}
