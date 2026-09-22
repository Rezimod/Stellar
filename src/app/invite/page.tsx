import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';
import PageHead from '@/components/sidera/ui/PageHead';

export const metadata: Metadata = {
  title: 'Sidera — closed beta',
  description: 'Sidera is in a closed beta. Entry is by invitation.',
  robots: { index: false },
};

export default function InvitePage() {
  return (
    <SideraShell>
      <PageHead index="00" section="Closed beta" meta="Sidera" eyebrow="Closed beta" title="By invitation." sub="Sidera opens through an invitation link." />
    </SideraShell>
  );
}
