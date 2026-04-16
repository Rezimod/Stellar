// Streak tier logic. Reads the server-authoritative streak count from /api/streak,
// then maps to a multiplier tier. This does NOT own the streak counter itself.

export interface StreakTier {
  streak: number;
  multiplier: number;
  name: string;
  phase: 'new' | 'crescent' | 'half' | 'gibbous' | 'full';
  nextName: string | null;
  nightsToNext: number;
}

const TIERS = [
  { min: 0,  mult: 1.0, name: 'New Star',       phase: 'new' as const,      next: 'Crescent' },
  { min: 3,  mult: 1.5, name: 'Crescent',        phase: 'crescent' as const, next: 'Half Moon' },
  { min: 7,  mult: 2.0, name: 'Half Moon',        phase: 'half' as const,     next: 'Gibbous' },
  { min: 14, mult: 2.5, name: 'Gibbous',          phase: 'gibbous' as const,  next: 'Full Moon' },
  { min: 21, mult: 3.0, name: 'Full Moon',         phase: 'full' as const,     next: null },
];

export function getTierForStreak(streak: number): StreakTier {
  const tier = [...TIERS].reverse().find(t => streak >= t.min) ?? TIERS[0];
  const nextTier = TIERS.find(t => t.min > streak);
  return {
    streak,
    multiplier: tier.mult,
    name: tier.name,
    phase: tier.phase,
    nextName: nextTier?.name ?? null,
    nightsToNext: nextTier ? nextTier.min - streak : 0,
  };
}
