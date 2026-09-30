import StellarShell from '@/components/stellar/StellarShell';
import VoyageClient from '@/components/play/VoyageClient';

/** The game runs full screen over its own fixed shell, so the page is bare. */
export default function VoyagePage() {
  return (
    <StellarShell bare>
      <VoyageClient />
    </StellarShell>
  );
}
