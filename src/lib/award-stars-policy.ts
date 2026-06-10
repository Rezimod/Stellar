// Server-side guardrails for /api/award-stars — keeps external-wallet
// flows working while blocking arbitrary mint requests.
//
// Each cap below is the TRUE maximum a legitimate client can request for that
// reason, derived from the payout code that issues it. The comment on each cap
// cites the source; src/test/award-stars-policy.test.ts re-derives every value
// from those source constants so a future payout change that outgrows a cap
// fails CI instead of silently getting clamped (or, worse, opening a hole).

const EXACT_REASONS = new Set([
  'daily_checkin',
  'weekly_challenge',
  'telescope:first-registration',
]);

const PREFIX_REASONS = ['find:', 'cosmic_bonus:', 'quiz:'] as const;

const EXACT_MAX: Record<string, number> = {
  // DailyCheckInCard.tsx: round(DAILY_CHECKIN_BASE_REWARD × MAX_STREAK_MULTIPLIER)
  // = round(5 × 3.0) = 15 (daily-checkin.ts + constellation-streak.ts).
  daily_checkin: 15,
  // MissionActive.tsx / observe verify page award claimChallengeReward() =
  // challenge.bonusStars; max in celestial-challenges.ts is 200 (Devoted Observer).
  weekly_challenge: 200,
  // telescopes/route.ts awards a fixed 50 on first telescope registration.
  'telescope:first-registration': 50,
};

export function isAllowedAwardReason(reason: string): boolean {
  if (EXACT_REASONS.has(reason)) return true;
  return PREFIX_REASONS.some((p) => reason.startsWith(p));
}

export function maxAwardAmountForReason(reason: string): number {
  // sky/page.tsx awards a fixed 10 per found target.
  if (reason.startsWith('find:')) return 10;
  // MissionActive.tsx / observe verify page award rollCosmicBonus().amount;
  // max in cosmic-bonus.ts BONUS_TABLE is 100 (Celestial rarity).
  if (reason.startsWith('cosmic_bonus:')) return 100;
  // QuizActive.tsx awards questions-correct × starsPerCorrect; max single-quiz
  // payout in quizzes.ts is 10 questions × 10 = 100 (see maxQuizStars()).
  if (reason.startsWith('quiz:')) return 100;
  return EXACT_MAX[reason] ?? 0;
}
