import { describe, expect, it } from 'vitest';
import {
  OPERATOR_TIERS,
  hoursFromSessions,
  nextTier,
  splitFee,
  tierFor,
} from '@/lib/observatory/operator-tiers';

describe('the ladder', () => {
  it('starts a new operator at 60%', () => {
    expect(tierFor(0).operatorShare).toBe(0.6);
    expect(tierFor(0).id).toBe('night_assistant');
  });

  it('tops out at the 80/20 the network design proposed', () => {
    const top = OPERATOR_TIERS[OPERATOR_TIERS.length - 1];
    expect(top.operatorShare).toBe(0.8);
    expect(tierFor(10_000).id).toBe(top.id);
  });

  it('only ever improves — no rung pays worse than the one below it', () => {
    for (let i = 1; i < OPERATOR_TIERS.length; i++) {
      expect(OPERATOR_TIERS[i].operatorShare).toBeGreaterThan(OPERATOR_TIERS[i - 1].operatorShare);
      expect(OPERATOR_TIERS[i].minHours).toBeGreaterThan(OPERATOR_TIERS[i - 1].minHours);
    }
  });

  it('promotes on the hour the threshold is reached, not after it', () => {
    expect(tierFor(24.99).id).toBe('night_assistant');
    expect(tierFor(25).id).toBe('telescope_operator');
  });

  it('treats a nonsense hour count as a new operator rather than a generous one', () => {
    expect(tierFor(-40).operatorShare).toBe(0.6);
    expect(tierFor(Number.NaN).operatorShare).toBe(0.6);
  });

  it('says what is left to the next rung, and nothing at the top', () => {
    expect(nextTier(0)).toEqual({ tier: OPERATOR_TIERS[1], hoursRemaining: 25 });
    expect(nextTier(150)?.tier.id).toBe('observatory_director');
    expect(nextTier(300)).toBeNull();
  });
});

describe('splitting a fee', () => {
  it('gives a new operator 24 of a 40 lari session', () => {
    const { operatorTetri, platformTetri } = splitFee(4000, 0);
    expect(operatorTetri).toBe(2400);
    expect(platformTetri).toBe(1600);
  });

  it('gives a director 32 of the same session', () => {
    expect(splitFee(4000, 300).operatorTetri).toBe(3200);
  });

  it('always adds back to exactly what the customer paid', () => {
    // Fees that do not divide cleanly are where a ledger goes wrong.
    for (const fee of [1, 7, 333, 999, 1234, 4000, 7777, 100_001]) {
      for (const hours of [0, 25, 75, 150, 300]) {
        const { operatorTetri, platformTetri } = splitFee(fee, hours);
        expect(operatorTetri + platformTetri).toBe(fee);
        expect(operatorTetri).toBeGreaterThanOrEqual(0);
        expect(platformTetri).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('pays nothing out of nothing', () => {
    expect(splitFee(0, 300)).toMatchObject({ operatorTetri: 0, platformTetri: 0 });
    expect(splitFee(-500, 0)).toMatchObject({ operatorTetri: 0, platformTetri: 0 });
  });
});

describe('delivered hours', () => {
  it('counts three twenty-minute sessions as an hour', () => {
    expect(hoursFromSessions(3, 20)).toBe(1);
  });

  it('clears a 2,000 lari kit inside the second rung', () => {
    // 24 lari a session at the starting share; the kit pays for itself at 84
    // sessions, which is 28 delivered hours — just past Telescope Operator.
    const perSessionTetri = splitFee(4000, 0).operatorTetri;
    const sessions = Math.ceil(200_000 / perSessionTetri);
    expect(sessions).toBe(84);
    expect(hoursFromSessions(sessions, 20)).toBeCloseTo(28, 5);
    expect(tierFor(hoursFromSessions(sessions, 20)).id).toBe('telescope_operator');
  });
});
