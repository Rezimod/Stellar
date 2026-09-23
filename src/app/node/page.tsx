import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';
import TelescopeDesk from '@/components/sidera/telescope/TelescopeDesk';
import './observatory.css';

export const metadata: Metadata = {
  title: 'Observatory — Sidera',
  description:
    'Connect to a telescope under a dark sky, park, calibrate, choose a target, point, observe and capture. Simulated frames of the real sky.',
};

/** The observatory: the live console. Every frame is drawn by the sky model and says so. */
export default function ObservatoryPage() {
  return (
    <SideraShell title="Observatory">
      <TelescopeDesk />
    </SideraShell>
  );
}
