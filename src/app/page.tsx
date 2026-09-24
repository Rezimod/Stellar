import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import ShopFloor, { type FloorCard, type FloorGroup } from '@/components/sidera/ShopFloor';
import SideraBuyCapsule from '@/components/sidera/SideraBuyCapsule';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { RARITIES, rarityInfo, type Rarity } from '@/lib/rarity';
import { card } from '@/lib/schema';
import { SET_GROUPS, groupOf } from '@/lib/sets/groups';
import { SET_001, SET_001_CARDS } from '@/lib/sets/set-001';
import { capsulesOnSale, readSetSupply } from '@/lib/sidera/capsule';
import { CAPSULE_PRICE_USD, CARDS_PER_CAPSULE, DIRECT_CARD_PRICE_USD, RARITY_ODDS_BPS } from '@/lib/sidera/economics';
import { nightRow } from '@/lib/sidera/night';
import { simulatedPayments } from '@/lib/sidera/orders';
import { siteNightDate } from '@/lib/sidera/target';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sidera — the night sky, issued in editions',
  description:
    'Twenty-four cards, each held as a numbered edition. A telescope in Tbilisi photographs one real object a night, and everyone holding that card gets the photograph.',
};

export default async function HomePage() {
  const node = getNode('tbilisi-01')!;
  const db = getDb();

  let onSale: Awaited<ReturnType<typeof capsulesOnSale>> = [];
  let remaining = new Map<string, number>();
  const leftByRarity = new Map<string, number>();
  let tonight: string | null = null;
  if (db) {
    try {
      const [sale, supply, night] = await Promise.all([
        capsulesOnSale(db),
        readSetSupply(db, SET_001.code),
        nightRow(db, siteNightDate(node.timezone, new Date())),
      ]);
      onSale = sale;
      if (supply) {
        remaining = new Map(supply.cards.map((c) => [c.designation, c.remaining]));
        for (const c of supply.cards) leftByRarity.set(c.rarity, (leftByRarity.get(c.rarity) ?? 0) + c.remaining);
      }
      if (night) {
        const [row] = await db.select({ designation: card.designation }).from(card).where(eq(card.id, night.cardId));
        tonight = row?.designation ?? null;
      }
    } catch (err) {
      console.error('[sidera] cannot read the floor', err);
    }
  }

  // Scarcest first, the way a shelf puts its best stock at eye level.
  const cards: FloorCard[] = SET_001_CARDS.map(({ seed }) => {
    const rarity = seed.rarity as Rarity;
    const left = remaining.get(seed.designation) ?? seed.editionSize;
    return {
      designation: seed.designation,
      name: seed.name,
      rarity,
      objectType: seed.objectType,
      group: groupOf(seed.objectType),
      sub: `${left} of ${seed.editionSize} left`,
      price: `$${DIRECT_CARD_PRICE_USD[rarity]}`,
      tag: seed.designation === tonight ? 'Tonight' : undefined,
    };
  }).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));

  const count = (key: string) => `${cards.filter((c) => c.group === key).length}`;
  const groups: FloorGroup[] = [
    { key: 'all', label: 'All', cover: 'M87', count: String(cards.length) },
    ...SET_GROUPS.map((g) => ({ key: g.key, label: g.short, cover: g.cover, count: count(g.key) })),
  ];

  const next = onSale[0];

  return (
    <SideraShell title="Sidera">
      <SideraView step="landing" />
      <div className="sd-shop">
        <aside className="sd-shop__panel" aria-label="Open a capsule">
          <div className="sd-shop__machine" aria-hidden="true">
            <span className="sd-shop__rays" />
            <div className="sd-sealed">
              <span className="sd-sealed__card" />
              <span className="sd-sealed__card" />
              <span className="sd-sealed__card sd-sealed__card--front">
                <span className="sd-sealed__mark">Sidera</span>
                <span className="sd-sealed__label">Sealed · {CARDS_PER_CAPSULE} cards</span>
                {next && <span className="sd-sealed__hash">{next.commitment.slice(0, 24)}…</span>}
              </span>
            </div>
          </div>

          <div className="sd-shop__opening">
            <span className="sd-label">Next capsule</span>
            <span className="sd-shop__price">
              ${CAPSULE_PRICE_USD} <small>{CARDS_PER_CAPSULE} cards</small>
            </span>
          </div>
          <h2 className="sd-shop__title">
            Set 001 capsule{next ? ` · No. ${String(next.sequence).padStart(3, '0')}` : ''}
          </h2>

          <div className="sd-shop__buy">
            {next ? (
              <SideraBuyCapsule
                capsuleId={next.id}
                sequence={next.sequence}
                commitment={next.commitment}
                priceUsd={next.priceUsd}
                cardsPerCapsule={next.cardsPerCapsule}
              />
            ) : (
              <button type="button" className="sd-btn sd-shop__soldout" disabled>
                Sold out
              </button>
            )}
            {simulatedPayments() ? (
              <p className="sd-shop__rehearsal">Rehearsal · no payment is taken</p>
            ) : (
              process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' && <p className="sd-shop__rehearsal">Solana devnet · paid in test SOL</p>
            )}
          </div>

          <h3 className="sd-shop__h">Odds per card</h3>
          <ul className="sd-shop__odds">
            {[...RARITIES].reverse().map((r) => {
              const pct = RARITY_ODDS_BPS[r] / 100;
              return (
                <li key={r} data-rarity={r}>
                  <span className="sd-shop__odds-row">
                    <span className="sd-shop__dot" />
                    <span className="sd-shop__rarity">{rarityInfo(r).label}</span>
                    <span className="sd-shop__worth">
                      ${DIRECT_CARD_PRICE_USD[r]} a card
                      {leftByRarity.has(r) && ` · ${leftByRarity.get(r)!.toLocaleString('en-US')} left`}
                    </span>
                    <span className="sd-shop__pct">{pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>
                  </span>
                  <span className="sd-shop__bar">
                    <span style={{ width: `${Math.max(pct, 1.5)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="sd-shop__foot">
            <span className="sd-label">
              {onSale.length} {onSale.length === 1 ? 'capsule' : 'capsules'} on sale
            </span>
            <Link href="/capsules/log" className="sd-shop__chip">
              Provably fair · log
            </Link>
          </div>
        </aside>

        <ShopFloor cards={cards} groups={groups} />
      </div>
    </SideraShell>
  );
}
