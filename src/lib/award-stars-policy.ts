// Server-side guardrails for /api/award-stars — keeps external-wallet
// flows working while blocking arbitrary mint requests.

const EXACT_REASONS = new Set([
  'daily_checkin',
  'cosmic_daily',
  'weekly_challenge',
  'telescope:first-registration',
]);

const PREFIX_REASONS = ['find:', 'cosmic_bonus:', 'quiz:'] as const;

const EXACT_MAX: Record<string, number> = {
  daily_checkin: 500,
  cosmic_daily: 100,
  weekly_challenge: 500,
  'telescope:first-registration': 50,
};

export function isAllowedAwardReason(reason: string): boolean {
  if (EXACT_REASONS.has(reason)) return true;
  return PREFIX_REASONS.some((p) => reason.startsWith(p));
}

export function maxAwardAmountForReason(reason: string): number {
  if (reason.startsWith('find:')) return 10;
  if (reason.startsWith('cosmic_bonus:')) return 100;
  if (reason.startsWith('quiz:')) return 1000;
  return EXACT_MAX[reason] ?? 0;
}
