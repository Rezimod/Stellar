'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('observatory.operator');
  const tTier = useTranslations('observatory.tiers');
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
          {t('title')}
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('lead')}
        </p>
      </header>

      {nodes.map((node) => (
        <EarningsPanel key={node.id} node={node} t={t} tTier={tTier} />
      ))}

      <section className="mt-8">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('keepTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('keepLead')}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                {[t('colTier'), t('colHours'), t('colKeep'), t('colPerSession')].map((head) => (
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
                    {tTier(tier.id)}
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
          {t('keepNote')}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('needsTitle')}
        </h2>
        <ul
          className="mt-3 flex max-w-2xl flex-col gap-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <li>{t('needs1')}</li>
          <li>{t('needs2')}</li>
          <li>{t('needs3')}</li>
        </ul>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('needsNote')}
        </p>
      </section>

      <OperatorInterestForm />

      <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('simFooter')}{' '}
        <Link href="/observatory/simulator" className="underline">
          {t('simLink')}
        </Link>{' '}
        {t('proofFooter')}{' '}
        <Link href="/observatory/how-it-works" className="underline">
          {t('proofLink')}
        </Link>
        .
      </p>
    </PageContainer>
  );
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

function EarningsPanel({
  node,
  t,
  tTier,
}: {
  node: OperatorNode;
  t: Translator;
  tTier: Translator;
}) {
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
          {tTier(earnings.tier.id)}
        </span>
      </div>

      <p className="mt-4 text-3xl" style={{ color: 'var(--text-primary)' }}>
        <span className="font-mono">{lari(earnings.monthTetri)}</span> ₾
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('earnedMonth')} · {t('lifetime', { amount: lari(earnings.lifetimeTetri) })} ·{' '}
        {t('hoursDelivered', { hours: earnings.hoursDelivered.toFixed(1) })}
      </p>

      {earnings.next && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('toNext', {
            hours: earnings.next.hoursRemaining.toFixed(1),
            tier: tTier(earnings.next.tier.id),
            pct: Math.round(earnings.next.tier.operatorShare * 100),
          })}
        </p>
      )}

      {earnings.dryRun && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('dryRunNote', { name: node.name })}
        </p>
      )}
    </section>
  );
}
