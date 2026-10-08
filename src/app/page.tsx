import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import CardThumb from '@/components/stellar/CardThumb';
import FlightPlan, { type FlightStep } from '@/components/stellar/FlightPlan';
import HomePrint from '@/components/stellar/HomePrint';
import OddsBoard from '@/components/stellar/OddsBoard';
import OrbitRing from '@/components/stellar/OrbitRing';
import Sunburst from '@/components/stellar/Sunburst';
import StellarShell from '@/components/stellar/StellarShell';
import StellarView from '@/components/stellar/StellarView';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { RARITIES } from '@/lib/rarity';
import { card } from '@/lib/schema';
import { SET_GROUPS } from '@/lib/sets/groups';
import { SET_001_CARDS, SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { CARDS_PER_TIER, TIERS } from '@/lib/stellar/tiers';
import { nightRow } from '@/lib/stellar/night';
import { siteNightDate } from '@/lib/stellar/target';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Stellar — the cosmos, issued in editions',
  description:
    'Genesis: real objects of the cosmos, each held as a numbered edition. Opened from sealed capsules, from $5.',
};

/** Six cards from across the set, one shelf of it. */
const SHOWCASE = ['JUPITER', 'BETELGEUSE', 'M42', 'M31', 'SGR-A', 'VOYAGER-1'];

/** The cards turning round the sun in the orbit section. */
const ORBIT = ['FIRST-LIGHT', 'SATURN', 'M42', 'M1', 'SGR-A', 'HALLEY', 'M45', 'TYCHO', 'EUROPA', 'APOLLO-11', 'GREAT-ECLIPSE', 'IMILAC'];

const SUPPLY = Object.fromEntries(
  RARITIES.map((r) => {
    const cards = SET_001_CARDS.filter((c) => c.seed.rarity === r);
    return [r, { cards: cards.length, editions: cards.reduce((sum, c) => sum + c.seed.editionSize, 0) }];
  }),
) as Record<(typeof RARITIES)[number], { cards: number; editions: number }>;

const FROM_USD = Math.min(...TIERS.map((t) => t.priceUsd));

const PLAN: FlightStep[] = [
  { title: 'Open', text: `${CARDS_PER_TIER === 1 ? 'One sealed card' : `${CARDS_PER_TIER} sealed cards`} to a capsule, from $${FROM_USD}.`, live: true, href: '/genesis', icon: 'capsule' },
  { title: 'Vote', text: 'Holders vote on the night’s target for the Live Telescope.', live: true, href: '/tonight', icon: 'reticle' },
  { title: 'Watch', text: 'Live Telescope — coming soon. From first light in November, holders of the chosen card watch it live.', live: false, href: '/node', icon: 'telescope' },
  {
    title: 'Claim',
    text: 'Legendary cards carry a real meteorite, redeemable.',
    live: false,
    href: '/genesis',
    icon: 'meteorite',
  },
];

const GUARANTEES = [
  {
    title: 'Sealed before sale',
    text: 'Each draw is fixed and its hash published before listing.',
    icon: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  },
  {
    title: 'Numbered editions',
    text: 'Each card a fixed run, never reissued.',
    icon: <><path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" /></>,
  },
  {
    title: 'A public log',
    text: 'Every listing and opening, on record for anyone.',
    icon: <><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 15h6" /></>,
  },
];

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
      console.error('[stellar] cannot read tonight', err);
    }
  }
  const tonightCard = tonight ? SET_001_CARD_BY_DESIGNATION.get(tonight) : undefined;

  return (
    <StellarShell>
      <StellarView step="landing" />

      <section className="sd-hero2">
        <span className="sd-hero2__horizon" aria-hidden="true" />
        <div className="sd-container sd-hero2__grid">
          <HomePrint />
          <div className="sd-hero2__copy">
            <h1 className="sd-hero2__title">
              <span>Hold a piece of</span>{' '}
              <span>
                <em>the cosmos</em>
              </span>
            </h1>
            <p className="sd-hero2__sub">
              Real objects, numbered editions. A card is a seat at the telescope — and, for some, an object you can hold.
            </p>
            <div className="sd-hero2__cta">
              <Link href="/genesis" className="sd-btn sd-btn--light">
                Detonate a star — from ${FROM_USD}
              </Link>
            </div>
            <dl className="sd-hero2__stats">
              <div>
                <dt>From</dt>
                <dd>${FROM_USD}</dd>
              </div>
              <div>
                <dt>Card per capsule</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>Odds</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="sd-container sd-home-sec" id="how" aria-labelledby="how-title">
        <h2 className="sd-home-sec__title" id="how-title">
          What a card opens
        </h2>
        <FlightPlan steps={tonightCard ? PLAN.map((p) => (p.icon === 'reticle' ? { ...p, text: `${p.text} Tonight: ${tonightCard.seed.name}.` } : p)) : PLAN} />
      </section>

      <section className="sd-container sd-home-sec sd-pub" aria-labelledby="odds-title">
        <h2 className="sd-home-sec__title" id="odds-title">
          The odds are published
        </h2>
        <div className="sd-pub__grid">
          <ul className="sd-pub__list">
            {GUARANTEES.map((g) => (
              <li key={g.title}>
                <span className="sd-pub__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {g.icon}
                  </svg>
                </span>
                <div>
                  <p className="sd-pub__t">{g.title}</p>
                  <p className="sd-pub__d">{g.text}</p>
                </div>
              </li>
            ))}
            <li className="sd-pub__logline">
              <Link href="/capsules/log" className="sd-link">
                Read the public log
              </Link>
            </li>
          </ul>
          <OddsBoard supply={SUPPLY} />
        </div>
      </section>

      <section className="sd-container sd-home-sec sd-showcase2" aria-labelledby="set-title">
        <div className="sd-showcase2__copy">
          <h2 className="sd-home-sec__title" id="set-title">
            Genesis
          </h2>
          <p className="sd-home-sec__lede">Real objects, numbered outward from Earth.</p>
          <ul className="sd-families">
            {SET_GROUPS.map((g) => (
              <li key={g.key}>
                <span>{g.title}</span>
              </li>
            ))}
          </ul>
          <Link href="/genesis" className="sd-btn">
            See the set
          </Link>
        </div>
        <ul className="sd-showcase2__cards">
          {SHOWCASE.map((d) => (
            <li key={d}>
              <Link href={`/card/${d}`} aria-label={SET_001_CARD_BY_DESIGNATION.get(d)?.seed.name ?? d} data-zoom={d}>
                <CardThumb designation={d} eager />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sd-home-sec sd-orbit" aria-labelledby="orbit-title">
        <div className="sd-container sd-orbit__copy">
          <h2 className="sd-home-sec__title" id="orbit-title">
            Every card turns with the sky
          </h2>
          <p className="sd-home-sec__lede">
            From the craters of the Moon to the black hole at the centre of the galaxy — each one real, issued once and numbered.
          </p>
        </div>
        <OrbitRing designations={ORBIT} />
      </section>

      <section className="sd-container sd-home-sec sd-closer2" aria-labelledby="close-title">
        <Sunburst className="sd-closer2__burst" />
        <h2 className="sd-closer2__title" id="close-title">
          The cosmos, <em>issued in editions</em>.
        </h2>
        <p className="sd-home-sec__lede">Sealed before sale. Published after opening.</p>
        <div className="sd-hero2__cta">
          <Link href="/genesis" className="sd-btn sd-btn--light">
            Detonate a star
          </Link>
          <Link href="/capsules/log" className="sd-btn">
            Public log
          </Link>
        </div>
      </section>
    </StellarShell>
  );
}
