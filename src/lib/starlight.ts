// Starlight — nightly observation energy. Resets at 19:00 local time.
// Designed to coexist with the existing `attemptsToday >= 3` logic in MissionList.
const STARLIGHT_KEY = 'stellar-starlight-v1';
const MAX_STARLIGHT = 3;

interface StarlightState {
  remaining: number;
  resetDate: string;
}

/** Returns YYYY-MM-DD for "tonight". Before 19:00, returns yesterday's date. */
export function getTonightKey(): string {
  const now = new Date();
  if (now.getHours() < 19) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return y.toLocaleDateString('sv');
  }
  return now.toLocaleDateString('sv');
}

export function getStarlight(): StarlightState {
  if (typeof window === 'undefined') return { remaining: MAX_STARLIGHT, resetDate: '' };
  try {
    const saved: StarlightState = JSON.parse(localStorage.getItem(STARLIGHT_KEY) ?? '{}');
    if (saved.resetDate === getTonightKey()) return saved;
    return { remaining: MAX_STARLIGHT, resetDate: getTonightKey() };
  } catch {
    return { remaining: MAX_STARLIGHT, resetDate: getTonightKey() };
  }
}

export function consumeStarlight(): boolean {
  if (typeof window === 'undefined') return false;
  const s = getStarlight();
  if (s.remaining <= 0) return false;
  localStorage.setItem(STARLIGHT_KEY, JSON.stringify({
    remaining: s.remaining - 1,
    resetDate: getTonightKey(),
  }));
  return true;
}

export const MAX_STARLIGHT_VALUE = MAX_STARLIGHT;
export function hasStarlight(): boolean { return getStarlight().remaining > 0; }
