import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import ObjectArt from '@/components/sidera/ObjectArt';
import SideraShell from '@/components/sidera/SideraShell';
import NightBand from '@/components/sidera/node/NightBand';
import NodeScope, { type ScopeTarget } from '@/components/sidera/node/NodeScope';
import OpticalPath from '@/components/sidera/node/OpticalPath';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow from '@/components/sidera/ui/DataRow';
import Rise from '@/components/sidera/ui/Rise';
import { getDb } from '@/lib/db';
import { getSunAltitude } from '@/lib/dark-window';
import { getNodesWithReadiness, getNode } from '@/lib/observatory/nodes';
import { fieldOfView, resolvingPowerArcsec } from '@/lib/observatory/optics';
import { card } from '@/lib/schema';
import { SET_001_CARDS } from '@/lib/sets/set-001';
import { nightRow } from '@/lib/sidera/night';
import { observableTonight, siteDarkWindow, siteNightDate } from '@/lib/sidera/target';
import './node.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Node 01 — the telescope the collection points',
  description:
    'A 150 mm telescope on a roof in Tbilisi. Each clear night it photographs one card, and every holder of that card receives the image. Node 01 is commissioning.',
};

export default async function NodePage() {
  const base = getNode('tbilisi-01')!;
  const now = new Date();
  const night = siteNightDate(base.timezone, now);
  const dark = siteDarkWindow(base, night);

  let cloud: number | null = null;
  try {
    cloud = (await getNodesWithReadiness(now)).find((n) => n.id === base.id)?.readiness.cloudCover ?? null;
  } catch (err) {
    console.error('[sidera] cannot read Node 01 readiness', err);
  }

  let tonight: string | null = null;
  const db = getDb();
  if (db) {
    try {
      const row = await nightRow(db, night);
      if (row) {
        const [c] = await db.select({ designation: card.designation }).from(card).where(eq(card.id, row.cardId));
        tonight = c?.designation ?? null;
      }
    } catch (err) {
      console.error('[sidera] cannot read tonight', err);
    }
  }

  const seeds = SET_001_CARDS.map((c) => c.seed);
  const observable = observableTonight(seeds, base, night);
  const targets: ScopeTarget[] = observable.map((o) => ({
    designation: o.card.designation,
    name: o.card.name,
    rarity: o.card.rarity,
    targetId: o.card.targetId,
    at: o.at.toISOString(),
    altitudeDeg: o.altitudeDeg,
    thumb: <ObjectArt designation={o.card.designation} />,
  }));
  const lead = observable.find((o) => o.card.designation === tonight) ?? observable[0] ?? null;

  const { instrument } = base;
  const fov = fieldOfView(instrument);
  const localTime = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: base.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d);
  const darkHours = dark.duskStart && dark.dawnEnd ? (dark.dawnEnd.getTime() - dark.duskStart.getTime()) / 3_600_000 : null;
  const sunNow = getSunAltitude(base.lat, base.lon, now);

  return (
    <SideraShell title="Node 01">
      <section className="sd-poster sd-top sd-node-head">
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-node-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="sd-container">
          <DataRow
            className="sd-strip"
            items={[
              { label: 'Aperture', value: `${instrument.apertureMm} mm` },
              { label: 'Focal length', value: `${instrument.focalLengthMm} mm` },
              { label: 'Site', value: `${base.site.split(',')[0]} · Bortle ${base.bortle}` },
              { label: 'Status', value: base.status },
            ]}
          />
          <p className="sd-strip-note">One card a night, chosen by holders · the image goes to every holder of that card</p>

          <NodeScope
            node={base}
            targets={targets}
            tonight={tonight}
            window={
              dark.duskStart && dark.dawnEnd
                ? {
                    dusk: dark.duskStart.toISOString(),
                    dawn: dark.dawnEnd.toISOString(),
                  }
                : null
            }
          />
        </div>
      </section>

      <section className="sd-container sd-chapter-block">
        <Chapter n="01" title="Instrument" aside={instrument.optics} />
        <Rise>
          <div className="sd-node-instrument">
            <div className="sd-node-instrument__figure">
              <OpticalPath instrument={instrument} />
              <p className="sd-note">
                Light enters through the corrector, folds back off the primary, and leaves through a hole in its centre to the
                sensor. A 1500 mm focal length in a tube a third as long.
              </p>
            </div>
            <DataRow
              layout="stacked"
              items={[
                { label: 'Optics', value: instrument.optics },
                { label: 'Aperture', value: `${instrument.apertureMm} mm` },
                {
                  label: 'Focal ratio',
                  value: `f/${(instrument.focalLengthMm / instrument.apertureMm).toFixed(0)}`,
                },
                { label: 'Mount', value: instrument.mount },
                { label: 'Camera', value: instrument.camera },
                { label: 'Pixel', value: `${instrument.pixelSizeUm} µm` },
                {
                  label: 'Plate scale',
                  value: `${fov.plateScaleArcsecPx.toFixed(2)}″ per pixel`,
                },
                {
                  label: 'Field',
                  value: `${fov.widthArcmin.toFixed(1)}′ × ${fov.heightArcmin.toFixed(1)}′`,
                },
                {
                  label: 'Resolving power',
                  value: `${resolvingPowerArcsec(instrument).toFixed(2)}″`,
                },
                { label: 'Sky', value: `Bortle ${base.bortle}, city` },
              ]}
            />
          </div>
        </Rise>
      </section>

      {dark.duskStart && dark.dawnEnd && (
        <section className="sd-container sd-chapter-block">
          <Chapter n="02" title="Night at the node" aside={`${localTime(dark.duskStart)} – ${localTime(dark.dawnEnd)}`} />
          <Rise>
            <div>
              <NightBand
                node={base}
                dusk={dark.duskStart}
                dawn={dark.dawnEnd}
                now={now}
                pins={
                  lead
                    ? [
                        {
                          at: lead.at,
                          label: `${lead.card.designation} · ${localTime(lead.at)}`,
                        },
                      ]
                    : []
                }
              />
              <DataRow
                className="sd-facts"
                items={[
                  {
                    label: 'Dark',
                    value: darkHours === null ? '—' : `${darkHours.toFixed(1)} h`,
                  },
                  { label: 'Sun now', value: `${sunNow.toFixed(1)}°` },
                  {
                    label: 'Cloud',
                    value: cloud === null ? '—' : `${Math.round(cloud)}%`,
                  },
                  {
                    label: 'Observable',
                    value: `${targets.length} ${targets.length === 1 ? 'card' : 'cards'}`,
                  },
                ]}
              />
            </div>
          </Rise>
        </section>
      )}

      <section className="sd-container sd-chapter-block sd-node-last">
        <Chapter n="03" title="Simulator" aside="Hands on" />
        <Rise>
          <div className="sd-node-cta">
            <div className="sd-node-cta__copy">
              <p className="sd-node-cta__lead">
                Drive the same instrument by hand: the real optical train, real slew times and the safety envelope that refuses
                what the mount would refuse.
              </p>
              <ul className="sd-node-cta__list sd-data">
                <li>Hand control at nine rates</li>
                <li>Reducer, native and Barlow trains</li>
                <li>Stacking you can watch converge</li>
                <li>Any hour of tonight, on the site clock</li>
              </ul>
              <Link href="/node/simulator" className="sd-btn sd-btn--primary sd-node-cta__btn">
                Open the simulator
              </Link>
            </div>
            <div className="sd-node-cta__paddle" aria-hidden="true">
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="92" className="sd-paddle__ring" />
                <circle cx="100" cy="100" r="64" className="sd-paddle__ring sd-paddle__ring--dim" />
                {[0, 90, 180, 270].map((r) => (
                  <path key={r} d="M100 34 l10 12 h-20 z" transform={`rotate(${r} 100 100)`} className="sd-paddle__key" />
                ))}
                <circle cx="100" cy="100" r="18" className="sd-paddle__trk" />
                <text x="100" y="104" textAnchor="middle">
                  TRK
                </text>
              </svg>
            </div>
          </div>
        </Rise>
      </section>
    </SideraShell>
  );
}
