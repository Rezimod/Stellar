'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { Telescope } from 'lucide-react';
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
  const tNetwork = useTranslations('observatory.network');
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

  const first = OPERATOR_TIERS[0];
  const last = OPERATOR_TIERS[OPERATOR_TIERS.length - 1];

  return (
    <>
      <section className="obs-scene">
        <div className="obs-scene__body">
          <div className="obs-float obs-float--main">
            <div className="obs-float__head">
              <span className="obs-float__node">
                <Telescope size={18} strokeWidth={1.75} aria-hidden="true" />
                {t('keepTitle')}
              </span>
              <span className="obs-pill obs-pill--live">
                {Math.round(first.operatorShare * 100)}% → {Math.round(last.operatorShare * 100)}%
              </span>
            </div>

            <h1 className="obs-float__title">{t('title')}</h1>
            <p className="obs-float__text">{t('lead')}</p>

            <div className="obs-float__rule" />

            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('keepLead')}</p>

            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[t('colTier'), t('colHours'), t('colKeep'), t('colPerSession')].map((head, i) => (
                    <th
                      key={head}
                      className={`obs-label border-b pb-2 pl-3 font-normal ${i === 0 ? 'pl-0 text-left' : 'text-right'}`}
                      style={{ borderColor: 'var(--obs-float-border)' }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OPERATOR_TIERS.map((tier) => (
                  <tr key={tier.id}>
                    <td className="border-b py-2.5" style={{ borderColor: 'var(--obs-float-border)', color: 'var(--text-primary)' }}>
                      {tTier(tier.id)}
                    </td>
                    <td className="border-b py-2.5 pl-3 text-right font-mono" style={{ borderColor: 'var(--obs-float-border)', color: 'var(--text-secondary)' }}>
                      {tier.minHours}
                    </td>
                    <td className="border-b py-2.5 pl-3 text-right font-mono" style={{ borderColor: 'var(--obs-float-border)', color: 'var(--text-primary)' }}>
                      {Math.round(tier.operatorShare * 100)}%
                    </td>
                    <td className="border-b py-2.5 pl-3 text-right font-mono" style={{ borderColor: 'var(--obs-float-border)', color: 'var(--text-secondary)' }}>
                      {Math.round(40 * tier.operatorShare)} ₾
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="obs-float__text" style={{ fontSize: '13px' }}>{t('keepNote')}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#register" className="obs-ghost obs-ghost--primary">
                {t('register')}
              </a>
              <Link href="/observatory/simulator" className="obs-ghost">
                {tNetwork('tryCta')}
              </Link>
            </div>
          </div>

          <div className="obs-scene__object obs-scene__object--photo">
            <Image src="/hero/nebula.jpg" alt="" fill sizes="(max-width: 900px) 80vw, 40rem" priority />
          </div>
        </div>

        <div className="obs-dock obs-dock--wrap" aria-label={t('needsTitle')}>
          <div className="obs-dock__seg" style={{ maxWidth: '16rem' }}>
            <span className="obs-dock__label">{t('needsTitle')}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('needsNote')}</span>
          </div>
          {(['needs1', 'needs2', 'needs3'] as const).map((key, i) => (
            <div key={key} className="obs-dock__seg obs-dock__way" style={{ maxWidth: '20rem' }}>
              <span className="obs-dock__way-n font-display">{String(i + 1).padStart(2, '0')}</span>
              <span className="obs-dock__way-line" style={{ color: 'var(--text-primary)', whiteSpace: 'normal' }}>
                {t(key)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <PageContainer variant="fullscreen" className="obs-below">
        {nodes.map((node) => (
          <EarningsPanel key={node.id} node={node} t={t} tTier={tTier} />
        ))}

        <OperatorInterestForm />

        <p className="obs-more" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <span>
            {t('simFooter')}{' '}
            <Link href="/observatory/simulator">{t('simLink')}</Link>{' '}
            {t('proofFooter')}{' '}
            <Link href="/observatory/how-it-works">{t('proofLink')}</Link>.
          </span>
        </p>
      </PageContainer>
    </>
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
    <section className="obs-float obs-float--section">
      <div className="obs-float__head">
        <h2 className="obs-card__title" style={{ fontSize: '1.0625rem' }}>{node.name}</h2>
        <span className="obs-pill">{tTier(earnings.tier.id)}</span>
      </div>

      <p className="obs-band__figure mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
        {lari(earnings.monthTetri)}<span style={{ fontFamily: 'var(--font-body)', fontSize: '0.5em' }}> ₾</span>
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
