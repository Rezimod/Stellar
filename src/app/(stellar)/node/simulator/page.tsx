import type { Metadata } from 'next';
import Link from 'next/link';
import SessionConsole from '@/components/observatory/SessionConsole';
import SideraShell from '@/components/sidera/SideraShell';
import Chapter from '@/components/sidera/ui/Chapter';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';
import '../../observatory/observatory.css';
import '../../../node/node.css';

export const metadata: Metadata = {
  title: 'Simulator — Node 01',
  description:
    'Drive a simulated Node 01: a 150 mm telescope with its real field of view, slew times and safety envelope. Computed, not captured.',
};

export const revalidate = 300;

export default async function NodeSimulatorPage() {
  const [node] = await getNodesWithReadiness();

  return (
    <SideraShell>
      <div className="sd-sim-rail">
        <div className="sd-container sd-sim-rail__inner">
          <nav aria-label="Breadcrumb" className="sd-crumb">
            <Link href="/node">Observatory</Link>
            <span aria-hidden="true">/</span>
            <strong>Simulator</strong>
          </nav>
          <span className="sd-label">Computed, not captured · Node 01 is {node.status}</span>
        </div>
      </div>

      <div className="obs sd-sim">
        <SessionConsole node={{ ...node, name: 'Node 01' }} cloudCover={node.readiness.cloudCover} />
      </div>

      <section className="sd-container sd-chapter-block sd-node-last">
        <Chapter n="01" title="How the frame is computed" />
        <div className="sd-sim-how">
          <p>
            Public-domain NASA and ESA imagery supplies the object. Everything else is computed: it is scaled to its true angular
            size at the current focal length, smeared by the seeing, shifted frame to frame by the same turbulence, lifted by the
            city’s sky glow and buried in sensor noise.
          </p>
          <p>
            As the stack builds, the turbulence averages out and the image walks toward the aperture’s diffraction limit, which it
            never beats. This is what a 150 mm telescope shows, not a claim about what Node 01 captured.
          </p>
        </div>
      </section>
    </SideraShell>
  );
}
