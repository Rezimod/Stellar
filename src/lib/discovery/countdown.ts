export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target has passed. */
  reached: boolean;
};

/** Time left until `targetMs`, clamped at zero. Shared by the landing
 *  countdown and the pre-reveal panel so the two cannot disagree. */
export function remainingUntil(targetMs: number, nowMs: number): Remaining {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    reached: total === 0,
  };
}
