import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SideraBuyCard from '@/components/sidera/SideraBuyCard';
import SideraShell from '@/components/sidera/SideraShell';
import Caption from '@/components/sidera/ui/Caption';
import DataRow, { type Datum } from '@/components/sidera/ui/DataRow';
import ObservationStatusMark from '@/components/sidera/ui/ObservationStatusMark';
import RarityMark from '@/components/sidera/ui/RarityMark';
import Rule from '@/components/sidera/ui/Rule';
import { getDb } from '@/lib/db';
import { formatDec, formatRa } from '@/lib/observatory/telescope-targets';
import type { Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { DIRECT_CARD_PRICE_GEL } from '@/lib/sidera/economics';
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
  const priceGel = DIRECT_CARD_PRICE_GEL[rarity];

  const db = getDb();
  let allocated: number | null = null;
  let available = false;
  if (db) {
    try {
      const a = await cardAvailability(db, seed.designation);
      if (a) {
        allocated = a.allocated;
        available = a.available;
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
      <section className="sd-container sd-page">
        <Link href="/set/001" className="sd-back">
          Set 001
        </Link>

        <div className="sd-card-page">
          <figure className="sd-figure">
            <div className="sd-figure__frame">
              {seed.artUrl ? <img src={seed.artUrl} alt={`${seed.name}, plate`} /> : <span className="sd-label">Plate in preparation</span>}
            </div>
            <Caption parts={['Set 001', seed.designation, 'Plate in preparation']} />
          </figure>

          <div>
            <p className="sd-label">{seed.designation}</p>
            <h1 className="sd-page__title">{seed.name}</h1>
            <p className="sd-plate__marks" style={{ marginTop: 12 }}>
              <RarityMark rarity={rarity} />
              <ObservationStatusMark status={seed.observationStatus as ObservationStatus} />
            </p>
            <p className="sd-blurb">{seed.blurb}</p>

            <div className="sd-section">
              <h2 className="sd-section__title">Record</h2>
              <DataRow
                layout="stacked"
                items={[
                  { label: 'Object', value: seed.objectType },
                  { label: 'Catalogue', value: seed.catalogRef },
                  ...position,
                  { label: 'Target', value: seed.targetId },
                  { label: 'Editions', value: allocated === null ? String(seed.editionSize) : `${allocated} / ${seed.editionSize}` },
                  { label: 'Price', value: `${priceGel} GEL` },
                ]}
              />
            </div>

            <div className="sd-section">
              <h2 className="sd-section__title">Observation</h2>
              <p className="sd-data">{card.observability.reason}</p>
              <p className="sd-note">
                Node 01 is commissioning. When it photographs this object, the photograph is attached to every edition
                of this card at once.
              </p>
            </div>

            <Rule />
            <div className="sd-section">
              <SideraBuyCard designation={seed.designation} name={seed.name} priceGel={priceGel} available={available} />
            </div>
          </div>
        </div>
      </section>
    </SideraShell>
  );
}
