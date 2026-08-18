import Image from 'next/image';
import { TIERS } from '@/lib/discovery/tiers';

/**
 * The unopened pass.
 *
 * A real photograph sits behind the seal, blurred past recognition. That is the
 * whole idea of the object: something specific is genuinely in there, and the
 * card will not tell you what. A flat black panel says "nothing here"; an
 * out-of-focus nebula says "not yet".
 *
 * The edge cycles the five rarity colours (`.dsc-pass-card` in discovery.css) —
 * the only honest thing a sealed pass can show is the range of what it might
 * become.
 */
export default function MintCard() {
  return (
    <div className="dsc-pass-card dsc-sealed-card">
      <div className="dsc-sealed-bg" aria-hidden="true">
        <Image
          src="/images/dso/m42.jpg"
          alt=""
          fill
          sizes="360px"
          className="dsc-sealed-photo"
          priority
        />
      </div>

      <span className="dsc-card-eyebrow">Cosmic Discovery Pass</span>

      <div className="dsc-sealed-body">
        <span className="dsc-sealed-disc" aria-hidden="true" />
        <span className="dsc-unknown">???</span>
        <p className="dsc-sealed-note">Sealed until 21 October 2026</p>
      </div>

      <ul className="flex list-none flex-col gap-1.5 p-0">
        {TIERS.map((tier) => (
          <li
            key={tier.id}
            className="dsc-odds-pill"
            style={{ '--dsc-tier': tier.color } as React.CSSProperties}
          >
            <span className="dsc-odds-name">{tier.name}</span>
            <span className="dsc-odds-value">{tier.odds}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
