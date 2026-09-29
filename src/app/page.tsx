import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import CardThumb from '@/components/sidera/CardThumb';
import HomeFan from '@/components/sidera/HomeFan';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { card } from '@/lib/schema';
import { SET_GROUPS, groupCards } from '@/lib/sets/groups';
import { SET_001_CARDS, SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { CARDS_PER_TIER, TIERS } from '@/lib/sidera/tiers';
import { nightRow } from '@/lib/sidera/night';
import { siteNightDate } from '@/lib/sidera/target';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Sidera — the night sky, issued in editions',
  description:
    'First Light: a hundred cards, each held as a numbered edition — planets, stars, nebulae, galaxies, the extremes of the universe, ten worlds of fiction and eight dated events. Opened from sealed capsules, from $5.',
};

/** Six cards from across the set, one shelf of it. */
const SHOWCASE = ['JUPITER', 'BETELGEUSE', 'M42', 'M31', 'SGR-A', 'VOYAGER-1'];

const FROM_USD = Math.min(...TIERS.map((t) => t.priceUsd));

export default async function HomePage() {
  const node = getNode('tbilisi-01')!;
  const db = getDb();

  let tonight: string | null = null;
  if (db) {
    try {
      const night = await nightRow(db, siteNightDate(node.timezone, new Date()));
      if (night) {
        const [row] = await db.select({ designation: card.designation }).from(card).where(eq(card.id, night.cardId));
        tonight = row?.designation ?? null;
      }
    } catch (err) {
      console.error('[sidera] cannot read tonight', err);
    }
  }
  const tonightCard = tonight ? SET_001_CARD_BY_DESIGNATION.get(tonight) : undefined;
  const editions = SET_001_CARDS.reduce((sum, c) => sum + c.seed.editionSize, 0);

  return (
    <SideraShell>
      <SideraView step="landing" />

      <section className="sd-hero2">
        <div className="sd-container sd-hero2__grid">
          <div className="sd-hero2__copy">
            <h1 className="sd-hero2__title">
              <span>Open the capsule.</span>
              <span>Hold a piece of</span>
              <span>
                <em>the night sky</em>.
              </span>
            </h1>
            <p className="sd-hero2__sub">
              Real planets, stars, nebulae and galaxies, issued as numbered editions and sealed {CARDS_PER_TIER} to a capsule.
              Keep what you draw in your Collection — and once Node 01 in Tbilisi is commissioned, each clear night the holders
              of one card receive its photograph.
            </p>
            <div className="sd-hero2__cta">
              <Link href="/set/001" className="sd-btn sd-btn--light">
                Open a capsule — from ${FROM_USD}
              </Link>
            </div>
            <dl className="sd-hero2__stats">
              <div>
                <dt>Cards in the set</dt>
                <dd>{SET_001_CARDS.length}</dd>
              </div>
              <div>
                <dt>Numbered editions</dt>
                <dd>{editions.toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt>Cards per capsule</dt>
                <dd>{CARDS_PER_TIER}</dd>
              </div>
            </dl>
          </div>
          <HomeFan />
        </div>
      </section>

      <section className="sd-container sd-home-sec" id="how" aria-labelledby="how-title">
        <p className="sd-kicker">How it works</p>
        <h2 className="sd-home-sec__title" id="how-title">
          From ${FROM_USD} to the night sky
        </h2>
        <ol className="sd-howto">
          <li>
            <span className="sd-howto__n">01</span>
            <h3>Open a capsule</h3>
            <p>
              Four capsules, ${FROM_USD} to ${TIERS[TIERS.length - 1].priceUsd}. Each holds {CARDS_PER_TIER} cards, sealed before it goes on
              sale; the rarer the capsule, the better its odds.
            </p>
          </li>
          <li>
            <span className="sd-howto__n">02</span>
            <h3>Hold the edition</h3>
            <p>Every card is numbered. The edition you draw is yours alone, kept in your Collection and checkable against the public log.</p>
          </li>
          <li>
            <span className="sd-howto__n">03</span>
            <h3>Receive the sky</h3>
            <p>
              Holders choose what Node 01 photographs. On a clear night, everyone holding that card receives the image. Node 01 is
              commissioning.
            </p>
          </li>
        </ol>
      </section>

      <section className="sd-container sd-home-sec sd-showcase2" aria-labelledby="set-title">
        <div className="sd-showcase2__copy">
          <p className="sd-kicker">Set 001</p>
          <h2 className="sd-home-sec__title" id="set-title">
            First Light
          </h2>
          <p className="sd-home-sec__lede">A hundred cards, numbered outward from Earth — from the Moon&rsquo;s surface to the edge of the observable universe.</p>
          <ul className="sd-families">
            {SET_GROUPS.map((g) => (
              <li key={g.key}>
                <span>{g.title}</span>
                <span className="sd-families__n">{groupCards(SET_001_CARDS, g.key).length}</span>
              </li>
            ))}
          </ul>
          <Link href="/set/001" className="sd-btn">
            See all {SET_001_CARDS.length} cards
          </Link>
        </div>
        <ul className="sd-showcase2__cards">
          {SHOWCASE.map((d) => (
            <li key={d}>
              <Link href={`/card/${d}`} aria-label={SET_001_CARD_BY_DESIGNATION.get(d)?.seed.name ?? d}>
                <CardThumb designation={d} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sd-container sd-home-sec" aria-labelledby="night-title">
        <p className="sd-kicker">Every night</p>
        <h2 className="sd-home-sec__title" id="night-title">
          Your cards open the sky
        </h2>
        <ul className="sd-ways">
          <li>
            <Link href="/tonight" className="sd-way">
              <span className="sd-way__label">Tonight</span>
              <span className="sd-way__title">{tonightCard ? tonightCard.seed.name : 'One object a night'}</span>
              <span className="sd-way__text">
                {tonightCard
                  ? 'Tonight’s card at Node 01. Holders vote on the next night’s object.'
                  : 'Holders vote on the object Node 01 photographs each night.'}
              </span>
              <span className="sd-way__go" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
          <li>
            <Link href="/node" className="sd-way">
              <span className="sd-way__label">Observatory</span>
              <span className="sd-way__title">Drive the telescope</span>
              <span className="sd-way__text">Connect, calibrate, point and capture — five steps under a dark sky, drawn by the sky model.</span>
              <span className="sd-way__go" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
          <li>
            <Link href="/voyage" className="sd-way">
              <span className="sd-way__label">Voyage</span>
              <span className="sd-way__title">Fly to your objects</span>
              <span className="sd-way__text">Cross the Solar System to the worlds on the cards you hold.</span>
              <span className="sd-way__go" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="sd-container sd-home-sec sd-closer2" aria-labelledby="close-title">
        <h2 className="sd-closer2__title" id="close-title">
          The night sky, <em>issued in editions</em>.
        </h2>
        <p className="sd-home-sec__lede">Every capsule is sealed before the sale, and every opening is published after it.</p>
        <div className="sd-hero2__cta">
          <Link href="/set/001" className="sd-btn sd-btn--light">
            Open a capsule
          </Link>
          <Link href="/capsules/log" className="sd-btn">
            Read the public log
          </Link>
        </div>
      </section>
    </SideraShell>
  );
}
