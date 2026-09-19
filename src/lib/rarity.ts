/**
 * Card rarity.
 *
 * Stored on the card when a set is authored, never computed from anything a
 * holder does. How scarce a card is has nothing to do with whether Node 01 can
 * photograph it: Europa is epic and cannot be resolved; Saturn is legendary
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
  /** Hex, for the plate's rule and the pill. */
  color: string;
  label: string;
  /** A single character, never an emoji. */
  glyph: string;
};

const RARITY_MAP: Record<Rarity, Omit<RarityInfo, 'rarity' | 'rank'>> = {
  common: { color: '#8A9099', label: 'Common', glyph: '○' },
  rare: { color: '#7A9CC6', label: 'Rare', glyph: '◇' },
  epic: { color: '#9C88C4', label: 'Epic', glyph: '◆' },
  legendary: { color: '#C9A84C', label: 'Legendary', glyph: '✦' },
};

export function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

export function rarityInfo(rarity: Rarity): RarityInfo {
  return { rarity, rank: RARITIES.indexOf(rarity), ...RARITY_MAP[rarity] };
}
