// The tiers written into already-minted Stellar observation metadata. Kept
// only so the legacy /nfts view can still read them; cards use src/lib/rarity.ts.
export type NftRarity = 'Celestial' | 'Astral' | 'Stellar' | 'Common';

export interface RarityInfo {
  rarity: NftRarity;
  color: string;      // hex — for NFT image border + overlays
  label: string;
  glyph: string;      // single-char glyph (not emoji)
}

const RARITY_MAP: Record<NftRarity, Omit<RarityInfo, 'rarity'>> = {
  Celestial: { color: '#FFB347', label: 'Celestial', glyph: '✦' },
  Astral:    { color: '#A855F7', label: 'Astral',    glyph: '◆' },
  Stellar:   { color: '#8B5CF6', label: 'Stellar',   glyph: '◇' },
  Common:    { color: '#64748B', label: 'Common',    glyph: '○' },
};

export function getRarityInfo(rarity: string): RarityInfo {
  const r = (rarity as NftRarity);
  return RARITY_MAP[r] ? { rarity: r, ...RARITY_MAP[r] } : { rarity: 'Common', ...RARITY_MAP.Common };
}
