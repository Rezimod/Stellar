import type { Metadata } from 'next';
import CardPlate from '@/components/sidera/CardPlate';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';
import Rule from '@/components/sidera/ui/Rule';
import { getDb } from '@/lib/db';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { readSetSupply } from '@/lib/sidera/capsule';
import { holderView } from '@/lib/sidera/repo';
import type { Rarity } from '@/lib/rarity';
import type { ObservationStatus } from '@/lib/sidera/observability';

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
      <section className="sd-container sd-page">
        <div className="sd-page__head">
          <div>
            <p className="sd-eyebrow">The first set</p>
            <h1 className="sd-page__title">Set 001</h1>
          </div>
          <p className="sd-label">{SET_001.status === 'draft' ? 'In preparation' : 'On sale'}</p>
        </div>
        <p className="sd-lede">
          Twenty objects: the Moon&rsquo;s surface, the planets and one of their moons, three stars, five deep-sky
          objects. Every card is a numbered edition. Rarity was decided when the set was written — whether Node 01 can
          actually photograph the thing is a separate question of aperture and sky, and seven of the twenty it cannot.
        </p>
        <div className="sd-section" style={{ marginTop: 36 }}>
          <DataRow
            items={[
              { label: 'Cards', value: SET_001_CARDS.length },
              { label: 'Editions', value: totalEditions.toLocaleString('en-GB') },
              { label: 'Observable', value: `${observable} / ${SET_001_CARDS.length}` },
              { label: 'Node', value: '01 · commissioning' },
            ]}
          />
        </div>
        <div className="sd-section">
          <Rule />
        </div>

        <h2 className="sd-section__title" style={{ marginTop: 40 }}>
          The twenty
        </h2>
        <ul className="sd-grid">
          {SET_001_CARDS.map((c) => {
            const s = supply?.get(c.seed.designation);
            const mine = held?.get(c.seed.designation);
            const outlined = held !== null && mine === undefined;
            return (
              <li key={c.seed.designation}>
                <CardPlate
                  designation={c.seed.designation}
                  name={c.seed.name}
                  rarity={c.seed.rarity as Rarity}
                  observationStatus={c.seed.observationStatus as ObservationStatus}
                  artUrl={outlined ? null : c.seed.artUrl}
                  href={`/card/${c.seed.designation}`}
                  data={[
                    mine !== undefined
                      ? { label: 'Ed', value: `${pad(mine)} / ${c.seed.editionSize}` }
                      : { label: 'Editions', value: s ? `${s.allocated} / ${s.editionSize}` : `${c.seed.editionSize}` },
                  ]}
                />
              </li>
            );
          })}
        </ul>

        {wallet && held === null && (
          <p className="sd-note">The Collection cannot be read at the moment, so every card is shown with its plate.</p>
        )}
      </section>
    </SideraShell>
  );
}
