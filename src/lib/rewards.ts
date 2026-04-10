export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'voucher' | 'product' | 'experience';
  value: string;
  requirement: 'single' | 'set' | 'rank';
  requiredMissions?: string[];
  requiredRank?: string;
  requiredCount?: number;
  icon: string;
  claimed: boolean;
  code?: string;
}

export const REWARDS: Reward[] = [
  {
    id: 'first-light',
    name: 'First Light',
    description: '10% off your next purchase at astroman.ge',
    type: 'discount',
    value: '10%',
    requirement: 'single',
    requiredCount: 1,
    icon: '🎫',
    claimed: false,
    code: 'FIRSTLIGHT10',
  },
  {
    id: 'moon-reward',
    name: 'Lunar Explorer',
    description: 'Free Moon Lamp (15cm) — collect at Astroman store',
    type: 'product',
    value: '85 GEL',
    requirement: 'single',
    requiredMissions: ['moon'],
    icon: '🌕',
    claimed: false,
    code: 'MOONLAMP-GEO',
  },
  {
    id: 'complete-all',
    name: 'Celestial',
    description: 'Complete all 5 beginner/intermediate missions → Free Custom Star Map (framed, 180 GEL value)',
    type: 'product',
    value: '180 GEL',
    requirement: 'set',
    requiredMissions: ['moon', 'jupiter', 'orion', 'saturn', 'pleiades'],
    icon: '🏆',
    claimed: false,
    code: 'CELESTIAL',
  },
  {
    id: 'andromeda-reward',
    name: 'Galaxy Hunter',
    description: 'Observe the Andromeda Galaxy → 100 GEL Astroman store voucher',
    type: 'voucher',
    value: '100 GEL',
    requirement: 'single',
    requiredMissions: ['andromeda'],
    icon: '🎟️',
    claimed: false,
    code: 'GALAXY100',
  },
  {
    id: 'crab-reward',
    name: 'Supernova Master',
    description: 'Capture the Crab Nebula → Win a brand new telescope from Astroman',
    type: 'product',
    value: 'Telescope',
    requirement: 'single',
    requiredMissions: ['crab'],
    icon: '🔭',
    claimed: false,
    code: 'TELESCOPE-PRIZE',
  },
];

const RANK_THRESHOLDS = [
  { name: 'Stargazer', icon: '👁️', min: 0 },
  { name: 'Observer', icon: '⭐', min: 1 },
  { name: 'Pathfinder', icon: '🧭', min: 3 },
  { name: 'Celestial', icon: '🌌', min: 5 },
];

export function getRank(sightings: number): { name: string; icon: string; nextRank: string | null; progressPct: number } {
  const idx = RANK_THRESHOLDS.reduce((best, r, i) => (sightings >= r.min ? i : best), 0);
  const current = RANK_THRESHOLDS[idx];
  const next = RANK_THRESHOLDS[idx + 1] ?? null;
  if (!next) return { name: current.name, icon: current.icon, nextRank: null, progressPct: 100 };
  const progressPct = Math.round(((sightings - current.min) / (next.min - current.min)) * 100);
  return { name: current.name, icon: current.icon, nextRank: next.name, progressPct };
}

export function getUnlockedRewards(
  completedMissionIds: string[],
  rank: string
): (Reward & { unlocked: boolean; progress: number })[] {
  return REWARDS.map(reward => {
    let unlocked = false;
    let progress = 0;

    if (reward.requirement === 'single' && reward.requiredCount) {
      unlocked = completedMissionIds.length >= reward.requiredCount;
      progress = Math.min(completedMissionIds.length / reward.requiredCount, 1);
    }

    if (reward.requirement === 'single' && reward.requiredMissions) {
      unlocked = reward.requiredMissions.every(id => completedMissionIds.includes(id));
      progress = unlocked ? 1 : 0;
    }

    if (reward.requirement === 'set' && reward.requiredMissions) {
      const completed = reward.requiredMissions.filter(id => completedMissionIds.includes(id)).length;
      progress = completed / reward.requiredMissions.length;
      unlocked = completed === reward.requiredMissions.length;
    }

    if (reward.requirement === 'rank') {
      const rankOrder = ['Stargazer', 'Observer', 'Pathfinder', 'Celestial'];
      const currentRankIndex = rankOrder.indexOf(rank);
      const requiredRankIndex = rankOrder.indexOf(reward.requiredRank || '');
      unlocked = currentRankIndex >= requiredRankIndex;
      progress = unlocked ? 1 : currentRankIndex / requiredRankIndex;
    }

    return { ...reward, unlocked, progress };
  });
}

// Get mission IDs that feed into a specific reward
export const MISSION_REWARD_HINTS: Record<string, string> = {
  moon: 'Unlocks: Free Moon Lamp',
  jupiter: 'Part of: Celestial (Free Star Map)',
  orion: 'Part of: Celestial (Free Star Map)',
  saturn: 'Part of: Celestial (Free Star Map)',
  pleiades: 'Part of: Celestial (Free Star Map)',
  andromeda: 'Unlocks: 100 GEL Voucher',
  crab: 'Unlocks: Brand New Telescope',
};
