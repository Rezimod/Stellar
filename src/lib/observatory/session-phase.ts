/**
 * Where a booked slot is in its own life.
 *
 * The room opens before the slot does: a real instrument unparks, wakes its
 * camera and finds a star to solve on before the paid twenty minutes start, and
 * a visitor arriving to a locked door at 21:19 for a 21:20 slot would be right
 * to think the thing was broken. It closes on the second the slot ends, because
 * the next booking's mount is already moving.
 */

/** How early the room opens. Preparation happens before the slot, not during it. */
export const PREP_LEAD_MS = 5 * 60_000;

export type SessionPhase = 'scheduled' | 'live' | 'ended';

export function sessionPhase(now: number, startsAtMs: number, endsAtMs: number): SessionPhase {
  if (now >= endsAtMs) return 'ended';
  if (now >= startsAtMs - PREP_LEAD_MS) return 'live';
  return 'scheduled';
}
