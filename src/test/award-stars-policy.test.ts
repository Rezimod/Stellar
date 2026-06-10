import { describe, it, expect } from 'vitest';
import { isAllowedAwardReason, maxAwardAmountForReason } from '@/lib/award-stars-policy';
import { maxQuizStars } from '@/lib/quizzes';
import { MAX_STREAK_MULTIPLIER } from '@/lib/constellation-streak';
import { DAILY_CHECKIN_BASE_REWARD } from '@/lib/daily-checkin';
import { MAX_CHALLENGE_BONUS } from '@/lib/celestial-challenges';
import { MAX_COSMIC_BONUS } from '@/lib/cosmic-bonus';

describe('award-stars policy', () => {
  it('allows known exact reasons', () => {
    expect(isAllowedAwardReason('daily_checkin')).toBe(true);
    expect(isAllowedAwardReason('weekly_challenge')).toBe(true);
    expect(isAllowedAwardReason('telescope:first-registration')).toBe(true);
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

  it('no longer allows the dropped cosmic_daily reason', () => {
    expect(isAllowedAwardReason('cosmic_daily')).toBe(false);
    expect(maxAwardAmountForReason('cosmic_daily')).toBe(0);
  });

  // The whole point of the policy: every cap must equal the true maximum a
  // legitimate client can request, derived from the payout source. If a payout
  // is bumped, these assertions fail until the cap is updated to match.
  describe('caps match the real payout ceilings', () => {
    it('quiz: caps at the max single-quiz payout from quizzes.ts', () => {
      expect(maxQuizStars()).toBe(100);
      expect(maxAwardAmountForReason('quiz:solar-system')).toBe(maxQuizStars());
    });

    it('daily_checkin: caps at base reward × max streak multiplier', () => {
      const expected = Math.round(DAILY_CHECKIN_BASE_REWARD * MAX_STREAK_MULTIPLIER);
      expect(expected).toBe(15);
      expect(maxAwardAmountForReason('daily_checkin')).toBe(expected);
    });

    it('weekly_challenge: caps at the largest challenge bonus', () => {
      expect(MAX_CHALLENGE_BONUS).toBe(200);
      expect(maxAwardAmountForReason('weekly_challenge')).toBe(MAX_CHALLENGE_BONUS);
    });

    it('cosmic_bonus: caps at the largest rarity bonus', () => {
      expect(MAX_COSMIC_BONUS).toBe(100);
      expect(maxAwardAmountForReason('cosmic_bonus:Saturn')).toBe(MAX_COSMIC_BONUS);
    });

    it('find: caps at the fixed per-target reward', () => {
      expect(maxAwardAmountForReason('find:m31')).toBe(10);
    });

    it('telescope:first-registration: caps at the fixed registration reward', () => {
      expect(maxAwardAmountForReason('telescope:first-registration')).toBe(50);
    });

    it('unknown reasons cap at 0', () => {
      expect(maxAwardAmountForReason('free_money')).toBe(0);
    });
  });
});
