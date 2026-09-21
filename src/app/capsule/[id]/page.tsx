import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CardPlate from '@/components/sidera/CardPlate';
import SideraOpen from '@/components/sidera/SideraOpen';
import SideraShell from '@/components/sidera/SideraShell';
import SideraVerify from '@/components/sidera/SideraVerify';
import DataRow from '@/components/sidera/ui/DataRow';
import Rule from '@/components/sidera/ui/Rule';
import { getDb } from '@/lib/db';
import { isRarity, type Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import type { OpenedOutcome } from '@/lib/sidera/audit';
import { readFullLog } from '@/lib/sidera/capsule';
import { verifyCapsule } from '@/lib/sidera/randomness';
import { isUuid } from '@/lib/sidera/route-guards';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Capsule',
  description: 'One capsule’s public record: what was committed to, what was drawn, and whether it checks out.',
};

const pad = (n: number) => String(n).padStart(3, '0');

export default async function CapsuleRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const db = getDb();
  if (!db) {
    return (
      <SideraShell>
        <section className="sd-container sd-page">
          <h1 className="sd-page__title">Capsule</h1>
          <p className="sd-note">The record cannot be read at the moment.</p>
        </section>
      </SideraShell>
    );
  }

  const entries = await readFullLog(db, { capsuleId: id });
  if (entries.length === 0) notFound();

  const listed = entries.find((e) => e.event === 'listed');
  const purchased = entries.find((e) => e.event === 'purchased');
  const opened = entries.find((e) => e.event === 'opened');
  const closed = entries.find((e) => e.event === 'voided' || e.event === 'released');
  const sequence = entries.find((e) => e.capsuleSequence !== null)?.capsuleSequence ?? null;

  const outcome = opened ? (opened.outcome as OpenedOutcome) : null;
  const closedOutcome = closed ? (closed.outcome as { secret: string | null; reason: string }) : null;
  const verification =
    outcome && listed && purchased
      ? verifyCapsule({
          commitment: listed.commitment ?? '',
          secret: outcome.secret,
          nonce: purchased.buyerNonce ?? '',
          capsuleId: id,
          pulls: outcome.pulls,
          supply: outcome.supply,
          draws: outcome.draws,
          oddsBps: outcome.oddsBps,
        })
      : null;

  return (
    <SideraShell>
      <section className="sd-container sd-page">
        <Link href="/capsules/log" className="sd-back">
          The log
        </Link>
        <div className="sd-page__head">
          <div>
            <p className="sd-eyebrow">Public record</p>
            <h1 className="sd-page__title">Capsule {sequence ?? ''}</h1>
          </div>
          <span className="sd-verdict">
            {verification ? (verification.ok ? 'Checks out' : 'Does not check out') : closed ? (closed.event === 'voided' ? 'Withdrawn' : 'Released') : opened ? 'Opened' : purchased ? 'Bought, not opened' : 'On sale'}
          </span>
        </div>

        <div className="sd-section">
          <h2 className="sd-section__title">What was fixed, and when</h2>
          <DataRow
            layout="stacked"
            items={[
              { label: 'Commitment', value: listed?.commitment ?? '—' },
              { label: 'Listed', value: listed ? listed.at.replace('T', ' ').slice(0, 19) : '—' },
              { label: 'Buyer nonce', value: purchased?.buyerNonce ?? 'Not bought yet' },
              { label: 'Purchase hash', value: purchased?.purchaseHash ?? '—' },
              {
                label: 'Secret',
                value: outcome?.secret ?? closedOutcome?.secret ?? 'Sealed until it is opened',
              },
              { label: 'Draws', value: outcome ? outcome.draws : '—' },
            ]}
          />
        </div>

        {closed && (
          <p className="sd-note">
            {closed.event === 'voided' ? 'Withdrawn' : 'Released back to the sale'} on{' '}
            {closed.at.replace('T', ' ').slice(0, 19)} — {closedOutcome?.reason ?? 'no reason logged'}. It can no longer
            be bought or opened.
          </p>
        )}

        {purchased && !opened && !closed && <SideraOpen capsuleId={id} />}

        {outcome && (
          <div className="sd-section">
            <h2 className="sd-section__title">What came out</h2>
            <ul className="sd-grid">
              {outcome.pulls.map((p) => {
                const authored = SET_001_CARD_BY_DESIGNATION.get(p.designation);
                return (
                  <li key={p.drawIndex}>
                    <CardPlate
                      designation={p.designation}
                      name={authored?.seed.name ?? p.designation}
                      rarity={isRarity(p.rarity) ? (p.rarity as Rarity) : 'common'}
                      artUrl={authored?.seed.artUrl ?? '/cards/placeholder.svg'}
                      href={`/card/${p.designation}`}
                      data={[{ label: 'Edition', value: `No. ${pad(p.editionNumber)}` }]}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {verification && !verification.ok && (
          <p className="sd-note">{verification.problems.join('; ')}</p>
        )}

        <Rule />
        <p className="sd-note">The secret was fixed before the sale, the nonce by the buyer after. Together they recompute every draw.</p>
        <SideraVerify capsuleId={id} />
      </section>
    </SideraShell>
  );
}
