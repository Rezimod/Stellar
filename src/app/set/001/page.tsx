import type { Metadata } from 'next';
import CardPlate from '@/components/sidera/CardPlate';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import PageHead from '@/components/sidera/ui/PageHead';
import { getDb } from '@/lib/db';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { readSetSupply } from '@/lib/sidera/capsule';
import { holderView } from '@/lib/sidera/repo';
import type { Rarity } from '@/lib/rarity';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set 001',
  description: 'Twenty objects: the Moon, the planets, three stars and five deep-sky objects, each a numbered edition.',
};

const pad = (n: number) => String(n).padStart(3, '0');

type Supply = { allocated: number; editionSize: number };

/** The set in the order a night is observed: the Moon, the planets, the stars, then the deep sky. */
const GROUPS: Array<{ title: string; types: string[] }> = [
  { title: 'The Moon', types: ['lunar crater', 'lunar landing site'] },
  { title: 'Planets and their worlds', types: ['planet', 'atmospheric feature', 'moon of Jupiter', 'dwarf planet'] },
  { title: 'Stars', types: ['double star', 'star'] },
  { title: 'The deep sky', types: ['emission nebula', 'planetary nebula', 'globular cluster', 'spiral galaxy'] },
];

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

      {GROUPS.map((g, gi) => {
        const cards = SET_001_CARDS.filter((c) => g.types.includes(c.seed.objectType));
        return (
          <section key={g.title} className="sd-container sd-chapter-block">
            <Chapter n={String(gi + 1).padStart(2, '0')} title={g.title} aside={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`} />
            <ul className="sd-grid sd-grid--five">
              {cards.map((c) => {
                const s = supply?.get(c.seed.designation);
                const mine = held?.get(c.seed.designation);
                const outlined = held !== null && mine === undefined;
                return (
                  <li key={c.seed.designation}>
                    <CardPlate
                      designation={c.seed.designation}
                      name={c.seed.name}
                      rarity={c.seed.rarity as Rarity}
                      artUrl={outlined ? null : c.seed.artUrl}
                      href={`/card/${c.seed.designation}`}
                      data={[
                        mine !== undefined
                          ? { label: 'Edition', value: `No. ${pad(mine)}` }
                          : { label: 'Editions', value: s ? `${s.allocated} of ${s.editionSize}` : `${c.seed.editionSize} editions` },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {wallet && held === null && (
        <p className="sd-container sd-note">The Collection cannot be read at the moment, so every card is shown with its plate.</p>
      )}
    </SideraShell>
  );
}
