import type { Metadata } from 'next';
import StellarShell from '@/components/stellar/StellarShell';
import ObservatoryConsole from '@/components/stellar/observatory/ObservatoryConsole';
import { observatoryTonight } from '@/lib/observatory/tonight-card';

export const dynamic = 'force-dynamic';

// Unlisted: for filming the console as it will look once the telescope is live. Linked from nowhere, kept out of search.
export const metadata: Metadata = {
  title: 'Observatory · Skychaser',
  robots: { index: false, follow: false },
};

export default async function ObservatoryFilmPage() {
  const { tonight, nodeCloud } = await observatoryTonight();
  return (
    <StellarShell bare>
      <ObservatoryConsole tonight={tonight} nodeCloud={nodeCloud} film />
    </StellarShell>
  );
}
