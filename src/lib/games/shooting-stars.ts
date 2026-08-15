// Shooting Stars — a 30-second tap game. Works any time of day.
export const SHOOTING_STARS_DURATION = 30; // seconds
export const SHOOTING_STARS_SPAWN_MS  = 650; // new meteor every N ms
export const SHOOTING_STARS_MAX_STARS = 10;

export function scoreToStars(score: number): number {
  if (score >= 15) return 10;
  if (score >= 10) return 8;
  if (score >= 5)  return 5;
  if (score >= 1)  return 3;
  return 0;
}
