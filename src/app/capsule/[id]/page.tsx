import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SideraOpen from '@/components/sidera/SideraOpen';
import SideraShell from '@/components/sidera/SideraShell';
import SideraVerify from '@/components/sidera/SideraVerify';
import DataRow from '@/components/sidera/ui/DataRow';
import Rule from '@/components/sidera/ui/Rule';
import { getDb } from '@/lib/db';
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
  const sequence = entries.find((e) => e.capsuleSequence !== null)?.capsuleSequence ?? null;

  const outcome = opened ? (opened.outcome as OpenedOutcome) : null;
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
          <h1 className="sd-page__title">Capsule {sequence ?? ''}</h1>
          {verification && (
            <span className="sd-verdict">{verification.ok ? 'Checks out' : 'Does not check out'}</span>
          )}
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
              { label: 'Secret', value: outcome?.secret ?? 'Sealed until it is opened' },
              { label: 'Draws', value: outcome ? outcome.draws : '—' },
            ]}
          />
        </div>

        {purchased && !opened && <SideraOpen capsuleId={id} />}

        {outcome && (
          <div className="sd-section">
            <h2 className="sd-section__title">What came out</h2>
            <DataRow
              layout="stacked"
              items={outcome.pulls.map((p) => ({
                label: `Draw ${p.drawIndex + 1}`,
                value: `${p.designation} · ${pad(p.editionNumber)} · ${p.rarity}`,
              }))}
            />
          </div>
        )}

        {verification && !verification.ok && (
          <p className="sd-note">{verification.problems.join('; ')}</p>
        )}

        <Rule />
        <p className="sd-note">
          The secret was committed to before the capsule was on sale; the nonce was drawn by the buyer after it. Anyone
          can recompute the draws from the two, and check each edition number against the supply logged with them.
        </p>
        <SideraVerify capsuleId={id} />
      </section>
    </SideraShell>
  );
}
