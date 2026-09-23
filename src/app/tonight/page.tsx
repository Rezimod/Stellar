import type { Metadata } from 'next';
import Link from 'next/link';
import CardPlate from '@/components/sidera/CardPlate';
import ObjectArt from '@/components/sidera/ObjectArt';
import SideraShell from '@/components/sidera/SideraShell';
import SideraView from '@/components/sidera/SideraView';
import SideraVote from '@/components/sidera/SideraVote';
import TonightSkyChart from '@/components/sidera/TonightSkyChart';
import Chapter from '@/components/sidera/ui/Chapter';
import DataRow, { type Datum } from '@/components/sidera/ui/DataRow';
import { getDb } from '@/lib/db';
import { getNode } from '@/lib/observatory/nodes';
import { isRarity, type Rarity } from '@/lib/rarity';
import { addDays, tonightView, type TonightView } from '@/lib/sidera/night';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tonight — the card Node 01 photographs',
  description: 'One object a night, chosen by the holders among what Node 01 can photograph.',
};

const RESULT: Record<TonightView['recent'][number]['result'], string> = {
  photographed: 'Photographed',
  lost: 'Lost to cloud',
  none: 'No photograph',
};

const rarityOf = (r: string): Rarity => (isRarity(r) ? r : 'common');

export default async function TonightPage() {
  const node = getNode('tbilisi-01')!;
  const now = new Date();
  const db = getDb();
  let view: TonightView | null = null;
  if (db) {
    try {
      view = await tonightView(db, node, now);
    } catch (err) {
      console.error('[sidera] cannot read tonight', err);
    }
  }

  const localTime = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: node.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
      new Date(iso),
    );
  const dateOf = (night: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(new Date(`${night}T00:00:00Z`));
  const nightLabel = (night: string) => dateOf(night, { day: 'numeric', month: 'long' });

  const d = view?.decided ?? null;
  const lastLost = view?.recent.find((r) => r.night === addDays(view.night, -1) && r.result === 'lost') ?? null;
  const candidates = view?.voting.candidates ?? [];
  const cast = candidates.reduce((sum, c) => sum + c.votes, 0);
  // Before the decision the page leads with what would win now: most votes, else highest.
  const leading = candidates.reduce<(typeof candidates)[number] | null>((best, c) => (!best || c.votes > best.votes ? c : best), null);
  const lead = d
    ? { designation: d.designation, name: d.name, rarity: rarityOf(d.rarity) }
    : leading && { designation: leading.designation, name: leading.name, rarity: rarityOf(leading.rarity) };

  const facts: Datum[] = d
    ? [
        { label: 'Planned', value: d.plannedAt ? localTime(d.plannedAt) : '—' },
        { label: 'Cloud', value: d.cloudForecast === null ? '—' : `${d.cloudForecast}%` },
        { label: 'Node 01', value: node.status },
      ]
    : leading
      ? [
          { label: 'Highest', value: `${leading.altitudeDeg.toFixed(0)}°` },
          { label: 'At', value: localTime(leading.at) },
          ...(cast ? [{ label: 'Votes', value: `${leading.votes} of ${cast}` }] : []),
        ]
      : [];

  return (
    <SideraShell>
      <SideraView step="tonight" />

      <section className="sd-poster sd-top">
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-container">

          <div className="sd-poster__grid">
            <div className="sd-poster__copy">
              {view && (
                <p className="sd-datestamp">
                  <span className="sd-datestamp__day">{dateOf(view.night, { day: '2-digit' })}</span>
                  <span className="sd-datestamp__rest">
                    {dateOf(view.night, { month: 'short' })}
                    <br />
                    {dateOf(view.night, { year: 'numeric' })}
                  </span>
                </p>
              )}
              <p className="sd-eyebrow">{d ? 'Tonight’s card' : leading ? (cast ? 'Leading the vote' : 'Highest tonight') : 'Node 01'}</p>
              <h1 className="sd-mega">{lead ? lead.name : 'A quiet sky.'}</h1>
              <p className="sd-poster__sub">
                {d
                  ? d.basis
                  : lead
                    ? 'Holders’ votes lock tonight’s card at 17:00 Tbilisi time.'
                    : 'Nothing in the set clears the horizon for Node 01.'}
              </p>
              {facts.length > 0 && <DataRow className="sd-facts" items={facts} />}
              {lastLost && (
                <p className="sd-alert">
                  <strong>{nightLabel(lastLost.night)} was lost to cloud.</strong> {lastLost.lostReason}
                </p>
              )}
              {d?.capture ? (
                <DataRow
                  className="sd-facts"
                  items={[
                    { label: 'Captured', value: `${d.capture.capturedAt.slice(11, 16)} UTC` },
                    { label: 'Exposure', value: `${d.capture.subs} × ${d.capture.exposureSec} s` },
                    { label: 'Optics', value: d.capture.opticalTrain },
                    { label: 'Provenance', value: d.capture.provenance },
                  ]}
                />
              ) : d && node.status === 'commissioning' ? (
                <p className="sd-note">Node 01 is commissioning. No photograph is taken yet.</p>
              ) : null}
            </div>

            {lead && (
              <div className="sd-poster__object">
                <span className="sd-poster__ghost" aria-hidden="true">
                  {lead.designation}
                </span>
                <CardPlate size="lg" designation={lead.designation} href={`/card/${lead.designation}`} />
              </div>
            )}
          </div>
        </div>
      </section>

      {view?.voting.window && candidates.length > 0 && (
        <section className="sd-container sd-chapter-block">
          <Chapter
            n="01"
            title="Sky over Node 01"
            aside={`${localTime(view.voting.window.dusk)} – ${localTime(view.voting.window.dawn)}`}
          />
          <TonightSkyChart
            window={view.voting.window}
            candidates={candidates}
            lead={lead?.designation ?? null}
            timezone={node.timezone}
            now={now}
          />
        </section>
      )}

      {view && (
        <section className="sd-container sd-chapter-block">
          <Chapter
            n="02"
            title={`Vote · ${nightLabel(view.voting.night)}`}
            aside={`${cast} weighted ${cast === 1 ? 'vote' : 'votes'}`}
          />
          {view.voting.carried ? (
            <p className="sd-note">
              {view.voting.carried} takes this night, carried from a night lost to cloud. Votes count from the next.
            </p>
          ) : candidates.length === 0 ? (
            <p className="sd-note">Nothing in the set clears the horizon for Node 01 that night.</p>
          ) : (
            <>
              <p className="sd-strip-note">One vote per holder · weighted by the rarity of every card held</p>
              <ol className="sd-ballot">
                {candidates.map((c, i) => {
                  const share = cast ? c.votes / cast : 0;
                  return (
                    <li key={c.designation} className="sd-ballot__row" data-rarity={rarityOf(c.rarity)}>
                      <span className="sd-ballot__rank">{String(i + 1).padStart(2, '0')}</span>
                      <ObjectArt designation={c.designation} className="sd-ballot__art" />
                      <div className="sd-ballot__main">
                        <Link href={`/card/${c.designation}`} className="sd-ballot__name">
                          {c.name}
                        </Link>
                        <span className="sd-data">
                          {c.altitudeDeg.toFixed(0)}° at {localTime(c.at)}
                        </span>
                        <span className="sd-ballot__bar" aria-hidden="true">
                          <span style={{ width: `${Math.round(share * 100)}%` }} />
                        </span>
                      </div>
                      <span className="sd-ballot__votes">
                        {c.votes}
                        <small>{cast ? `${Math.round(share * 100)}%` : 'votes'}</small>
                      </span>
                      <div className="sd-ballot__act">
                        <SideraVote designation={c.designation} name={c.name} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>
      )}

      {view && view.recent.length > 0 && (
        <section className="sd-container sd-chapter-block">
          <Chapter n="03" title="Past nights" />
          <ol className="sd-nights">
            {view.recent.map((r) => (
              <li key={r.night} className="sd-nights__item" data-result={r.result}>
                <Link href={`/card/${r.designation}`}>
                  <ObjectArt designation={r.designation} className="sd-nights__art" />
                  <span className="sd-label">{r.night}</span>
                  <span className="sd-nights__name">{r.name}</span>
                  <span className="sd-nights__result">{RESULT[r.result]}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!view && (
        <section className="sd-container sd-chapter-block">
          <p className="sd-note">The night’s record cannot be read right now.</p>
        </section>
      )}
    </SideraShell>
  );
}
