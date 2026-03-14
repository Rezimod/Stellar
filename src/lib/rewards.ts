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
    description: 'Complete all 5 missions → Free Custom Star Map (framed, 180 GEL value)',
    type: 'product',
    value: '180 GEL',
    requirement: 'set',
    requiredMissions: ['moon', 'jupiter', 'orion', 'saturn', 'pleiades'],
    icon: '🏆',
    claimed: false,
    code: 'CELESTIAL',
  },
];

export function getRank(sightings: number): { name: string; icon: string } {
  if (sightings >= 5) return { name: 'Celestial', icon: '🌌' };
  if (sightings >= 3) return { name: 'Pathfinder', icon: '🧭' };
  if (sightings >= 1) return { name: 'Observer', icon: '⭐' };
  return { name: 'Stargazer', icon: '👁️' };
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
};
