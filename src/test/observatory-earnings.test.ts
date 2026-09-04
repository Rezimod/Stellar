import { describe, expect, it } from 'vitest';
import { lari } from '@/lib/observatory/earnings';
import { nextTier, splitFee, tierFor } from '@/lib/observatory/operator-tiers';
import { deliveredHours, settleComplete } from '@/lib/observatory/settlement';

/**
 * What an operator sees is the ledger read back, so the arithmetic that
 * produces those figures is what is worth pinning: a season of real sessions
 * has to add up to the number on the page.
 */
describe('an operator’s first season', () => {
  const FEE = 4000;
  const SESSION_MIN = 20;

  it('earns what the ladder promises as the hours accumulate', () => {
    let hours = 0;
    let earnedTetri = 0;

    // 240 sessions — two a night across a hundred and twenty clear nights.
    for (let i = 0; i < 240; i++) {
      const settlement = settleComplete({
        feeTetri: FEE,
        hoursDelivered: hours,
        provenance: 'instrument',
      });
      earnedTetri += settlement.operatorTetri;
      hours += SESSION_MIN / 60;
    }

    expect(hours).toBeCloseTo(80, 5);
    expect(tierFor(hours).id).toBe('support_astronomer');
    // Two rungs climbed inside the season, so the total beats a flat 60%.
    expect(earnedTetri).toBeGreaterThan(240 * splitFee(FEE, 0).operatorTetri);
    expect(lari(earnedTetri)).toBe('6120.00');
  });

  it('tells an operator exactly what is left to the next raise', () => {
    const after = nextTier(80);
    expect(after?.tier.id).toBe('staff_astronomer');
    expect(after?.hoursRemaining).toBe(70);
  });

  it('a season on the simulator earns nothing and climbs nothing', () => {
    const sessions = Array.from({ length: 240 }, () => ({ minutes: SESSION_MIN, payable: false }));
    expect(deliveredHours(sessions)).toBe(0);
    expect(settleComplete({ feeTetri: FEE, hoursDelivered: 0, provenance: 'simulated' }).payable).toBe(
      false,
    );
  });
});

describe('lari', () => {
  it('shows tetri as money, and only in the view', () => {
    expect(lari(2400)).toBe('24.00');
    expect(lari(1)).toBe('0.01');
    expect(lari(0)).toBe('0.00');
  });
});
