'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import OperatorInterestForm from '@/components/observatory/OperatorInterestForm';
import { useStellarUser } from '@/hooks/useStellarUser';
import { lari, type OperatorEarnings } from '@/lib/observatory/earnings';
import { OPERATOR_TIERS } from '@/lib/observatory/operator-tiers';

type OperatorNode = {
  id: string;
  name: string;
  site: string;
  priceGel: number;
  sessionMinutes: number;
  earnings: OperatorEarnings;
};

export default function OperatorPage() {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready } = useStellarUser();

  const [nodes, setNodes] = useState<OperatorNode[]>([]);

  // The ladder is the offer, not a query result: it renders from the constant
  // so an owner sees the terms even if they are signed out, offline, or the
  // earnings call fails. Only the earnings need the network.
  const load = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/observatory/operator', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNodes(data.nodes as OperatorNode[]);
    } catch {
      // An owner who cannot reach the ledger still gets the terms above.
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return (
    <PageContainer variant="wide" className="py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Put your telescope to work
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          Most instruments are used a handful of nights a year. On the clear nights you are not
          out with yours, someone else can be — and you are paid for it.
        </p>
      </header>

      {nodes.map((node) => (
        <EarningsPanel key={node.id} node={node} />
      ))}

      <section className="mt-8">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          What you keep
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your share rises with hours actually delivered — not nights listed, not a
          subscription. An instrument that has run 150 hours of other people&apos;s sessions has
          been aligned, cleaned and unparked 150 hours&apos; worth, and that is the only number
          worth paying for.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                {['Tier', 'Delivered hours', 'You keep', 'Per 40 ₾ session'].map((head) => (
                  <th
                    key={head}
                    className="border-b px-3 py-2 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OPERATOR_TIERS.map((tier) => (
                <tr key={tier.id}>
                  <td
                    className="border-b px-3 py-2"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {tier.name}
                  </td>
                  <td
                    className="border-b px-3 py-2 font-mono"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {tier.minHours}
                  </td>
                  <td
                    className="border-b px-3 py-2 font-mono"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {Math.round(tier.operatorShare * 100)}%
                  </td>
                  <td
                    className="border-b px-3 py-2 font-mono"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {Math.round(40 * tier.operatorShare)} ₾
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          At three sessions a night on a hundred clear nights, a Node Kit pays for itself inside
          the first season. A session that clouds out refunds the customer in full and costs you
          nothing.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          What a node needs
        </h2>
        <ul
          className="mt-3 flex max-w-2xl flex-col gap-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <li>A computerised GoTo mount, and somewhere it can stay set up.</li>
          <li>A camera and a mini-PC — the Node Kit is both, pre-flashed.</li>
          <li>A network connection, and a horizon you would observe from yourself.</li>
        </ul>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          If you already run ASCOM, Alpaca or INDI, the agent installs on what you have and you
          skip the kit entirely.
        </p>
      </section>

      <OperatorInterestForm />

      <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Want to see what a session looks like from the customer&apos;s side first?{' '}
        <Link href="/observatory/simulator" className="underline">
          The simulator is open.
        </Link>{' '}
        What the network does with a frame your instrument takes is written out in{' '}
        <Link href="/observatory/how-it-works" className="underline">
          how a capture is proved
        </Link>
        .
      </p>
    </PageContainer>
  );
}

function EarningsPanel({ node }: { node: OperatorNode }) {
  const { earnings } = node;

  return (
    <section
      className="mt-6 rounded-xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {node.name}
        </h2>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {earnings.tier.name}
        </span>
      </div>

      <p className="mt-4 text-3xl" style={{ color: 'var(--text-primary)' }}>
        <span className="font-mono">{lari(earnings.monthTetri)}</span> ₾
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        earned this month ·{' '}
        <span className="font-mono">{lari(earnings.lifetimeTetri)}</span> ₾ in total ·{' '}
        <span className="font-mono">{earnings.hoursDelivered.toFixed(1)}</span> hours delivered
      </p>

      {earnings.next && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono">{earnings.next.hoursRemaining.toFixed(1)}</span> hours to{' '}
          {earnings.next.tier.name}, which keeps{' '}
          <span className="font-mono">{Math.round(earnings.next.tier.operatorShare * 100)}%</span>.
        </p>
      )}

      {earnings.dryRun && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nothing has settled yet. {node.name} runs on the simulator until the instrument is
          wired, and simulated sessions pay nothing and count for nothing — the figures above
          start moving the night it goes live.
        </p>
      )}
    </section>
  );
}
