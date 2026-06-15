// Config for the "Missions Tonight" page. Single source of truth for the
// session goal, the main-quest default, the community mission, and the coupon
// reward ladder. Per-mission visibility/status is computed live in the page
// from astronomy-engine; this file only holds the tunable constants.

// Tonight's session Star goal — drives the 5-star row in the progress summary.
export const NIGHT_STAR_GOAL = 450;

// Default main-quest target id. When set, it overrides the auto-pick; when null
// the page picks the best visible incomplete target (falls back to Saturn).
export const MAIN_QUEST_ID: string | null = null;

// Global community mission. Every observer of TARGET today nudges the counter
// toward GOAL; contributors share BONUS_STARS. The live count is SEED + the real
// observation_log rows for TARGET today — SEED reflects the existing community so
// a freshly shipped counter doesn't read zero. Tune target/goal here.
export const GLOBAL_MISSION = {
  target: 'Saturn',
  seed: 12845,
  goal: 25000,
  bonusStars: 30,
} as const;

// Astroman coupon ladder. Grounded in the real Stars economy used at checkout
// (~100 Stars ≈ 1% off catalog price — see MissionActive + stars-economy). Each
// tier is the lifetime Stars needed to unlock that discount coupon.
export const REWARD_LADDER = [
  { stars: 500, pct: 5 },
  { stars: 1000, pct: 10 },
  { stars: 1500, pct: 15 },
  { stars: 2000, pct: 20 },
] as const;

export type RewardTier = (typeof REWARD_LADDER)[number];

// The next coupon a member is working toward, given their lifetime Stars.
export function nextReward(lifetimeStars: number): RewardTier | null {
  return REWARD_LADDER.find((r) => lifetimeStars < r.stars) ?? null;
}
