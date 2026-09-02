import type { Metadata } from 'next';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import SessionConsole from '@/components/observatory/SessionConsole';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';
import { fieldOfView } from '@/lib/observatory/optics';

export const metadata: Metadata = {
  title: 'Telescope simulator — Stellar',
  description:
    'Drive a simulated 150 mm telescope with real field of view, real slew times and a real safety envelope. Nothing here is a photograph presented as your own.',
};

export const revalidate = 300;

export default async function SimulatorPage() {
  const [node] = await getNodesWithReadiness();
  const fov = fieldOfView(node.instrument);

  return (
    <PageContainer variant="wide" className="py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Telescope simulator
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          {node.instrument.optics} with a {node.instrument.camera}, at {node.site}. The field
          of view, the slew times, the stacking and the refusals are the real ones. Point it
          anywhere it will let you.
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Framing <span className="font-mono">{fov.widthArcmin.toFixed(1)}′ × {fov.heightArcmin.toFixed(1)}′</span>{' '}
          at <span className="font-mono">{fov.plateScaleArcsecPx.toFixed(2)}″</span> per pixel — narrower
          than the full Moon. Most of what this teaches is how small things really are.
        </p>
      </header>

      <div className="mt-6">
        <SessionConsole node={node} cloudCover={node.readiness.cloudCover} />
      </div>

      <p className="mt-8 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
        Reference imagery is public-domain NASA, ESA and Hubble material, scaled to the true
        angular size the target would present in this instrument and degraded by the site&apos;s
        seeing, sky glow and sensor noise. It is a simulation of what a 150 mm telescope shows,
        not a claim about what it captured.
      </p>
    </PageContainer>
  );
}
