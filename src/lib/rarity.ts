/**
 * Card rarity.
 *
 * Stored on the card when a set is authored, never computed from anything a
 * holder does. How scarce a card is has nothing to do with whether Live Telescope V1 can
 * photograph it: Europa is common and cannot be resolved; Saturn is epic
 * and can.
 *
 * The tiers minted into old Stellar observation metadata (`Stellar`,
 * `Celestial`, `Astral`) are a different vocabulary and stay in nft-rarity.ts.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Scarcest last. */
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export type RarityInfo = {
  rarity: Rarity;
  /** 0 for common, rising with scarcity — for sorting a Collection. */
  rank: number;
  /** Hex on the cool-to-hot ramp, for the plate's edge, the chip and the drawn plate. */
  color: string;
  label: string;
  /** A single character, never an emoji. */
  glyph: string;
};

// Cool to hot, so scarcity reads as heat, in the card poster's sunset: its
// cream, its orange, its brick, then its gold. Glyphs are one family (diamonds, then
// the star) so a rarity never reads as an observation status, which uses
// circles. Mirrors --sd-rarity-* in src/styles/stellar-theme.css.
const RARITY_MAP: Record<Rarity, Omit<RarityInfo, 'rarity' | 'rank'>> = {
  common: { color: '#D9C9A5', label: 'Common', glyph: '◇' },
  rare: { color: '#F6A63F', label: 'Rare', glyph: '◈' },
  epic: { color: '#EF5F33', label: 'Epic', glyph: '◆' },
  legendary: { color: '#FFD36E', label: 'Ultra Rare', glyph: '✦' },
};

export function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

export function rarityInfo(rarity: Rarity): RarityInfo {
  return { rarity, rank: RARITIES.indexOf(rarity), ...RARITY_MAP[rarity] };
}
