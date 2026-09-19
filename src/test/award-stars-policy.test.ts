import { describe, it, expect } from 'vitest';
import { isAllowedAwardReason } from '@/lib/award-stars-policy';

describe('award-stars policy', () => {
  it('allows only proof-of-find', () => {
    expect(isAllowedAwardReason('find:m31')).toBe(true);
  });

  it('rejects the retired observe-to-earn reasons', () => {
    for (const r of ['daily_checkin', 'weekly_challenge', 'telescope:first-registration', 'cosmic_bonus:Saturn', 'quiz:beginner-1', 'cosmic_daily', 'free_money', '']) {
      expect(isAllowedAwardReason(r), r).toBe(false);
    }
  });

});
