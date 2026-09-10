import type { Metadata } from 'next';
import Link from 'next/link';
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
    <PageContainer variant="wide" className="py-6 pb-16 sm:py-10">
      <BackButton />

      <header className="obs-sim-head">
        <div className="min-w-0">
          <p className="obs-eyebrow">
            <span className="obs-led obs-led--nominal" aria-hidden="true" />
            <span className="font-display">Simulator</span> · {node.name} · {node.site}
          </p>
          <h1 className="obs-h1 obs-h1--sim mt-3">Drive the instrument.</h1>
          <p className="obs-lede">
            {node.instrument.optics} and a {node.instrument.camera} on a roof in {node.site}.
            Real field of view, real slew times, real refusals. No account needed.
          </p>
        </div>
        <dl className="obs-sim-head__figures">
          <div>
            <dt className="obs-label">aperture</dt>
            <dd className="obs-sim-head__figure">{node.instrument.apertureMm}<span> mm</span></dd>
          </div>
          <div>
            <dt className="obs-label">native</dt>
            <dd className="obs-sim-head__figure">
              f/{(node.instrument.focalLengthMm / node.instrument.apertureMm).toFixed(0)}
            </dd>
          </div>
          <div>
            <dt className="obs-label">plate scale</dt>
            <dd className="obs-sim-head__figure">{fov.plateScaleArcsecPx.toFixed(2)}<span>″/px</span></dd>
          </div>
        </dl>
      </header>

      <div className="mt-8">
        <SessionConsole node={node} cloudCover={node.readiness.cloudCover} />
      </div>

      <div className="obs-sim-foot">
        <details className="max-w-2xl">
          <summary className="obs-label cursor-pointer">How the frame is built</summary>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Public-domain NASA and ESA imagery supplies the content. Everything else is computed:
            the target is scaled to its true angular size at the current focal length, smeared by
            the seeing, shifted frame to frame by the same turbulence, lifted by the site&apos;s sky
            glow and buried in sensor noise. As the stack builds, the turbulence averages out and
            the image walks toward the aperture&apos;s diffraction limit, which it never beats. This
            is a simulation of what a 150 mm telescope shows, not a claim about what it captured.
          </p>
        </details>
        <Link href={`/observatory/${node.id}`} className="obs-action obs-action--primary">
          Hold a slot on {node.name}
        </Link>
      </div>
    </PageContainer>
  );
}
