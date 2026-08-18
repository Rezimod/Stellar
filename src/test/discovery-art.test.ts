import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OBJECT_ART, PASS_ART, objectArt } from '@/lib/discovery/passArt';
import { OBJECT_POOLS, type Rarity } from '@/lib/discovery/rarityEngine';

const RARITIES: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const ALL_IDS = new Set(RARITIES.flatMap((r) => OBJECT_POOLS[r].map((o) => o.id)));

const RARITY_OF_TIER = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
} as const;

describe('object art map', () => {
  // A typo here does not throw — it silently falls back to a gradient forever,
  // which is exactly the failure this suite exists to catch.
  it('keys are all real catalogue objects', () => {
    for (const id of Object.keys(OBJECT_ART)) {
      expect(ALL_IDS.has(id), `${id} is not in any draw pool`).toBe(true);
    }
  });

  it('every referenced file exists on disk', () => {
    for (const [id, art] of Object.entries(OBJECT_ART)) {
      const file = path.join(process.cwd(), 'public', art.src);
      expect(fs.existsSync(file), `${id} → ${art.src} is missing`).toBe(true);
    }
  });

  it('falls back to null for an object with no photograph', () => {
    // TON 618 has never been imaged — nothing but artist impressions exist.
    expect(objectArt('ton-618')).toBeNull();
    expect(objectArt('nonsense-id')).toBeNull();
  });
});

describe('tier art', () => {
  it('each tier card shows an object genuinely in that tier', () => {
    for (const [tier, art] of Object.entries(PASS_ART)) {
      const rarity = RARITY_OF_TIER[tier as keyof typeof RARITY_OF_TIER];
      const inPool = OBJECT_POOLS[rarity].some((o) => o.id === art.objectId);
      expect(inPool, `${art.objectId} is not in the ${rarity} pool`).toBe(true);
    }
  });

  it('each tier card file exists', () => {
    for (const art of Object.values(PASS_ART)) {
      expect(fs.existsSync(path.join(process.cwd(), 'public', art.src))).toBe(true);
    }
  });
});
