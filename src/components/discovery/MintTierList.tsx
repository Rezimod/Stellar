import { TIERS_BY_VALUE } from '@/lib/discovery/tiers';

/**
 * The five outcomes, best first, as compact rows.
 *
 * Each row carries a 3px chip of its tier's MATERIAL — graphite, brushed steel,
 * anodized blue, bronze, gold foil — which is the same language the pass cards
 * are built from, so the rail reads as an index of the set rather than as five
 * coloured labels. `.dsc-mat` is what supplies the material; the leaderboard's
 * <TierChip> draws its swatch from the same one.
 */
export default function MintTierList() {
  return (
    <ul className="flex list-none flex-col p-0">
      {TIERS_BY_VALUE.map((tier) => (
        <li key={tier.id} className="dsc-mat-row dsc-mat" data-tier={tier.id}>
          <span className="dsc-mat-chip" aria-hidden="true" />
          <span className="dsc-mat-name">{tier.name}</span>
          <span className="dsc-mat-odds">{tier.odds.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}
