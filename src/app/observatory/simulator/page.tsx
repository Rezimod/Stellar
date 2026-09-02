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
          Bare at f/10 the sensor frames{' '}
          <span className="font-mono">{fov.widthArcmin.toFixed(1)}′ × {fov.heightArcmin.toFixed(1)}′</span>{' '}
          at <span className="font-mono">{fov.plateScaleArcsecPx.toFixed(2)}″</span> per pixel, which
          undersamples this scope — so planetary work runs a Barlow and crops the read-out to a
          few hundred pixels, exactly as capture software does. Choosing a target sets the train
          the way an observer would, and you can override it.
        </p>
      </header>

      <div className="mt-6">
        <SessionConsole node={node} cloudCover={node.readiness.cloudCover} />
      </div>

      <p className="mt-8 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
        Reference imagery is public-domain NASA, ESA and Hubble material, scaled to the true
        angular size the target presents at the current focal length, then degraded to what this
        aperture and this sky can actually deliver: smeared by the seeing, shifted frame to frame
        by the same turbulence, lifted by the site&apos;s sky glow and buried in sensor noise. As
        the stack builds, the turbulence averages out and the image walks toward the aperture&apos;s
        diffraction limit — which it never beats. That is what a 150 mm telescope shows. It is not
        a claim about what it captured.
      </p>
    </PageContainer>
  );
}
