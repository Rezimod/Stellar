import SealedObject from '@/components/discovery/SealedObject';
import { TIERS } from '@/lib/discovery/tiers';

/**
 * The unopened pass. Its edge cycles the five rarity colors (`.dsc-pass-card`
 * in discovery.css) — the only thing about a pass that is visible before the
 * reveal is the range of what it could become.
 */
export default function MintCard() {
  return (
    <div className="dsc-pass-card">
      <span className="dsc-card-eyebrow">Cosmic Discovery Pass</span>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <SealedObject size={120} />
        <span className="dsc-unknown">???</span>
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
