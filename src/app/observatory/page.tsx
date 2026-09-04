import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import NodeCard from '@/components/observatory/NodeCard';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';

export const metadata: Metadata = {
  title: 'Observatory — Stellar',
  description:
    'Book time on a real telescope. Watch a real object, live, through an instrument somewhere the sky is clear.',
};

// Readiness depends on the Sun and the weather, so the page cannot be static —
// but it changes on the scale of minutes, not requests.
export const revalidate = 300;

export default async function ObservatoryPage() {
  const t = await getTranslations('observatory.network');
  const nodes = await getNodesWithReadiness();
  const observable = nodes.filter((n) => n.readiness.state === 'online').length;

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
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/observatory/how-it-works" className="underline" style={{ color: 'var(--text-secondary)' }}>
            {t('proofLink')}
          </Link>
          <Link href="/observatory/captures" className="underline" style={{ color: 'var(--text-secondary)' }}>
            {t('capturesLink')}
          </Link>
          <Link href="/observatory/requests" className="underline" style={{ color: 'var(--text-secondary)' }}>
            {t('requestsLink')}
          </Link>
          <Link href="/first-light" className="underline" style={{ color: 'var(--text-secondary)' }}>
            {t('firstLightLink')}
          </Link>
        </div>
      </header>

      <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('instrumentCount', { count: nodes.length })} · {t('observableNow', { count: observable })}
      </p>

      {nodes.length === 0 ? (
        <p
          className="mt-6 rounded-xl border p-5 text-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          {t('empty')}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}

      <section
        className="mt-6 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('tryTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('tryLead')}
        </p>
        <Link
          href="/observatory/simulator"
          className="mt-3 inline-block rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          {t('tryCta')}
        </Link>
      </section>

      <section
        className="mt-4 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('ownerTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('ownerLead')}
        </p>
        <Link
          href="/observatory/operator"
          className="mt-3 inline-block rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          {t('ownerCta')}
        </Link>
      </section>
    </PageContainer>
  );
}
