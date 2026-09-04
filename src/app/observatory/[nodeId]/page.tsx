import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import ReadinessBadge from '@/components/observatory/ReadinessBadge';
import SlotPicker from '@/components/observatory/SlotPicker';
import { SimNodeAdapter } from '@/lib/observatory/adapter';
import { getNode } from '@/lib/observatory/nodes';
import { fieldOfView, focalRatio, resolvingPowerArcsec } from '@/lib/observatory/optics';

type Params = { params: Promise<{ nodeId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const node = getNode((await params).nodeId);
  if (!node) return { title: 'Instrument not found — Stellar' };

  return {
    title: `${node.name} — Stellar Observatory`,
    description: `${node.instrument.optics} and a ${node.instrument.camera} in ${node.site}. See when the sky is dark over the site and hold a slot.`,
  };
}

// Readiness moves with the Sun and the weather, not with the request.
export const revalidate = 300;

export default async function NodePage({ params }: Params) {
  const node = getNode((await params).nodeId);
  if (!node) notFound();

  const readiness = await new SimNodeAdapter().getReadiness(node);
  const { instrument } = node;
  const fov = fieldOfView(instrument);

  return (
    <PageContainer variant="wide" className="py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            {node.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {node.site} · Bortle {node.bortle} · {node.timezone.replace('_', ' ')}
          </p>
        </div>
        <ReadinessBadge readiness={readiness} />
      </header>

      {readiness.detail && (
        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {readiness.detail}
        </p>
      )}

      <section
        className="mt-6 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          The instrument
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Spec label="Optics" value={instrument.optics} />
          <Spec label="Camera" value={instrument.camera} />
          <Spec label="Aperture" value={`${instrument.apertureMm} mm`} mono />
          <Spec label="Focal ratio" value={`f/${focalRatio(instrument).toFixed(0)}`} mono />
          <Spec
            label="Field of view"
            value={`${fov.widthArcmin.toFixed(1)}′ × ${fov.heightArcmin.toFixed(1)}′`}
            mono
          />
          <Spec label="Plate scale" value={`${fov.plateScaleArcsecPx.toFixed(2)}″/px`} mono />
          <Spec label="Resolves to" value={`${resolvingPowerArcsec(instrument).toFixed(2)}″`} mono />
          <Spec label="Mount" value={instrument.mount} />
        </dl>
        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Best for {instrument.suitedTo.join(' · ')}. The full Moon does not fit this field;
          planets sit inside a few percent of it.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Hold a slot
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Only the hours when the sky is dark over {node.site} and the operator is taking work
          are shown.{' '}
          {node.status !== 'active' && (
            <>
              {node.name} is still being commissioned, so a held slot is a place in the queue
              rather than a confirmed session — you will be told before anything is charged.
            </>
          )}
        </p>

        <SlotPicker
          nodeId={node.id}
          timezone={node.timezone}
          sessionMinutes={node.sessionMinutes}
          priceGel={node.priceGel}
        />
      </section>

      <section
        className="mt-8 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          See what it would show you
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          The simulator drives this same optical train — the field of view above, the real
          slew times, and the same safety envelope that will refuse a target too low or too
          close to the Sun.
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
          Open the simulator
        </Link>
      </section>

      <section
        className="mt-4 rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Not awake at three in the morning?
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Ask for the object instead of the hour. Name what you want photographed and how
          long you will wait, and the instrument works your request on the first night the
          sky allows it — between the sessions people booked to drive themselves.
        </p>
        <Link
          href="/observatory/requests"
          className="mt-3 inline-block rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          Ask for a photograph
        </Link>
      </section>
    </PageContainer>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </dd>
    </div>
  );
}
