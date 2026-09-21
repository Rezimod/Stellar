import type { Metadata } from "next";
import Link from "next/link";
import CardPlate from "@/components/sidera/CardPlate";
import CountUp from "@/components/sidera/ui/CountUp";
import Rise from "@/components/sidera/ui/Rise";
import SideraShell from "@/components/sidera/SideraShell";
import DataRow from "@/components/sidera/ui/DataRow";
import { getDb } from "@/lib/db";
import { getNode } from "@/lib/observatory/nodes";
import type { Rarity } from "@/lib/rarity";
import { SET_001_CARDS } from "@/lib/sets/set-001";
import { capsulesOnSale } from "@/lib/sidera/capsule";
import { CAPSULE_PRICE_GEL, CARDS_PER_CAPSULE } from "@/lib/sidera/economics";
import type { ObservationStatus } from "@/lib/sidera/observability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sidera — the night sky, issued in editions",
  description:
    "Twenty real objects, each held as a numbered edition. A telescope in Tbilisi photographs one of them a night, and everyone holding that card gets the photograph.",
};

const STEPS = [
  {
    n: "01",
    title: "Crack a capsule",
    body: `Three cards come out, each a numbered edition of something real — a crater, a planet, a star, a nebula. What you draw is fixed by a secret published before the sale and a number your browser makes after it, and anyone can check the arithmetic afterwards.`,
  },
  {
    n: "02",
    title: "The collection picks the night",
    body: `Holders choose what Node 01 points at, from the cards it can physically record. Aperture, sky brightness and horizon decide what is on that list — not scarcity. Europa is the rarest thing in the set and can never be on it.`,
  },
  {
    n: "03",
    title: "The photograph lands in your card",
    body: `One capture serves the whole card. The night your object is photographed, that frame is attached to your edition and to every other edition of it, with the node, the timestamp and the instrument printed beside it.`,
  },
];

export default async function HomePage() {
  const node = getNode("tbilisi-01");
  const hero = ["SATURN", "M42", "TYCHO", "EUROPA"]
    .map((d) => SET_001_CARDS.find((c) => c.seed.designation === d))
    .filter((c): c is (typeof SET_001_CARDS)[number] => Boolean(c));

  const db = getDb();
  let onSale = 0;
  if (db) {
    try {
      onSale = (await capsulesOnSale(db)).length;
    } catch {
      onSale = 0;
    }
  }

  const editions = SET_001_CARDS.reduce(
    (sum, c) => sum + c.seed.editionSize,
    0,
  );

  return (
    <SideraShell>
      <section className="sd-hero">
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-container sd-hero__grid">
          <div>
            <p className="sd-eyebrow">Set 001 · Node 01 commissioning</p>
            <h1 className="sd-display">
              The night sky,
              <br />
              issued in{" "}
              <span style={{ color: "var(--sd-accent)" }}>editions</span>.
            </h1>
            <p className="sd-hero__sub">
              Twenty real objects — craters, planets, stars, nebulae. Each one a
              numbered edition. A telescope in Tbilisi photographs one of them a
              night, and everyone holding that card gets the photograph.
            </p>
            <div className="sd-hero__cta">
              <Link href="/capsules" className="sd-btn sd-btn--primary">
                Open a capsule — {CAPSULE_PRICE_GEL} GEL
              </Link>
              <Link href="/set/001" className="sd-btn">
                See all twenty
              </Link>
            </div>
            <div className="sd-stats">
              <div>
                <div className="sd-stat__n">
                  <CountUp value={SET_001_CARDS.length} />
                </div>
                <div className="sd-stat__l">Objects in Set 001</div>
              </div>
              <div>
                <div className="sd-stat__n">
                  <CountUp value={editions} />
                </div>
                <div className="sd-stat__l">Numbered editions</div>
              </div>
              <div>
                <div className="sd-stat__n">
                  <CountUp value={onSale || CARDS_PER_CAPSULE} />
                </div>
                <div className="sd-stat__l">
                  {onSale ? "Capsules on sale" : "Cards per capsule"}
                </div>
              </div>
            </div>
          </div>

          <div className="sd-hero__art">
            <ul className="sd-hero__fan">
              {hero.map((c) => (
                <li key={c.seed.designation} style={{ listStyle: "none" }}>
                  <CardPlate
                    designation={c.seed.designation}
                    name={c.seed.name}
                    rarity={c.seed.rarity as Rarity}
                    observationStatus={
                      c.seed.observationStatus as ObservationStatus
                    }
                    artUrl={c.seed.artUrl}
                    href={`/card/${c.seed.designation}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sd-band">
        <div className="sd-container">
          <p className="sd-eyebrow">How it works</p>
          <h2 className="sd-page__title">
            Three cards, one telescope, a public ledger of every draw
          </h2>
          <ol className="sd-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="sd-step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {node && (
        <Rise>
          <section className="sd-container sd-section">
            <div className="sd-panel">
              <p className="sd-eyebrow">The instrument</p>
              <h2 className="sd-name">
                Node 01 — {node.name}, {node.site}
              </h2>
              <p className="sd-lede">
                A 150 mm telescope on a city roof under a Bortle {node.bortle}{" "}
                sky. It is being commissioned, so it has not begun its nightly
                run — and nothing here pretends otherwise. What it will and will
                not reach is already printed on every card in the set, object by
                object.
              </p>
              <div className="sd-section" style={{ marginTop: 28 }}>
                <DataRow
                  items={[
                    { label: "Status", value: "Commissioning" },
                    { label: "Optics", value: node.instrument.optics },
                    {
                      label: "Aperture",
                      value: `${node.instrument.apertureMm} mm`,
                    },
                    { label: "Camera", value: node.instrument.camera },
                    { label: "Sky", value: `Bortle ${node.bortle}` },
                  ]}
                />
              </div>
            </div>
          </section>
        </Rise>
      )}

      <Rise>
        <section className="sd-container sd-section">
          <div className="sd-page__head">
            <div>
              <p className="sd-eyebrow">Set 001</p>
              <h2 className="sd-page__title">What is in the set</h2>
            </div>
            <Link href="/set/001" className="sd-btn">
              All twenty
            </Link>
          </div>
          <ul className="sd-grid sd-section">
            {SET_001_CARDS.slice(0, 8).map((c) => (
              <li key={c.seed.designation}>
                <CardPlate
                  designation={c.seed.designation}
                  name={c.seed.name}
                  rarity={c.seed.rarity as Rarity}
                  observationStatus={
                    c.seed.observationStatus as ObservationStatus
                  }
                  artUrl={c.seed.artUrl}
                  href={`/card/${c.seed.designation}`}
                  data={[{ label: "Editions", value: c.seed.editionSize }]}
                />
              </li>
            ))}
          </ul>
        </section>
      </Rise>

      <Rise>
        <section className="sd-band">
          <div className="sd-container" style={{ textAlign: "center" }}>
            <h2
              className="sd-display"
              style={{ maxWidth: "18ch", marginInline: "auto" }}
            >
              Nothing here is a rendering.
            </h2>
            <p
              className="sd-lede"
              style={{ marginInline: "auto", textAlign: "center" }}
            >
              Every object on a card is somewhere overhead tonight, and every
              draw is written into a log anyone can read, check and argue with.
            </p>
            <div className="sd-hero__cta" style={{ justifyContent: "center" }}>
              <Link href="/capsules" className="sd-btn sd-btn--primary">
                Open a capsule
              </Link>
              <Link href="/capsules/log" className="sd-btn">
                Read the log
              </Link>
            </div>
          </div>
        </section>
      </Rise>
    </SideraShell>
  );
}
