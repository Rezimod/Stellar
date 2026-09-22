import type { Metadata } from "next";
import Link from "next/link";
import CardPlate from "@/components/sidera/CardPlate";
import SideraShell from "@/components/sidera/SideraShell";
import SideraView from "@/components/sidera/SideraView";
import SideraVote from "@/components/sidera/SideraVote";
import DataRow, { type Datum } from "@/components/sidera/ui/DataRow";
import { getDb } from "@/lib/db";
import { getNode } from "@/lib/observatory/nodes";
import { isRarity } from "@/lib/rarity";
import { SET_001_CARD_BY_DESIGNATION } from "@/lib/sets/set-001";
import { addDays, tonightView, type TonightView } from "@/lib/sidera/night";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tonight — the card Node 01 photographs",
  description:
    "One object a night, chosen by the holders among what Node 01 can photograph.",
};

const RESULT: Record<TonightView["recent"][number]["result"], string> = {
  photographed: "Photographed",
  lost: "Lost to cloud",
  none: "No photograph",
};

export default async function TonightPage() {
  const node = getNode("tbilisi-01")!;
  const db = getDb();
  let view: TonightView | null = null;
  if (db) {
    try {
      view = await tonightView(db, node, new Date());
    } catch (err) {
      console.error("[sidera] cannot read tonight", err);
    }
  }

  const localTime = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: node.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  const nightLabel = (night: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
    }).format(new Date(`${night}T00:00:00Z`));

  const d = view?.decided ?? null;
  const lastLost =
    view?.recent.find(
      (r) => r.night === addDays(view.night, -1) && r.result === "lost",
    ) ?? null;
  const art = d
    ? (SET_001_CARD_BY_DESIGNATION.get(d.designation)?.seed.artUrl ?? d.artUrl)
    : null;

  const plan: Datum[] = d
    ? [
        {
          label: "Planned",
          value: d.plannedAt ? `${localTime(d.plannedAt)} local` : "—",
        },
        {
          label: "Cloud",
          value:
            d.cloudForecast === null
              ? "No forecast"
              : `${d.cloudForecast}% forecast`,
        },
        { label: "Node", value: `Node 01 · ${node.status}` },
      ]
    : [];

  return (
    <SideraShell>
      <SideraView step="tonight" />
      <section className="sd-hero" style={{ paddingBottom: 24 }}>
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-container">
          <p className="sd-eyebrow">
            Node 01 · {node.site} ·{" "}
            {view ? `Night of ${nightLabel(view.night)}` : "Tonight"}
          </p>
          <h1 className="sd-display" style={{ maxWidth: "14ch" }}>
            {d ? d.name : "Not yet decided."}
          </h1>
          <p className="sd-hero__sub">
            {d
              ? d.basis
              : "Decided at 17:00 Tbilisi time, from the holders’ votes."}
          </p>
          {lastLost && (
            <p className="sd-data" style={{ marginTop: 16 }}>
              The night of {nightLabel(lastLost.night)} was lost to cloud.{" "}
              {lastLost.lostReason}
            </p>
          )}
        </div>
      </section>

      {d && (
        <section className="sd-container sd-section">
          <div className="sd-card-page">
            <figure className="sd-figure">
              <CardPlate
                size="md"
                designation={d.designation}
                name={d.name}
                rarity={isRarity(d.rarity) ? d.rarity : "common"}
                artUrl={art}
                href={`/card/${d.designation}`}
              />
            </figure>
            <div className="sd-card-page__col">
              <DataRow layout="stacked" items={plan} />
              {d.capture ? (
                <div className="sd-section">
                  <h2 className="sd-section__title">Capture</h2>
                  <DataRow
                    layout="stacked"
                    items={[
                      {
                        label: "UTC",
                        value: d.capture.capturedAt
                          .slice(0, 16)
                          .replace("T", " "),
                      },
                      { label: "Node", value: d.capture.nodeId },
                      {
                        label: "Exposure",
                        value: `${d.capture.subs} × ${d.capture.exposureSec} s`,
                      },
                      { label: "Optics", value: d.capture.opticalTrain },
                      { label: "Provenance", value: d.capture.provenance },
                    ]}
                  />
                </div>
              ) : node.status === "commissioning" ? (
                <p className="sd-note">
                  Node 01 is commissioning. No photograph is taken yet.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {view && (
        <section className="sd-container sd-section">
          <h2 className="sd-section__title">
            Vote · night of {nightLabel(view.voting.night)}
          </h2>
          {view.voting.carried ? (
            <p className="sd-note">
              {view.voting.carried} takes this night, carried from a night lost
              to cloud. Votes count from the next.
            </p>
          ) : view.voting.candidates.length === 0 ? (
            <p className="sd-note">
              Nothing in the set clears the horizon for Node 01 that night.
            </p>
          ) : (
            <>
              <p className="sd-note">
                Holders vote. Each card held adds weight by its rarity.
              </p>
              <table className="sd-log sd-log--mid">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Highest</th>
                    <th>Votes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {view.voting.candidates.map((c) => (
                    <tr key={c.designation}>
                      <td>
                        <Link href={`/card/${c.designation}`}>{c.name}</Link>
                      </td>
                      <td className="sd-nowrap">
                        {c.altitudeDeg.toFixed(0)}° · {localTime(c.at)}
                      </td>
                      <td>{c.votes}</td>
                      <td>
                        <SideraVote designation={c.designation} name={c.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {view && view.recent.length > 0 && (
        <section className="sd-container sd-section">
          <h2 className="sd-section__title">Past nights</h2>
          <table className="sd-log sd-log--mid">
            <tbody>
              {view.recent.map((r) => (
                <tr key={r.night}>
                  <td className="sd-nowrap">{r.night}</td>
                  <td>
                    <Link href={`/card/${r.designation}`}>{r.name}</Link>
                  </td>
                  <td>{RESULT[r.result]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {!view && (
        <section className="sd-container sd-section">
          <p className="sd-note">
            The night’s record cannot be read right now.
          </p>
        </section>
      )}
    </SideraShell>
  );
}
