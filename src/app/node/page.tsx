import type { Metadata } from 'next';
import StellarShell from '@/components/stellar/StellarShell';
import StellarTabBar from '@/components/stellar/StellarTabBar';
import ObservatoryConsole from '@/components/stellar/observatory/ObservatoryConsole';
import { observatoryTonight } from '@/lib/observatory/tonight-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Observatory — demo · Skychaser',
  description:
    'A demo of the observatory console: park, calibrate, choose a target, point and capture. Simulated frames of the real sky until first light in November 2026.',
};

/** The observatory: the console as a demo until first light. Quick start points it at tonight's card. */
export default async function ObservatoryPage() {
  const { tonight, nodeCloud } = await observatoryTonight();
  return (
    <StellarShell bare>
      <ObservatoryConsole tonight={tonight} nodeCloud={nodeCloud} />
      <StellarTabBar />
    </StellarShell>
  );
}
