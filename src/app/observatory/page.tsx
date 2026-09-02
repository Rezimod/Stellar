import type { Metadata } from 'next';
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
  const nodes = await getNodesWithReadiness();
  const observable = nodes.filter((n) => n.readiness.state === 'online').length;

  return (
    <PageContainer variant="wide" className="py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Observatory
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          Book time on a real telescope and watch a real object, live. When your sky is
          clouded over, someone else&apos;s is not.
        </p>
      </header>

      <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
          {nodes.length}
        </span>{' '}
        {nodes.length === 1 ? 'instrument' : 'instruments'} on the network ·{' '}
        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
          {observable}
        </span>{' '}
        observable right now
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
          No instruments are listed yet. The first node comes online with the beta.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}

      <section
        className="mt-8 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Own a telescope that sits idle?
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Most instruments are used a handful of nights a year. Put yours on the network
          and it earns on the clear nights you are not out with it. Listing opens with the
          beta.
        </p>
      </section>
    </PageContainer>
  );
}
