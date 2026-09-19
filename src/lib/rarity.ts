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
  /** Hex on the brass ramp, for the plate's rule and the mark. */
  color: string;
  label: string;
  /** A single character, never an emoji. */
  glyph: string;
};

// One brass accent, stepped: common sits nearest the neutrals, legendary is
// the brightest brass. Glyphs are one family (diamonds, then the star) so they
// never read as an observation status, which uses circles. Mirrors
// --sd-rarity-* in src/styles/sidera-tokens.css.
const RARITY_MAP: Record<Rarity, Omit<RarityInfo, 'rarity' | 'rank'>> = {
  common: { color: '#978D72', label: 'Common', glyph: '◇' },
  rare: { color: '#B09A5F', label: 'Rare', glyph: '◈' },
  epic: { color: '#C9A84C', label: 'Epic', glyph: '◆' },
  legendary: { color: '#E2C77A', label: 'Legendary', glyph: '✦' },
};

export function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

export function rarityInfo(rarity: Rarity): RarityInfo {
  return { rarity, rank: RARITIES.indexOf(rarity), ...RARITY_MAP[rarity] };
}
