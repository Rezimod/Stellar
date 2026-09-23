import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';
import TelescopeDesk from '@/components/sidera/telescope/TelescopeDesk';
import './telescope.css';

export const metadata: Metadata = {
  title: 'Telescope — Node 01',
  description:
    'Connect to a telescope under a dark sky, park, calibrate, choose a target, point, observe and capture. Simulated frames of the real sky.',
};

/** The live console. Every frame is drawn by the sky model and says so. */
export default function TelescopePage() {
  return (
    <SideraShell title="Telescope console">
      <TelescopeDesk />
    </SideraShell>
  );
}
