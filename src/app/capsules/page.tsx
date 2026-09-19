import type { Metadata } from 'next';
import Link from 'next/link';
import SideraBuyCapsule from '@/components/sidera/SideraBuyCapsule';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';
import RarityMark from '@/components/sidera/ui/RarityMark';
import Rule from '@/components/sidera/ui/Rule';
import { getDb } from '@/lib/db';
import { RARITIES } from '@/lib/rarity';
import { CAPSULE_PRICE_GEL, CARDS_PER_CAPSULE, ORDER_WINDOW_MINUTES, RARITY_ODDS_BPS } from '@/lib/sidera/economics';
import { capsulesOnSale } from '@/lib/sidera/capsule';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Capsules',
  description: 'A capsule holds three cards from Set 001. The outcome is fixed before the sale and checkable after it.',
};

export default async function CapsulesPage() {
  const db = getDb();
  let onSale: Awaited<ReturnType<typeof capsulesOnSale>> | null = null;
  if (db) {
    try {
      onSale = await capsulesOnSale(db);
    } catch (err) {
      console.error('[sidera] cannot read capsules on sale', err);
    }
  }

  return (
    <SideraShell>
      <section className="sd-container sd-page">
        <div className="sd-page__head">
          <h1 className="sd-page__title">Capsules</h1>
          <p className="sd-label">{CAPSULE_PRICE_GEL} GEL</p>
        </div>
        <p className="sd-lede">
          A capsule holds {CARDS_PER_CAPSULE} cards from Set 001. Each one is sealed before it is put on sale: the
          outcome is decided by a secret committed to at that moment, and by a number your own browser draws when you
          buy. Neither side can choose what comes out, and every capsule opened can be checked afterwards, by anyone.
        </p>

        <div className="sd-section">
          <h2 className="sd-section__title">Odds, per draw</h2>
          <ul className="sd-odds">
            {RARITIES.map((r) => (
              <li key={r}>
                <RarityMark rarity={r} />
                <span className="sd-data">{(RARITY_ODDS_BPS[r] / 100).toFixed(2)}%</span>
              </li>
            ))}
          </ul>
          <p className="sd-note">
            Provisional, and recorded in the log with every capsule opened under them, so changing them later cannot
            rewrite a capsule already opened. An order stands for {ORDER_WINDOW_MINUTES} minutes; a capsule left unpaid
            is released back to the sale, and that is logged too.
          </p>
        </div>

        <Rule />

        <div className="sd-section">
          <h2 className="sd-section__title">On sale</h2>
          {onSale === null && <p className="sd-note">The sale cannot be read at the moment.</p>}
          {onSale?.length === 0 && <p className="sd-note">No capsule is on sale right now.</p>}
          {onSale?.map((c) => (
            <article key={c.id} className="sd-capsule">
              <DataRow
                items={[
                  { label: 'Capsule', value: String(c.sequence) },
                  { label: 'Cards', value: c.cardsPerCapsule },
                  { label: 'Price', value: `${c.priceGel} GEL` },
                  { label: 'Commitment', value: `${c.commitment.slice(0, 16)}…` },
                ]}
              />
              <SideraBuyCapsule
                capsuleId={c.id}
                sequence={c.sequence}
                commitment={c.commitment}
                priceGel={c.priceGel}
                cardsPerCapsule={c.cardsPerCapsule}
              />
            </article>
          ))}
        </div>

        <Rule />
        <p className="sd-section sd-data">
          <Link href="/capsules/log" className="sd-link">
            The public log
          </Link>{' '}
          records every capsule listed, bought, opened, released and withdrawn, in order.
        </p>
      </section>
    </SideraShell>
  );
}
