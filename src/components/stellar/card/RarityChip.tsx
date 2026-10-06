import type { Rarity } from '@/lib/rarity';

/**
 * The rarity, as a glossy enamel chip laid over the card rather than printed
 * on it: a bevel, a gloss, a shine that keeps passing across it and a glow in
 * the rarity's own colour. Epic and legendary throw sparks; legendary's enamel
 * is a moving gold holo. It floats with the card's lean (--px/--py on a held
 * card, --tx/--ty on the shelf). Sized off the card's width, so it sits the
 * same on a thumbnail as on the card you hold. Its styles (rarity-chip.css)
 * load with StellarCard and CardThumb, so the plate baker can render it bare.
 */
export default function RarityChip({ rarity, label }: { rarity: Rarity; label: string }) {
  const hot = rarity === 'epic' || rarity === 'legendary';
  return (
    <span className="sdc-chips" aria-hidden="true">
      <span className="sdc-chip" data-rarity={rarity}>
        <span className="sdc-chip__aura" />
        <span className="sdc-chip__body">
          {rarity === 'legendary' && <span className="sdc-chip__holo" />}
          <span className="sdc-chip__gloss" />
          <span className="sdc-chip__tilt" />
          <span className="sdc-chip__sweep" />
          <span className="sdc-chip__label">{label}</span>
        </span>
        {hot && (
          <>
            <span className="sdc-chip__spark sdc-chip__spark--a" />
            <span className="sdc-chip__spark sdc-chip__spark--b" />
          </>
        )}
      </span>
    </span>
  );
}
