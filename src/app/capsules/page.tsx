import type { Metadata } from 'next';
import Link from 'next/link';
import SideraBuyCapsule from '@/components/sidera/SideraBuyCapsule';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import RarityMark from '@/components/sidera/ui/RarityMark';
import { getDb } from '@/lib/db';
import { RARITIES } from '@/lib/rarity';
import { CARDS_PER_CAPSULE, ORDER_WINDOW_MINUTES, RARITY_ODDS_BPS } from '@/lib/sidera/economics';
import { TIERS, tierByKey } from '@/lib/sidera/tiers';
import { capsulesOnSale } from '@/lib/sidera/capsule';
import { simulatedPayments } from '@/lib/sidera/orders';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Capsules — three cards, sealed before the sale',
  description:
    'A capsule holds three cards from First Light. The outcome is sealed before it goes on sale and can be checked by anyone after it opens.',
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
    <SideraShell title="Capsules">
      <SideraView step="capsules" />
      <section className="sd-container sd-top">
        <div className="sd-capsule-top">
          <div className="sd-sealed" aria-hidden="true">
            <span className="sd-sealed__card" />
            <span className="sd-sealed__card" />
            <span className="sd-sealed__card sd-sealed__card--front">
              <span className="sd-sealed__mark">Sidera</span>
              <span className="sd-sealed__label">Sealed · {CARDS_PER_CAPSULE} cards</span>
              {sealed && <span className="sd-sealed__hash">{sealed.commitment.slice(0, 24)}…</span>}
            </span>
          </div>
          <div>
            <DataRow
              className="sd-strip"
              items={[
                { label: 'Price', value: `$${TIERS[0].priceUsd}–${TIERS[TIERS.length - 1].priceUsd}` },
                { label: 'Cards', value: CARDS_PER_CAPSULE },
                { label: 'On sale', value: onSale?.length ?? '—' },
                { label: 'Quote holds', value: `${ORDER_WINDOW_MINUTES} min` },
              ]}
            />
            <p className="sd-capsule-top__line">
              Three cards, committed by hash before the sale. Your nonce seals the draw; anyone can recompute it after
              opening.
            </p>
            {simulatedPayments() ? (
              <p className="sd-strip-note">Rehearsal · no payment is taken · every sale is marked in the log</p>
            ) : (
              process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet' && <p className="sd-strip-note">Solana devnet · paid in test SOL</p>
            )}
          </div>
        </div>
      </section>

      <section className="sd-container sd-chapter-block">
        <Chapter n="01" title="Odds per card" aside="Provisional" />
        {[
          ...TIERS.map((t) => ({ key: t.key, label: `${t.name} · $${t.priceUsd}`, odds: t.oddsBps })),
          ...(onSale?.some((c) => !c.tier) ? [{ key: 'standard', label: 'Listed before the tiers', odds: RARITY_ODDS_BPS }] : []),
        ].map((row) => (
          <div key={row.key} className="sd-section">
            <p className="sd-label">{row.label}</p>
            <ul className="sd-oddsboard">
              {RARITIES.map((r) => (
                <li key={r} data-rarity={r}>
                  <RarityMark rarity={r} />
                  <span className="sd-oddsboard__n">{(row.odds[r] / 100).toFixed(r === 'legendary' ? 1 : 0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="sd-strip-note">Fixed when a capsule is listed, and logged with it</p>
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
                  <span className="sd-label">{tierByKey(c.tier)?.name ?? 'Capsule'}</span> {String(c.sequence).padStart(3, '0')}
                </span>
                <span className="sd-capsule__price">${c.priceUsd}</span>
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
                priceUsd={c.priceUsd}
                cardsPerCapsule={c.cardsPerCapsule}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="sd-container">
        <div className="sd-links">
          <Link href="/capsules/log" className="sd-btn">
            Public log
          </Link>
          <Link href="/set/001" className="sd-btn">
            Every card you can pull
          </Link>
        </div>
      </section>
    </SideraShell>
  );
}
