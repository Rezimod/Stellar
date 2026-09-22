import type { Metadata } from 'next';
import Link from 'next/link';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';
import Chapter from '@/components/sidera/ui/Chapter';
import PageHead from '@/components/sidera/ui/PageHead';
import { getDb } from '@/lib/db';
import { auditLog, type LogRow } from '@/lib/sidera/audit';
import { readFullLog } from '@/lib/sidera/capsule';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The log',
  description: 'Every capsule listed, bought, opened, released and withdrawn, in the order it happened.',
};

const EVENT: Record<LogRow['event'], string> = {
  listed: 'Listed',
  purchased: 'Bought',
  opened: 'Opened',
  voided: 'Withdrawn',
  released: 'Released',
  refund_due: 'Refund due',
  card_sold: 'Card sold',
};

function detail(row: LogRow): string {
  const o = row.outcome as Record<string, unknown> | null;
  if (row.event === 'opened' && o && Array.isArray(o.pulls)) {
    return (o.pulls as Array<{ designation: string; editionNumber: number }>)
      .map((p) => `${p.designation} ${String(p.editionNumber).padStart(3, '0')}`)
      .join(', ');
  }
  if (row.event === 'card_sold' && o) return `${o.designation} ${String(o.editionNumber).padStart(3, '0')}`;
  if (o && typeof o.reason === 'string') return o.reason;
  if (row.event === 'listed' && row.commitment) return `${row.commitment.slice(0, 16)}…`;
  if (row.event === 'purchased' && row.buyerNonce) return `nonce ${row.buyerNonce.slice(0, 16)}…`;
  return '';
}

export default async function LogPage() {
  const db = getDb();
  let entries: LogRow[] | null = null;
  if (db) {
    try {
      entries = await readFullLog(db);
    } catch (err) {
      console.error('[sidera] cannot read the log', err);
    }
  }
  const audit = entries ? auditLog(entries) : null;
  const newestFirst = entries ? [...entries].sort((a, b) => b.seq - a.seq) : [];

  return (
    <SideraShell>
      <PageHead
        index="03"
        section={
          <>
            <Link href="/capsules">Capsules</Link> / Log
          </>
        }
        meta="Append only"
        eyebrow="Nothing is taken on trust"
        title="The log."
        sub="Every capsule listed, bought, opened, released and withdrawn, numbered in the order it happened and never rewritten. A capsule quietly removed would leave its number behind."
      >
        {audit && (
          <DataRow
            className="sd-facts"
            items={[
              { label: 'Listed', value: audit.listed },
              { label: 'Bought', value: audit.purchased },
              { label: 'Opened', value: audit.opened },
              { label: 'Verified', value: `${audit.verified} / ${audit.opened}` },
              { label: 'Flags', value: audit.flags.length },
            ]}
          />
        )}
        {audit && audit.flags.length > 0 && (
          <ul className="sd-alert">
            {audit.flags.map((f, i) => (
              <li key={i}>
                {f.kind}: {f.detail}
              </li>
            ))}
          </ul>
        )}
      </PageHead>

      <section className="sd-container sd-chapter-block">
        <Chapter n="01" title="Entries" aside={entries ? `${entries.length} logged` : undefined} />

        {entries === null && <p className="sd-note">The log cannot be read at the moment.</p>}
        {entries?.length === 0 && <p className="sd-note">Nothing has been logged yet.</p>}
        {newestFirst.length > 0 && (
          <div className="sd-scroll">
            <table className="sd-log sd-log--mid">
              <thead>
                <tr>
                  <th scope="col">Seq</th>
                  <th scope="col">Capsule</th>
                  <th scope="col">Event</th>
                  <th scope="col">Detail</th>
                  <th scope="col">UTC</th>
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((r) => (
                  <tr key={r.seq}>
                    <td>{r.seq}</td>
                    <td>
                      {r.capsuleId ? (
                        <Link href={`/capsule/${r.capsuleId}`} className="sd-link">
                          {r.capsuleSequence ?? '—'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{EVENT[r.event]}</td>
                    <td>{detail(r)}</td>
                    <td>{r.at.replace('T', ' ').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SideraShell>
  );
}
