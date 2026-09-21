import type { Metadata } from 'next';
import Link from 'next/link';
import SideraBuyCapsule from '@/components/sidera/SideraBuyCapsule';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';
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

  return (
    <SideraShell>
      <section className="sd-hero" style={{ paddingBottom: 24 }}>
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-container">
          <p className="sd-eyebrow">Set 001 · {CAPSULE_PRICE_GEL} GEL a capsule</p>
          <h1 className="sd-display" style={{ maxWidth: '14ch' }}>
            Sealed before it is sold.
          </h1>
          <p className="sd-hero__sub">
            Three cards. The outcome is fixed before the sale, and anyone can check it after.
          </p>
          {simulatedPayments() && (
            <p className="sd-note" style={{ marginTop: 20, maxWidth: '56ch' }}>
              Rehearsal: no payment is taken, and the log marks every sale made this way.
            </p>
          )}
          <div className="sd-stats" style={{ marginTop: 32 }}>
            <div>
              <div className="sd-stat__n">{CARDS_PER_CAPSULE}</div>
              <div className="sd-stat__l">Cards inside</div>
            </div>
            <div>
              <div className="sd-stat__n">{onSale?.length ?? '—'}</div>
              <div className="sd-stat__l">On sale now</div>
            </div>
            <div>
              <div className="sd-stat__n">{ORDER_WINDOW_MINUTES}</div>
              <div className="sd-stat__l">Minutes a quote stands</div>
            </div>
          </div>
        </div>
      </section>

      <section className="sd-container sd-section">
        <h2 className="sd-section__title">Odds on every single draw</h2>
        <ul className="sd-odds">
          {RARITIES.map((r) => (
            <li key={r}>
              <span className="sd-rarity-odds">
                <RarityMark rarity={r} />
                <span className="sd-data">{(RARITY_ODDS_BPS[r] / 100).toFixed(2)}%</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="sd-note">Provisional. The odds are logged with every capsule opened under them.</p>
      </section>

      <section className="sd-container sd-section">
        <h2 className="sd-section__title">On sale</h2>
        {onSale === null && <p className="sd-note">The sale cannot be read at the moment.</p>}
        {onSale?.length === 0 && (
          <p className="sd-note">Nothing is listed right now.</p>
        )}
        <div className="sd-capsules">
          {onSale?.map((c) => (
            <article key={c.id} className="sd-capsule">
              <div className="sd-capsule__head">
                <span className="sd-capsule__n">Capsule {String(c.sequence).padStart(3, '0')}</span>
                <span className="sd-label">{c.priceGel} GEL</span>
              </div>
              <DataRow
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

      <section className="sd-band">
        <div className="sd-container">
          <p className="sd-eyebrow">Nothing is taken on trust</p>
          <h2 className="sd-page__title" style={{ maxWidth: '20ch' }}>
            Every capsule ever listed is in the log
          </h2>
          <div className="sd-hero__cta">
            <Link href="/capsules/log" className="sd-btn">
              Read the log
            </Link>
            <Link href="/set/001" className="sd-btn">
              See what you can pull
            </Link>
          </div>
        </div>
      </section>
    </SideraShell>
  );
}
