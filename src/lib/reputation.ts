// Observer reputation, keyed off the on-chain ObserverProfile observation count
// (Proof-of-Observation registry). Higher standing earns a Stars multiplier and
// unlocks the soulbound Telescope Passport. This is the single source of truth
// for tiers — UI, reward calc, and passport metadata all read from here.

export interface ReputationTier {
  /** Stable key used in metadata/serialization. */
  key: 'stargazer' | 'observer' | 'pathfinder' | 'celestial';
  name: string;
  icon: string;
  /** Minimum verified (accepted) observations to hold this tier. */
  min: number;
  /** Stars reward multiplier at this tier. */
  multiplier: number;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  { key: 'stargazer',  name: 'Stargazer',  icon: '👁', min: 0,  multiplier: 1.0 },
  { key: 'observer',   name: 'Observer',   icon: '⭐', min: 5,  multiplier: 1.1 },
  { key: 'pathfinder', name: 'Pathfinder', icon: '🧭', min: 20, multiplier: 1.25 },
  { key: 'celestial',  name: 'Celestial',  icon: '🌌', min: 50, multiplier: 1.5 },
];

/** Tiers at/above this index grant a Telescope Passport (Observer and up). */
export const PASSPORT_MIN_TIER_INDEX = 1;

export interface ReputationStanding {
  tier: ReputationTier;
  tierIndex: number;
  multiplier: number;
  /** The next tier up, or null at the top. */
  nextTier: ReputationTier | null;
  /** Observations remaining to reach nextTier (0 at top). */
  toNext: number;
  /** Progress through the current tier toward the next, 0..100 (100 at top). */
  progressPct: number;
  /** Whether this standing is entitled to a Telescope Passport. */
  hasPassport: boolean;
}

export function tierForCount(count: number): ReputationStanding {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  let tierIndex = 0;
  for (let i = 0; i < REPUTATION_TIERS.length; i++) {
    if (n >= REPUTATION_TIERS[i].min) tierIndex = i;
  }
  const tier = REPUTATION_TIERS[tierIndex];
  const nextTier = REPUTATION_TIERS[tierIndex + 1] ?? null;

  let toNext = 0;
  let progressPct = 100;
  if (nextTier) {
    toNext = Math.max(0, nextTier.min - n);
    const span = nextTier.min - tier.min;
    progressPct = span > 0 ? Math.min(100, Math.round(((n - tier.min) / span) * 100)) : 0;
  }

  return {
    tier,
    tierIndex,
    multiplier: tier.multiplier,
    nextTier,
    toNext,
    progressPct,
    hasPassport: tierIndex >= PASSPORT_MIN_TIER_INDEX,
  };
}

/** Apply the reputation multiplier to a Stars amount (rounded). */
export function applyReputationMultiplier(stars: number, count: number): number {
  if (!Number.isFinite(stars) || stars <= 0) return 0;
  return Math.round(stars * tierForCount(count).multiplier);
}
