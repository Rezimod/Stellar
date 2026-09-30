import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlmanacDate from '@/components/stellar/AlmanacDate';
import CardPlate from '@/components/stellar/CardPlate';
import StellarBuyCard from '@/components/stellar/StellarBuyCard';
import StellarShell from '@/components/stellar/StellarShell';
import StellarView from '@/components/stellar/StellarView';
import DataRow, { type Datum } from '@/components/stellar/ui/DataRow';
import ObservationStatusMark from '@/components/stellar/ui/ObservationStatusMark';
import Chapter from '@/components/stellar/ui/Chapter';
import { getDb } from '@/lib/db';
import { formatDec, formatRa } from '@/lib/observatory/telescope-targets';
import { rarityInfo, type Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { cardStatus } from '@/lib/stellar/almanac';
import { DIRECT_CARD_PRICE_USD } from '@/lib/stellar/economics';
import type { ObservationStatus } from '@/lib/stellar/observability';
import { cardAvailability } from '@/lib/stellar/orders';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ designation: string }>;
}): Promise<Metadata> {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  if (!card) return { title: 'Card not found' };
  return { title: `${card.seed.name} — First Light · Stellar`, description: card.seed.blurb };
}

/** A selenographic degree, with a real minus sign rather than a hyphen. */
const degrees = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}°`;

export default async function CardPage({ params }: { params: Promise<{ designation: string }> }) {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  if (!card) notFound();

  const { seed, record } = card;
  const rarity = seed.rarity as Rarity;
  const priceUsd = DIRECT_CARD_PRICE_USD[rarity];
  const almanac = record.section === 'almanac';
  const sealed = cardStatus(card) === 'sealed';
  const pair = record.pairsWith ? SET_001_CARD_BY_DESIGNATION.get(record.pairsWith) : null;

  const db = getDb();
  let allocated: number | null = null;
  let available = false;
  let released = false;
  if (db) {
    try {
      const a = await cardAvailability(db, seed.designation);
      if (a) {
        allocated = a.allocated;
        available = a.available;
        released = a.released;
      }
    } catch (err) {
      console.error('[stellar] cannot read card availability', err);
    }
  }

  const position: Datum[] = almanac
    ? []
    : seed.raHours !== null && seed.raHours !== undefined && seed.decDeg !== null && seed.decDeg !== undefined
      ? [
          { label: 'RA', value: formatRa(seed.raHours) },
          { label: 'Dec', value: formatDec(seed.decDeg) },
        ]
      : seed.surfaceLat !== null && seed.surfaceLat !== undefined && seed.surfaceLon !== null && seed.surfaceLon !== undefined
        ? [
            { label: 'Lat', value: degrees(seed.surfaceLat) },
            { label: 'Lon', value: degrees(seed.surfaceLon) },
          ]
        : seed.targetId === 'kept'
          ? [{ label: 'Position', value: 'Held, not observed' }]
          : [{ label: 'Position', value: 'Moves — computed for the night' }];

  return (
    <StellarShell title={seed.name}>
      <StellarView step="card" />
      <section className="sd-container sd-top">
        <nav aria-label="Breadcrumb" className="sd-crumb sd-data">
          <Link href="/set/001">First Light</Link>
          <span aria-hidden="true">/</span>
          <strong>{seed.designation}</strong>
        </nav>
        <div className="sd-cardhero">
          <figure className="sd-cardhero__plate sd-figure">
            <CardPlate size="lg" hero designation={seed.designation} />
          </figure>

          <div>
            <p className="sd-eyebrow">
              {[seed.designation, ...seed.objectType.split(' · ').filter((t) => t.toUpperCase() !== seed.designation), rarityInfo(rarity).label].join(' · ')}
            </p>
            <p className="sd-cardhero__line">{record.line}</p>
            <DataRow
              className="sd-facts"
              items={[
                ...(almanac ? [{ label: 'Date', value: <AlmanacDate startUtc={record.eventStartUtc!} endUtc={record.eventEndUtc!} countdown /> }] : []),
                sealed
                  ? { label: 'Supply', value: 'Sealed' }
                  : { label: 'Supply', value: `${seed.editionSize - (allocated ?? 0)} of ${seed.editionSize} left` },
                { label: 'Price', value: sealed ? 'Sealed' : `$${priceUsd}` },
              ]}
            />
            {sealed ? (
              <p className="sd-note">Sealed. The event has passed; the editions that were held are the editions there are.</p>
            ) : (
              <div className="sd-buy">
                <StellarBuyCard
                  designation={seed.designation}
                  name={seed.name}
                  rarity={rarity}
                  priceUsd={priceUsd}
                  available={available}
                  released={released}
                />
              </div>
            )}
            {almanac && !sealed && <p className="sd-note">If clouds cover the night, this card stays open until the next clear capture.</p>}
            {record.physical && <p className="sd-note">Includes a physical fragment.</p>}
            {pair && (
              <div className="sd-cardhero__pair">
                <span className="sd-label">Pairs with</span>
                <CardPlate size="sm" designation={pair.seed.designation} href={`/card/${pair.seed.designation}`} />
                <span className="sd-data">{pair.seed.name}</span>
              </div>
            )}
            <div className="sd-cardhero__obs">
              <ObservationStatusMark status={seed.observationStatus as ObservationStatus} />
              <span className="sd-data">{card.observability.reason}</span>
              <Link href="/tonight" className="sd-link sd-data">
                Tonight on Live Telescope V1
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sd-container sd-chapter-block">
        <Chapter n="01" title="Record" aside={seed.catalogRef} />
        <DataRow
          layout="stacked"
          items={[
            { label: 'Object', value: seed.objectType },
            { label: 'Rarity', value: rarityInfo(rarity).label },
            { label: 'Catalogue', value: seed.catalogRef },
            ...position,
            ...record.stats.map(([label, value]) => ({ label, value })),
            { label: 'Editions issued', value: allocated === null ? `0 / ${seed.editionSize}` : `${allocated} / ${seed.editionSize}` },
            { label: 'Direct price', value: sealed ? 'Sealed' : `$${priceUsd}` },
          ]}
        />
      </section>
    </StellarShell>
  );
}
