import { describe, it, expect } from 'vitest';
import {
  tierForCount,
  applyReputationMultiplier,
  REPUTATION_TIERS,
} from '@/lib/reputation';

describe('tierForCount', () => {
  it('places counts in the correct tier at boundaries', () => {
    expect(tierForCount(0).tier.key).toBe('stargazer');
    expect(tierForCount(4).tier.key).toBe('stargazer');
    expect(tierForCount(5).tier.key).toBe('observer');
    expect(tierForCount(19).tier.key).toBe('observer');
    expect(tierForCount(20).tier.key).toBe('pathfinder');
    expect(tierForCount(49).tier.key).toBe('pathfinder');
    expect(tierForCount(50).tier.key).toBe('celestial');
    expect(tierForCount(9999).tier.key).toBe('celestial');
  });

  it('exposes the matching multiplier', () => {
    expect(tierForCount(0).multiplier).toBe(1.0);
    expect(tierForCount(5).multiplier).toBe(1.1);
    expect(tierForCount(20).multiplier).toBe(1.25);
    expect(tierForCount(50).multiplier).toBe(1.5);
  });

  it('computes progress and remaining to next tier', () => {
    const atObserver = tierForCount(5); // 5 → next at 20, span 15
    expect(atObserver.nextTier?.key).toBe('pathfinder');
    expect(atObserver.toNext).toBe(15);
    expect(atObserver.progressPct).toBe(0);

    const mid = tierForCount(12); // (12-5)/15 ≈ 47%
    expect(mid.progressPct).toBe(47);
    expect(mid.toNext).toBe(8);
  });

  it('caps progress at the top tier', () => {
    const top = tierForCount(120);
    expect(top.nextTier).toBeNull();
    expect(top.toNext).toBe(0);
    expect(top.progressPct).toBe(100);
  });

  it('grants a passport from Observer up, not at Stargazer', () => {
    expect(tierForCount(4).hasPassport).toBe(false);
    expect(tierForCount(5).hasPassport).toBe(true);
    expect(tierForCount(50).hasPassport).toBe(true);
  });

  it('treats negative / non-finite counts as zero', () => {
    expect(tierForCount(-3).tier.key).toBe('stargazer');
    expect(tierForCount(NaN).tier.key).toBe('stargazer');
  });
});

describe('applyReputationMultiplier', () => {
  it('boosts stars by the tier multiplier and rounds', () => {
    expect(applyReputationMultiplier(50, 0)).toBe(50); // ×1.0
    expect(applyReputationMultiplier(50, 5)).toBe(55); // ×1.1
    expect(applyReputationMultiplier(50, 20)).toBe(63); // ×1.25 = 62.5 → 63
    expect(applyReputationMultiplier(50, 50)).toBe(75); // ×1.5
  });

  it('returns 0 for non-positive input', () => {
    expect(applyReputationMultiplier(0, 50)).toBe(0);
    expect(applyReputationMultiplier(-10, 50)).toBe(0);
  });
});

describe('REPUTATION_TIERS', () => {
  it('is ordered by ascending min threshold', () => {
    for (let i = 1; i < REPUTATION_TIERS.length; i++) {
      expect(REPUTATION_TIERS[i].min).toBeGreaterThan(REPUTATION_TIERS[i - 1].min);
    }
  });
});
