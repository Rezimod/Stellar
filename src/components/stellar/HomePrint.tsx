import Link from 'next/link';
import StarPulse from './StarPulse';

/**
 * The print beside the headline: the black sky with one star in it, breathing,
 * the moment before a capsule is lit. The whole print opens the set.
 */
export default function HomePrint() {
  return (
    <Link href="/set/001" className="sd-homeprint" aria-label="Genesis — blast a star">
      <span className="sd-homeprint__print">
        <StarPulse className="sd-homeprint__star" centre={0.48} breathe />
      </span>
    </Link>
  );
}
