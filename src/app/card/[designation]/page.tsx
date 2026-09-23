import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SideraCard from '@/components/sidera/SideraCard';
import SideraCardStage from '@/components/sidera/SideraCardStage';
import SideraBuyCard from '@/components/sidera/SideraBuyCard';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import DataRow, { type Datum } from '@/components/sidera/ui/DataRow';
import ObservationStatusMark from '@/components/sidera/ui/ObservationStatusMark';
import Chapter from '@/components/sidera/ui/Chapter';
import { getDb } from '@/lib/db';
import { formatDec, formatRa } from '@/lib/observatory/telescope-targets';
import { rarityInfo, type Rarity } from '@/lib/rarity';
import { isRendered } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { DIRECT_CARD_PRICE_USD } from '@/lib/sidera/economics';
import type { ObservationStatus } from '@/lib/sidera/observability';
import { cardAvailability } from '@/lib/sidera/orders';
import { SURVEYED } from '@/lib/sidera/plate/objects';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ designation: string }>;
}): Promise<Metadata> {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  if (!card) return { title: 'Card not found' };
  return { title: `${card.seed.name} · ${card.seed.designation}`, description: card.seed.blurb };
}

/** A selenographic degree, with a real minus sign rather than a hyphen. */
const degrees = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}°`;

export default async function CardPage({ params }: { params: Promise<{ designation: string }> }) {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  if (!card) notFound();

  const { seed } = card;
  const rarity = seed.rarity as Rarity;
  const priceUsd = DIRECT_CARD_PRICE_USD[rarity];

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

  const position: Datum[] =
    seed.raHours !== null && seed.raHours !== undefined && seed.decDeg !== null && seed.decDeg !== undefined
      ? [
          { label: 'RA', value: formatRa(seed.raHours) },
          { label: 'Dec', value: formatDec(seed.decDeg) },
        ]
      : seed.surfaceLat !== null && seed.surfaceLat !== undefined && seed.surfaceLon !== null && seed.surfaceLon !== undefined
        ? [
            { label: 'Lat', value: degrees(seed.surfaceLat) },
            { label: 'Lon', value: degrees(seed.surfaceLon) },
          ]
        : [{ label: 'Position', value: 'Moves — computed for the night' }];

  return (
    <SideraShell>
      <SideraView step="card" />
      <section className="sd-container sd-top">
        <nav aria-label="Breadcrumb" className="sd-crumb sd-data">
          <Link href="/set/001">Set 001</Link>
          <span aria-hidden="true">/</span>
          <strong>{seed.designation}</strong>
        </nav>
        <div className="sd-cardhero">
          <figure className="sd-cardhero__plate sd-figure">
            <span className="sd-poster__ghost" aria-hidden="true">
              {seed.designation}
            </span>
            <SideraCardStage
              front={<SideraCard designation={seed.designation} />}
              back={<SideraCard designation={seed.designation} side="back" />}
            />
            {isRendered(seed.artUrl) && !SURVEYED.includes(seed.designation) && (
              <p className="sd-label sd-figure__note">Rendered from mission maps · awaiting Node 01</p>
            )}
          </figure>

          <div>
            <p className="sd-eyebrow">
              {seed.objectType} · {rarityInfo(rarity).label}
            </p>
            <h1 className="sd-cardhero__name">{seed.name}</h1>
            <p className="sd-cardhero__blurb">{seed.blurb}</p>
            <DataRow
              className="sd-facts"
              items={[
                { label: 'Supply', value: `${seed.editionSize - (allocated ?? 0)} of ${seed.editionSize} left` },
                { label: 'Price', value: `$${priceUsd}` },
              ]}
            />
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
            { label: 'Editions issued', value: allocated === null ? `0 / ${seed.editionSize}` : `${allocated} / ${seed.editionSize}` },
            { label: 'Direct price', value: `$${priceUsd}` },
          ]}
        />
      </section>
    </SideraShell>
  );
}
