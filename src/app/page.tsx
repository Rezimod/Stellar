import type { Metadata } from "next";
import Link from "next/link";
import CardPlate from "@/components/sidera/CardPlate";
import HeroShowcase from "@/components/sidera/HeroShowcase";
import CountUp from "@/components/sidera/ui/CountUp";
import Rise from "@/components/sidera/ui/Rise";
import SideraShell from "@/components/sidera/SideraShell";
import SideraView from "@/components/sidera/SideraView";
import DataRow from "@/components/sidera/ui/DataRow";
import { getDb } from "@/lib/db";
import { getNode } from "@/lib/observatory/nodes";
import type { Rarity } from "@/lib/rarity";
import { SET_001_CARDS } from "@/lib/sets/set-001";
import { capsulesOnSale } from "@/lib/sidera/capsule";
import { CAPSULE_PRICE_GEL, CARDS_PER_CAPSULE } from "@/lib/sidera/economics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sidera — the night sky, issued in editions",
  description:
    "Twenty real objects, each held as a numbered edition. A telescope in Tbilisi photographs one of them a night, and everyone holding that card gets the photograph.",
};

const STEPS = [
  {
    n: "01",
    title: "Open a capsule",
    body: "Three numbered cards, each a real object. Every draw can be checked.",
  },
  {
    n: "02",
    title: "Holders pick the night",
    body: "The Collection chooses what Node 01 points at.",
  },
  {
    n: "03",
    title: "The photograph joins the card",
    body: "One capture goes to every edition of that card.",
  },
];

const SHOWCASE = ["SATURN", "M42", "TYCHO", "EUROPA", "JUPITER", "M57", "MARS", "PLUTO"];

export default async function HomePage() {
  const node = getNode("tbilisi-01");
  const showcase = SHOWCASE.flatMap((d) => {
    const c = SET_001_CARDS.find((x) => x.seed.designation === d);
    return c
      ? [
          {
            designation: c.seed.designation,
            name: c.seed.name,
            rarity: c.seed.rarity as Rarity,
            artUrl: c.seed.artUrl,
          },
        ]
      : [];
  });

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
      <SideraView step="landing" />
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
              Twenty real objects, each a numbered edition. When Node 01
              photographs one, every holder of that card gets the frame.
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

          <HeroShowcase cards={showcase} />
        </div>
      </section>

      <section className="sd-band">
        <div className="sd-container">
          <p className="sd-eyebrow">How it works</p>
          <h2 className="sd-page__title">Three cards, one telescope</h2>
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
                  artUrl={c.seed.artUrl}
                  href={`/card/${c.seed.designation}`}
                  data={[
                    {
                      label: "Editions",
                      value: `${c.seed.editionSize} editions`,
                    },
                  ]}
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
              Every draw is in the log.
            </h2>
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
