import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';

export const metadata: Metadata = {
  title: 'Sidera — closed beta',
  description: 'Sidera is in a closed beta. Entry is by invitation.',
  robots: { index: false },
};

export default function InvitePage() {
  return (
    <SideraShell>
      <section className="sd-hero">
        <div className="sd-sky" aria-hidden="true" />
        <div className="sd-container">
          <p className="sd-eyebrow">Closed beta</p>
          <h1 className="sd-display" style={{ maxWidth: '14ch' }}>
            By invitation.
          </h1>
          <p className="sd-hero__sub">Sidera opens through an invitation link.</p>
        </div>
      </section>
    </SideraShell>
  );
}
