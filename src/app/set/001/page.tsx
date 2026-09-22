import type { Metadata } from 'next';
import ShopCard from '@/components/sidera/ShopCard';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import PageHead from '@/components/sidera/ui/PageHead';
import { getDb } from '@/lib/db';
import { SET_GROUPS } from '@/lib/sets/groups';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { readSetSupply } from '@/lib/sidera/capsule';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import { holderView } from '@/lib/sidera/repo';
import type { Rarity } from '@/lib/rarity';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set 001',
  description: 'Twenty objects: the Moon, the planets, three stars and five deep-sky objects, each a numbered edition.',
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
  let held: Map<string, number> | null = null;
  if (db) {
    try {
      const read = await readSetSupply(db, SET_001.code);
      if (read) supply = new Map(read.cards.map((c) => [c.designation, { allocated: c.allocated, editionSize: c.editionSize }]));
      if (wallet) {
        const mine = await holderView(db, wallet);
        held = new Map(mine.map((e) => [e.designation, e.editionNumber]));
      }
    } catch (err) {
      console.error('[sidera] cannot read set supply', err);
    }
  }

  const totalEditions = SET_001_CARDS.reduce((sum, c) => sum + c.seed.editionSize, 0);
  const observable = SET_001_CARDS.filter((c) => c.seed.observationStatus !== 'not_available').length;

  return (
    <SideraShell>
      <SideraView step="set" />
      <PageHead
        index="02"
        section="Set 001"
        meta={SET_001.status === 'draft' ? 'In preparation' : 'On sale'}
        eyebrow="The first set"
        title="Twenty objects."
        sub="The Moon, the planets, three stars and the deep sky. Each one a numbered edition."
      >
        <DataRow
          className="sd-facts"
          items={[
            { label: 'Cards', value: SET_001_CARDS.length },
            { label: 'Editions', value: totalEditions.toLocaleString('en-GB') },
            { label: 'Observable', value: `${observable} / ${SET_001_CARDS.length}` },
          ]}
        />
      </PageHead>

      {SET_GROUPS.map((g, gi) => {
        const cards = SET_001_CARDS.filter((c) => g.types.includes(c.seed.objectType));
        return (
          <section key={g.title} className="sd-container sd-chapter-block">
            <Chapter n={String(gi + 1).padStart(2, '0')} title={g.title} aside={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`} />
            <ul className="sd-floor__grid">
              {cards.map((c) => {
                const s = supply?.get(c.seed.designation);
                const mine = held?.get(c.seed.designation);
                const rarity = c.seed.rarity as Rarity;
                const left = s ? s.editionSize - s.allocated : c.seed.editionSize;
                return (
                  <li key={c.seed.designation}>
                    <ShopCard
                      designation={c.seed.designation}
                      name={c.seed.name}
                      rarity={rarity}
                      sub={`${c.seed.objectType.charAt(0).toUpperCase()}${c.seed.objectType.slice(1)} · ${left} of ${c.seed.editionSize} left`}
                      price={`$${DIRECT_CARD_PRICE_USD[rarity]}`}
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
