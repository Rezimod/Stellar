import type { Metadata } from 'next';
import Link from 'next/link';
import SideraBuyCapsule from '@/components/sidera/SideraBuyCapsule';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import PageHead from '@/components/sidera/ui/PageHead';
import RarityMark from '@/components/sidera/ui/RarityMark';
import { getDb } from '@/lib/db';
import { RARITIES } from '@/lib/rarity';
import { CAPSULE_PRICE_GEL, CARDS_PER_CAPSULE, ORDER_WINDOW_MINUTES, RARITY_ODDS_BPS } from '@/lib/sidera/economics';
import { capsulesOnSale } from '@/lib/sidera/capsule';
import { simulatedPayments } from '@/lib/sidera/orders';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Capsules — three cards, sealed before the sale',
  description:
    'A capsule holds three cards from Set 001. The outcome is sealed before it goes on sale and can be checked by anyone after it opens.',
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

  const sealed = onSale?.[0];

  return (
    <SideraShell>
      <SideraView step="capsules" />
      <PageHead
        index="03"
        section="Capsules"
        meta={`Set 001 · ${CAPSULE_PRICE_GEL} GEL a capsule`}
        eyebrow="Three cards inside"
        title="Sealed before it is sold."
        sub="The outcome is fixed before the sale, and anyone can check it after."
        object={
          <div className="sd-sealed" aria-hidden="true">
            <span className="sd-sealed__card" />
            <span className="sd-sealed__card" />
            <span className="sd-sealed__card sd-sealed__card--front">
              <span className="sd-sealed__mark">Sidera</span>
              <span className="sd-sealed__label">Sealed · {CARDS_PER_CAPSULE} cards</span>
              {sealed && <span className="sd-sealed__hash">{sealed.commitment.slice(0, 24)}…</span>}
            </span>
          </div>
        }
      >
        <DataRow
          className="sd-facts"
          items={[
            { label: 'Cards', value: CARDS_PER_CAPSULE },
            { label: 'On sale', value: onSale?.length ?? '—' },
            { label: 'Quote stands', value: `${ORDER_WINDOW_MINUTES} min` },
          ]}
        />
        {simulatedPayments() && (
          <p className="sd-note">Rehearsal: no payment is taken, and the log marks every sale made this way.</p>
        )}
      </PageHead>

      <section className="sd-container sd-chapter-block">
        <Chapter n="01" title="The odds, on every draw" aside="Provisional" />
        <ul className="sd-oddsboard">
          {RARITIES.map((r) => (
            <li key={r} data-rarity={r}>
              <RarityMark rarity={r} />
              <span className="sd-oddsboard__n">{(RARITY_ODDS_BPS[r] / 100).toFixed(r === 'legendary' ? 1 : 0)}%</span>
            </li>
          ))}
        </ul>
        <p className="sd-note">The odds are logged with every capsule opened under them.</p>
      </section>

      <section className="sd-container sd-chapter-block">
        <Chapter n="02" title="On sale" aside={onSale ? `${onSale.length} listed` : undefined} />
        {onSale === null && <p className="sd-note">The sale cannot be read at the moment.</p>}
        {onSale?.length === 0 && <p className="sd-note">Nothing is listed right now.</p>}
        <div className="sd-capsules">
          {onSale?.map((c) => (
            <article key={c.id} className="sd-capsule">
              <div className="sd-capsule__head">
                <span className="sd-capsule__n">
                  <span className="sd-label">Capsule</span> {String(c.sequence).padStart(3, '0')}
                </span>
                <span className="sd-capsule__price">{c.priceGel} GEL</span>
              </div>
              <DataRow
                layout="stacked"
                items={[
                  { label: 'Cards', value: c.cardsPerCapsule },
                  { label: 'Commitment', value: `${c.commitment.slice(0, 18)}…` },
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
      </section>

      <section className="sd-container sd-chapter-block sd-closer">
        <h2 className="sd-mega">Every capsule ever listed is in the log.</h2>
        <div className="sd-hero__cta">
          <Link href="/capsules/log" className="sd-btn">
            Read the log
          </Link>
          <Link href="/set/001" className="sd-btn">
            See what you can pull
          </Link>
        </div>
      </section>
    </SideraShell>
  );
}
