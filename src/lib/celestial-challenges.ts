const CHALLENGE_KEY = 'stellar-challenge-progress-v1';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  glyph: string;
  goal: number;
  bonusStars: number;
  condition: 'observations' | 'clear_sky' | 'unique_targets' | 'late_night';
  param?: number;
}

const CHALLENGES: Challenge[] = [
  { id: 'clear-hunter', name: 'Clear Sky Hunter',  description: 'Observe 3 times with Sky Score above 70', glyph: '◇', goal: 3, bonusStars: 150, condition: 'clear_sky', param: 70 },
  { id: 'night-owl',    name: 'Night Owl',         description: 'Observe 2 times after midnight',          glyph: '☾', goal: 2, bonusStars: 100, condition: 'late_night' },
  { id: 'explorer',     name: 'Cosmic Explorer',   description: 'Observe 3 different targets this week',   glyph: '✦', goal: 3, bonusStars: 120, condition: 'unique_targets' },
  { id: 'devoted',      name: 'Devoted Observer',  description: 'Complete 5 observations this week',       glyph: '◉', goal: 5, bonusStars: 200, condition: 'observations' },
  { id: 'clarity',      name: 'Crystal Night',     description: 'Score 85+ on any single observation',     glyph: '◆', goal: 1, bonusStars:  75, condition: 'clear_sky', param: 85 },
  { id: 'trio',         name: 'Celestial Trio',    description: 'Observe 3 different targets this week',    glyph: '⋆', goal: 3, bonusStars: 175, condition: 'unique_targets' },
];

interface Progress {
  weekId: number;
  challengeId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  targets?: string[];
}

function currentWeekId(): number { return Math.floor(Date.now() / 604800000); }

export function getActiveChallenge(): Challenge {
  return CHALLENGES[currentWeekId() % CHALLENGES.length];
}

export function getChallengeProgress(): Progress {
  if (typeof window === 'undefined') return { weekId: 0, challengeId: '', progress: 0, completed: false, claimed: false };
  try {
    const saved: Progress = JSON.parse(localStorage.getItem(CHALLENGE_KEY) ?? '{}');
    const weekId = currentWeekId();
    const active = getActiveChallenge();
    if (saved.weekId === weekId && saved.challengeId === active.id) return saved;
    return { weekId, challengeId: active.id, progress: 0, completed: false, claimed: false, targets: [] };
  } catch {
    return { weekId: currentWeekId(), challengeId: getActiveChallenge().id, progress: 0, completed: false, claimed: false, targets: [] };
  }
}

export function recordChallengeProgress(skyScore: number, target: string): { justCompleted: boolean } {
  if (typeof window === 'undefined') return { justCompleted: false };
  const c = getActiveChallenge();
  const p = getChallengeProgress();
  if (p.completed) return { justCompleted: false };

  let newProgress = p.progress;
  const targets = p.targets ?? [];
  switch (c.condition) {
    case 'observations': newProgress++; break;
    case 'clear_sky': if (skyScore >= (c.param ?? 70)) newProgress++; break;
    case 'unique_targets': {
      const t = target.toLowerCase();
      if (!targets.includes(t)) { targets.push(t); newProgress = targets.length; }
      break;
    }
    case 'late_night': {
      const h = new Date().getHours();
      if (h >= 0 && h < 5) newProgress++;
      break;
    }
  }
  const completed = newProgress >= c.goal;
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify({
    weekId: currentWeekId(), challengeId: c.id, progress: newProgress, completed, claimed: p.claimed, targets,
  }));
  return { justCompleted: completed && !p.completed };
}

export function claimChallengeReward(): number {
  if (typeof window === 'undefined') return 0;
  const p = getChallengeProgress();
  if (!p.completed || p.claimed) return 0;
  const c = getActiveChallenge();
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify({ ...p, claimed: true }));
  return c.bonusStars;
}
