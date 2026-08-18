import { describe, it, expect } from 'vitest';
import {
  OBJECT_POOLS,
  REVEAL_SALT,
  ROLL_SPACE,
  determineObject,
  generateVisualGradient,
  rarityForRoll,
  rollFor,
  type Rarity,
} from '@/lib/discovery/rarityEngine';
import { TIERS, TIER_BY_ID } from '@/lib/discovery/tiers';

const RARITIES: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
const WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

describe('bucket boundaries', () => {
  it('maps the exact ranges from the spec', () => {
    expect(rarityForRoll(0)).toBe('COMMON');
    expect(rarityForRoll(8_999)).toBe('COMMON');
    expect(rarityForRoll(9_000)).toBe('UNCOMMON');
    expect(rarityForRoll(9_699)).toBe('UNCOMMON');
    expect(rarityForRoll(9_700)).toBe('RARE');
    expect(rarityForRoll(9_949)).toBe('RARE');
    expect(rarityForRoll(9_950)).toBe('EPIC');
    expect(rarityForRoll(9_989)).toBe('EPIC');
    expect(rarityForRoll(9_990)).toBe('LEGENDARY');
    expect(rarityForRoll(9_999)).toBe('LEGENDARY');
  });

  it('stays in step with the odds in tiers.ts', () => {
    const widths: Record<Rarity, number> = {
      COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0,
    };
    for (let roll = 0; roll < ROLL_SPACE; roll += 1) widths[rarityForRoll(roll)] += 1;

    for (const tier of TIERS) {
      const rarity = tier.id.toUpperCase() as Rarity;
      // 10,000 slots, one per pass — the bucket width IS the tier's pass count.
      expect(widths[rarity]).toBe(tier.count);
      expect(widths[rarity] / ROLL_SPACE).toBeCloseTo(tier.odds / 100, 10);
    }
  });
});

describe('determinism', () => {
  it('returns the same object for the same inputs', () => {
    const a = determineObject(WALLET, 1_847);
    const b = determineObject(WALLET, 1_847);
    expect(a).toEqual(b);
  });

  it('gives different passes different draws', () => {
    const rolls = new Set(Array.from({ length: 50 }, (_, i) => rollFor(WALLET, i)));
    expect(rolls.size).toBeGreaterThan(40);
  });

  it('changes every outcome when the salt changes', () => {
    // This is what makes commit-and-reveal possible: nothing is predictable
    // until the salt is published.
    const before = Array.from({ length: 200 }, (_, i) => rollFor(WALLET, i, REVEAL_SALT));
    const after = Array.from({ length: 200 }, (_, i) => rollFor(WALLET, i, 'a-different-secret'));
    const identical = before.filter((r, i) => r === after[i]).length;
    expect(identical).toBeLessThan(5);
  });
});

describe('distribution', () => {
  it('lands within tolerance of the published odds over 200k draws', () => {
    const N = 200_000;
    const counts: Record<Rarity, number> = {
      COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0,
    };
    for (let i = 0; i < N; i += 1) counts[rarityForRoll(rollFor(`wallet-${i}`, i))] += 1;

    const pct = (r: Rarity) => (counts[r] / N) * 100;
    expect(pct('COMMON')).toBeGreaterThan(89.4);
    expect(pct('COMMON')).toBeLessThan(90.6);
    expect(pct('UNCOMMON')).toBeGreaterThan(6.6);
    expect(pct('UNCOMMON')).toBeLessThan(7.4);
    expect(pct('RARE')).toBeGreaterThan(2.2);
    expect(pct('RARE')).toBeLessThan(2.8);
    expect(pct('EPIC')).toBeGreaterThan(0.25);
    expect(pct('EPIC')).toBeLessThan(0.58);
    expect(pct('LEGENDARY')).toBeGreaterThan(0.04);
    expect(pct('LEGENDARY')).toBeLessThan(0.17);
  });

  it('reaches every object in a pool given enough draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i += 1) {
      const o = determineObject(`w${i}`, i);
      if (o.rarity === 'COMMON') seen.add(o.id);
    }
    expect(seen.size).toBe(OBJECT_POOLS.COMMON.length);
  });
});

describe('object pools', () => {
  it.each(RARITIES)('%s holds at least 20 objects', (rarity) => {
    expect(OBJECT_POOLS[rarity].length).toBeGreaterThanOrEqual(20);
  });

  it('has globally unique ids', () => {
    const ids = RARITIES.flatMap((r) => OBJECT_POOLS[r].map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries well-formed J2000 coordinates', () => {
    const ra = /^\d{2}h \d{2}m \d{2}s$/;
    const dec = /^[+-]\d{2}° \d{2}′ \d{2}″$/;
    for (const rarity of RARITIES) {
      for (const o of OBJECT_POOLS[rarity]) {
        expect(o.coordinates.ra, `${o.id} ra`).toMatch(ra);
        expect(o.coordinates.dec, `${o.id} dec`).toMatch(dec);
      }
    }
  });

  it('inherits rewards from tiers.ts rather than restating them', () => {
    for (const rarity of RARITIES) {
      const tier = TIER_BY_ID[rarity.toLowerCase() as keyof typeof TIER_BY_ID];
      for (const o of OBJECT_POOLS[rarity]) {
        expect(o.tokens).toBe(tier.strllr);
        expect(o.physicalReward).toBe(tier.physical);
        expect(o.rarityColor).toBe(tier.color);
      }
    }
  });

  it('only ships physical rewards on Epic and Legendary', () => {
    for (const rarity of RARITIES) {
      const expected = rarity === 'EPIC' || rarity === 'LEGENDARY';
      for (const o of OBJECT_POOLS[rarity]) {
        expect(o.physicalReward !== null, `${o.id}`).toBe(expected);
      }
    }
  });
});

describe('generateVisualGradient', () => {
  it('is deterministic for a seed', () => {
    expect(generateVisualGradient(12345, 'LEGENDARY')).toBe(
      generateVisualGradient(12345, 'LEGENDARY'),
    );
  });

  it('differs between seeds', () => {
    expect(generateVisualGradient(1, 'RARE')).not.toBe(generateVisualGradient(2, 'RARE'));
  });

  it('differs between rarities at the same seed', () => {
    expect(generateVisualGradient(99, 'COMMON')).not.toBe(generateVisualGradient(99, 'EPIC'));
  });

  it('emits four layered radial gradients', () => {
    const css = generateVisualGradient(777, 'EPIC');
    expect(css.match(/radial-gradient\(/g)).toHaveLength(4);
    expect(css).not.toContain('NaN');
    expect(css).not.toContain('undefined');
  });

  it('accepts lowercase and falls back for an unknown rarity', () => {
    expect(generateVisualGradient(5, 'legendary')).toBe(generateVisualGradient(5, 'LEGENDARY'));
    expect(generateVisualGradient(5, 'nonsense')).toBe(generateVisualGradient(5, 'COMMON'));
  });
});
