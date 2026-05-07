export type NftRarity = 'Celestial' | 'Astral' | 'Stellar' | 'Common';

export interface RarityInfo {
  rarity: NftRarity;
  color: string;      // hex — for NFT image border + overlays
  gradient: string;   // gradient CSS for pill/badge backgrounds
  label: string;
  glyph: string;      // single-char glyph (not emoji)
}

const RARITY_MAP: Record<NftRarity, Omit<RarityInfo, 'rarity'>> = {
  Celestial: { color: '#FFB347', gradient: 'linear-gradient(135deg, #FFB347, #FFB347)',         label: 'Celestial', glyph: '✦' },
  Astral:    { color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #8B5CF6)',         label: 'Astral',    glyph: '◆' },
  Stellar:   { color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #5EEAD4)',         label: 'Stellar',   glyph: '◇' },
  Common:    { color: '#64748B', gradient: 'linear-gradient(135deg, #64748B, #475569)',         label: 'Common',    glyph: '○' },
};

export function calculateRarity(skyScore: number, streakNights: number): RarityInfo {
  let r: NftRarity;
  if (skyScore >= 85 && streakNights >= 7) r = 'Celestial';
  else if (skyScore >= 70 && streakNights >= 3) r = 'Astral';
  else if (skyScore >= 50) r = 'Stellar';
  else r = 'Common';
  return { rarity: r, ...RARITY_MAP[r] };
}

export function getRarityInfo(rarity: string): RarityInfo {
  const r = (rarity as NftRarity);
  return RARITY_MAP[r] ? { rarity: r, ...RARITY_MAP[r] } : { rarity: 'Common', ...RARITY_MAP.Common };
}
