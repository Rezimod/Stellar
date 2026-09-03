import { describe, expect, it } from 'vitest';
import {
  deliveredHours,
  settleComplete,
  settleFailure,
} from '@/lib/observatory/settlement';

/** A 40 ₾ session, in tetri. */
const FEE = 4000;

describe('a completed session', () => {
  it('pays a new operator 24 and keeps 16', () => {
    const s = settleComplete({ feeTetri: FEE, hoursDelivered: 0, provenance: 'instrument' });
    expect(s.state).toBe('released');
    expect(s.operatorTetri).toBe(2400);
    expect(s.platformTetri).toBe(1600);
    expect(s.refundTetri).toBe(0);
  });

  it('pays the share the operator has earned by then, not the one they started on', () => {
    const junior = settleComplete({ feeTetri: FEE, hoursDelivered: 0, provenance: 'instrument' });
    const senior = settleComplete({ feeTetri: FEE, hoursDelivered: 300, provenance: 'instrument' });
    expect(senior.operatorTetri).toBeGreaterThan(junior.operatorTetri);
    expect(senior.tier?.id).toBe('observatory_director');
  });

  it('never invents or loses a tetri', () => {
    for (const fee of [1, 99, 4000, 12_345]) {
      const s = settleComplete({ feeTetri: fee, hoursDelivered: 75, provenance: 'instrument' });
      expect(s.operatorTetri + s.platformTetri).toBe(fee);
    }
  });

  it('owes nobody anything when the sky was simulated', () => {
    const s = settleComplete({ feeTetri: FEE, hoursDelivered: 0, provenance: 'simulated' });
    // The arithmetic still runs — it is the obligation that does not exist.
    expect(s.operatorTetri).toBe(2400);
    expect(s.payable).toBe(false);
  });
});

describe('a failed session', () => {
  it('refunds the customer in full and pays nobody', () => {
    const s = settleFailure({ feeTetri: FEE, reason: 'weather', provenance: 'instrument' });
    expect(s.state).toBe('refunded');
    expect(s.refundTetri).toBe(FEE);
    expect(s.operatorTetri).toBe(0);
    expect(s.platformTetri).toBe(0);
  });

  it('refunds the whole fee for every terminal reason — there is no partial night', () => {
    for (const reason of ['weather', 'hardware', 'not_visible', 'cancelled', 'failed'] as const) {
      expect(settleFailure({ feeTetri: FEE, reason, provenance: 'instrument' }).refundTetri).toBe(
        FEE,
      );
    }
  });
});

describe('delivered hours', () => {
  it('counts only sessions that were real', () => {
    const sessions = [
      { minutes: 20, payable: true },
      { minutes: 20, payable: true },
      { minutes: 20, payable: false },
      { minutes: 20, payable: true },
    ];
    expect(deliveredHours(sessions)).toBe(1);
  });

  it('a ladder cannot be climbed indoors', () => {
    const simulated = Array.from({ length: 900 }, () => ({ minutes: 20, payable: false }));
    expect(deliveredHours(simulated)).toBe(0);
  });
});
