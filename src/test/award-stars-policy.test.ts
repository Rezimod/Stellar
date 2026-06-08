import { describe, it, expect } from 'vitest';
import { isAllowedAwardReason, maxAwardAmountForReason } from '@/lib/award-stars-policy';

describe('award-stars policy', () => {
  it('allows known exact reasons', () => {
    expect(isAllowedAwardReason('daily_checkin')).toBe(true);
    expect(isAllowedAwardReason('cosmic_daily')).toBe(true);
  });

  it('allows known prefixes', () => {
    expect(isAllowedAwardReason('find:m31')).toBe(true);
    expect(isAllowedAwardReason('cosmic_bonus:Saturn')).toBe(true);
    expect(isAllowedAwardReason('quiz:beginner-1')).toBe(true);
  });

  it('rejects arbitrary reasons', () => {
    expect(isAllowedAwardReason('free_money')).toBe(false);
    expect(isAllowedAwardReason('')).toBe(false);
  });

  it('caps amounts per reason', () => {
    expect(maxAwardAmountForReason('find:m31')).toBe(10);
    expect(maxAwardAmountForReason('daily_checkin')).toBe(500);
    expect(maxAwardAmountForReason('free_money')).toBe(0);
  });
});
