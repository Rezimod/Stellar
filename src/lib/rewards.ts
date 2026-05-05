// Rewards are tokens-only. The old voucher / discount-code / product unlock
// system was removed — the loop is: mint Stars → spend Stars (burn for
// marketplace discount, redeem at Astroman till, or buy Star-Shop items).
//
// Star payouts per mission tier and the event-window 2x bonus live in
// `@/lib/constants` (STAR_PAYOUT_BY_TIER, EVENT_BONUS_MULTIPLIER).

export const RANK_THRESHOLDS = [
  { name: 'Stargazer',  icon: '👁️',  min: 0 },
  { name: 'Observer',   icon: '⭐',  min: 1 },
  { name: 'Pathfinder', icon: '🧭',  min: 3 },
  { name: 'Celestial',  icon: '🌌',  min: 5 },
] as const;

export interface Rank {
  name: string;
  icon: string;
  nextRank: string | null;
  progressPct: number;
}

export function getRank(sightings: number): Rank {
  const idx = RANK_THRESHOLDS.reduce(
    (best, r, i) => (sightings >= r.min ? i : best),
    0,
  );
  const current = RANK_THRESHOLDS[idx];
  const next = RANK_THRESHOLDS[idx + 1] ?? null;
  if (!next) {
    return { name: current.name, icon: current.icon, nextRank: null, progressPct: 100 };
  }
  const progressPct = Math.round(
    ((sightings - current.min) / (next.min - current.min)) * 100,
  );
  return { name: current.name, icon: current.icon, nextRank: next.name, progressPct };
}
