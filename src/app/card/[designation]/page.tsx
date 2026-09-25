import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlmanacDate from '@/components/sidera/AlmanacDate';
import CardPlate from '@/components/sidera/CardPlate';
import SideraBuyCard from '@/components/sidera/SideraBuyCard';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import DataRow, { type Datum } from '@/components/sidera/ui/DataRow';
import ObservationStatusMark from '@/components/sidera/ui/ObservationStatusMark';
import Chapter from '@/components/sidera/ui/Chapter';
import { getDb } from '@/lib/db';
import { formatDec, formatRa } from '@/lib/observatory/telescope-targets';
import { rarityInfo, type Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { cardStatus } from '@/lib/sidera/almanac';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import type { ObservationStatus } from '@/lib/sidera/observability';
import { cardAvailability } from '@/lib/sidera/orders';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ designation: string }>;
}): Promise<Metadata> {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  if (!card) return { title: 'Card not found' };
  return { title: `${card.seed.name} — First Light · Sidera`, description: card.seed.blurb };
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
      console.error('[sidera] cannot read card availability', err);
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

  const pairsWith: Datum[] = pair
    ? [
        {
          label: 'Pairs with',
          value: (
            <Link href={`/card/${pair.seed.designation}`} className="sd-link">
              {pair.seed.name}
            </Link>
          ),
        },
      ]
    : [];

  return (
    <SideraShell>
      <SideraView step="card" />
      <section className="sd-container sd-top">
        <nav aria-label="Breadcrumb" className="sd-crumb sd-data">
          <Link href="/set/001">First Light</Link>
          <span aria-hidden="true">/</span>
          <strong>{seed.designation}</strong>
        </nav>
        <div className="sd-cardhero">
          <figure className="sd-cardhero__plate sd-figure">
            <span className="sd-poster__ghost" aria-hidden="true">
              {seed.designation}
            </span>
            <CardPlate size="lg" hero designation={seed.designation} />
          </figure>

          <div>
            <p className="sd-eyebrow">
              {seed.objectType} · {rarityInfo(rarity).label}
            </p>
            <h1 className="sd-cardhero__name">{seed.name}</h1>
            <p className="sd-cardhero__blurb">{record.line}</p>
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
                <SideraBuyCard
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
            <div className="sd-cardhero__obs">
              <ObservationStatusMark status={seed.observationStatus as ObservationStatus} />
              <span className="sd-data">{card.observability.reason}</span>
              <Link href="/tonight" className="sd-link sd-data">
                Tonight at Node 01
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
            ...pairsWith,
            { label: 'Editions issued', value: allocated === null ? `0 / ${seed.editionSize}` : `${allocated} / ${seed.editionSize}` },
            { label: 'Direct price', value: sealed ? 'Sealed' : `$${priceUsd}` },
          ]}
        />
      </section>
    </SideraShell>
  );
}
