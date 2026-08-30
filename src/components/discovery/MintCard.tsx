import SealedObject from '@/components/discovery/SealedObject';
import { REVEAL_AT_MS, TOTAL_PASSES } from '@/lib/discovery/constants';

/**
 * The sealed foil pack — the object you are actually buying.
 *
 * Not a card with a mystery on it: a heat-sealed metalized pouch, crimped top
 * and bottom, with a tear notch you have not used yet. Everything is CSS
 * (`.dsc-pack-*` in discovery.css) — foil is gradients and moving light, not a
 * texture file.
 *
 * The pack front says only what a real pack says: what it is, that something is
 * inside, how many exist, and when it opens. The tier colours survive as the
 * shimmer cycling behind the blacked-out object; the odds themselves moved to
 * the offer column, where a buyer can read them next to the price.
 */

/** Fixed to UTC, like REVEAL_AT_MS itself, so server and client agree. */
const REVEAL_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(REVEAL_AT_MS);

export default function MintCard() {
  return (
    <div className="dsc-pack-stage">
      <span className="dsc-pack-floor" aria-hidden="true" />

      <div className="dsc-pack">
        <span className="dsc-pack-slick" aria-hidden="true" />
        <span className="dsc-pack-crimp dsc-pack-crimp--top" aria-hidden="true" />
        <span className="dsc-pack-crimp dsc-pack-crimp--bottom" aria-hidden="true" />
        <span className="dsc-pack-notch" aria-hidden="true" />
        <span className="dsc-pack-tear" aria-hidden="true" />

        <div className="dsc-pack-face">
          <p className="dsc-pack-title">
            <span>Cosmic</span>
            <span>Discovery</span>
            <span>Pass</span>
          </p>

          <div className="dsc-pack-window">
            <span className="dsc-pack-shimmer" aria-hidden="true" />
            <SealedObject size={96} />
          </div>

          <div className="dsc-pack-foot">
            <p className="dsc-pack-count">One of {TOTAL_PASSES.toLocaleString('en-US')}</p>
            <p className="dsc-pack-date">Opens {REVEAL_DATE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
