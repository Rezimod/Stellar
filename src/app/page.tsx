import type { Metadata } from 'next';
import Link from 'next/link';
import CardPlate from '@/components/sidera/CardPlate';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';
import Rule from '@/components/sidera/ui/Rule';
import Wordmark from '@/components/sidera/ui/Wordmark';
import { getNode } from '@/lib/observatory/nodes';
import type { Rarity } from '@/lib/rarity';
import { SET_001_CARDS } from '@/lib/sets/set-001';
import { CARDS_PER_CAPSULE } from '@/lib/sidera/economics';
import type { ObservationStatus } from '@/lib/sidera/observability';

export const metadata: Metadata = {
  title: 'Sidera',
  description: 'A collection of real objects, photographed by a real telescope. The universe, collected.',
};

const STEPS = [
  {
    n: '01',
    title: 'A capsule opens',
    body: `Three cards, each a numbered edition of a real object: a crater, a planet, a star, a nebula. What comes out is decided by a secret committed to before the sale and a number your own browser draws after it, and every opening can be checked afterwards by anyone.`,
  },
  {
    n: '02',
    title: 'The collection chooses the night',
    body: `Every clear night one object is photographed. Which one is decided by the holders, from the cards Node 01 can actually record — a question of aperture, sky and horizon, not of scarcity.`,
  },
  {
    n: '03',
    title: 'The photograph reaches every edition',
    body: `One capture serves the whole card. When the object on your card is photographed, that night’s image is attached to your edition and to every other edition of it, with the node, the time and the instrument beside it.`,
  },
];

export default function HomePage() {
  const node = getNode('tbilisi-01');
  const preview = SET_001_CARDS.filter((c) => c.seed.rarity === 'legendary' || c.seed.rarity === 'epic').slice(0, 4);

  return (
    <SideraShell>
      <section className="sd-container sd-hero">
        <Wordmark size="lg" asHeading />
        <p className="sd-display sd-hero__line">The universe, collected.</p>
        <p className="sd-lede">
          A set of twenty real objects, each held as a numbered edition. A telescope in Tbilisi photographs one of them
          a night, and the photograph goes to everyone who holds that card.
        </p>
        <p className="sd-pay__actions sd-section">
          <Link href="/set/001" className="sd-btn">
            See Set 001
          </Link>
          <Link href="/capsules" className="sd-btn">
            Capsules
          </Link>
        </p>
      </section>

      <section className="sd-container sd-section">
        <Rule />
        <ol className="sd-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <p className="sd-label">{s.n}</p>
              <h2 className="sd-plate__name">{s.title}</h2>
              <p className="sd-blurb">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {node && (
        <section className="sd-container sd-section">
          <Rule />
          <div className="sd-section">
            <h2 className="sd-section__title">Node 01</h2>
            <p className="sd-lede">
              {node.name}, on a roof in {node.site}, is commissioning. It has not begun its nightly observations, and
              nothing here claims otherwise. What it will and will not be able to record is already stated on every
              card, object by object.
            </p>
            <DataRow
              layout="stacked"
              items={[
                { label: 'Status', value: 'Commissioning' },
                { label: 'Site', value: node.site },
                { label: 'Optics', value: node.instrument.optics },
                { label: 'Aperture', value: `${node.instrument.apertureMm} mm` },
                { label: 'Camera', value: node.instrument.camera },
                { label: 'Sky', value: `Bortle ${node.bortle}` },
              ]}
            />
          </div>
        </section>
      )}

      <section className="sd-container sd-section">
        <Rule />
        <div className="sd-section">
          <h2 className="sd-section__title">From Set 001</h2>
          <ul className="sd-grid">
            {preview.map((c) => (
              <li key={c.seed.designation}>
                <CardPlate
                  designation={c.seed.designation}
                  name={c.seed.name}
                  rarity={c.seed.rarity as Rarity}
                  observationStatus={c.seed.observationStatus as ObservationStatus}
                  artUrl={c.seed.artUrl}
                  href={`/card/${c.seed.designation}`}
                  data={[{ label: 'Editions', value: c.seed.editionSize }]}
                />
              </li>
            ))}
          </ul>
          <p className="sd-note">
            Twenty cards in the set, {CARDS_PER_CAPSULE} to a capsule.{' '}
            <Link href="/capsules/log" className="sd-link">
              The public log
            </Link>{' '}
            records every one of them.
          </p>
        </div>
      </section>
    </SideraShell>
  );
}
