import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';

export const metadata: Metadata = {
  title: 'Sidera — closed beta',
  description: 'Sidera is in a closed beta. Entry is by invitation.',
  robots: { index: false },
};

export default function InvitePage() {
  return (
    <SideraShell title="Closed beta">
      <section className="sd-container sd-top">
        <div className="sd-gate">
          <p className="sd-eyebrow">Closed beta</p>
          <p className="sd-lede">Sidera opens through an invitation link. If you hold one, open it on this device.</p>
        </div>
      </section>
    </SideraShell>
  );
}
