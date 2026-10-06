import Link from 'next/link';
import StarPulse from './StarPulse';

/**
 * The poster beside the headline: a cream-framed print of the black sky with
 * one star in it, breathing, the moment before a capsule is lit. The card is
 * inside it. The whole print opens the set.
 */
export default function HomePrint() {
  return (
    <Link href="/set/001" className="sd-herofan sd-homeprint" aria-label="Genesis — blast a star">
      <span className="sd-herofan__print sd-homeprint__print">
        <StarPulse className="sd-homeprint__star" centre={0.48} breathe />
        <span className="sd-homeprint__note" aria-hidden="true">Sealed · waiting for ignition</span>
      </span>
      <span className="sd-herofan__caption" aria-hidden="true">Genesis</span>
    </Link>
  );
}
