import type { NftRarity } from './nft-rarity';

export interface CosmicBonus {
  triggered: boolean;
  amount: number;
  message: string;
}

const BONUS_TABLE: Record<NftRarity, { chance: number; amount: number }> = {
  Common:    { chance: 0.05, amount: 10 },
  Stellar:   { chance: 0.12, amount: 25 },
  Astral:    { chance: 0.20, amount: 50 },
  Celestial: { chance: 0.35, amount: 100 },
};

/** Largest cosmic bonus payout (Celestial rarity). */
export const MAX_COSMIC_BONUS = Math.max(...Object.values(BONUS_TABLE).map((b) => b.amount));

const MESSAGES = [
  'Cosmic winds favor you',
  'Shooting star crosses your path',
  'Celestial alignment detected',
  'The stars smile upon you',
  'Universe rewards the curious',
];

export function rollCosmicBonus(rarity: NftRarity, oracleHash: string, userId = '', targetId = ''): CosmicBonus {
  const seed = userId + new Date().toISOString().slice(0, 10) + targetId + (oracleHash || '');
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) + seed.charCodeAt(i);
  const hashNum = Math.abs(h);
  const roll = (hashNum % 1000) / 1000;
  const cfg = BONUS_TABLE[rarity] ?? BONUS_TABLE.Common;
  if (roll < cfg.chance) {
    return { triggered: true, amount: cfg.amount, message: MESSAGES[hashNum % MESSAGES.length] };
  }
  return { triggered: false, amount: 0, message: '' };
}
