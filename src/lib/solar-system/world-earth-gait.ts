// How the pilot moves through Tbilisi: like a third-person game rather than
// a pressure suit. Holding the stick is a jog, Shift is a sprint, a turn is
// taken in a stride, a stop is a plant, and a jump clears a kerb. It is the
// same locomotion as every other world — only the numbers are Earth's own
// and a game's: a full g, no suit, and a body that answers at once.

import { EARTH_G, gaitProfile, type GaitProfile } from '@/lib/solar-system/suit-locomotion';

export function earthGait(): GaitProfile {
  const base = gaitProfile(EARTH_G, false);
  return {
    ...base,
    // Jog 3.3 m/s by default, sprint 6.4 m/s: faster than the pendulum's
    // limit, so both are runs with a brief flight, as they are in life.
    walk: 3.3,
    run: 6.4,
    crouch: 1.3,
    grip: 1.45,
    muscle: 18,
    brake: 12,
    hop: 3.0,
    runHop: 0.6,
    turnStill: 12,
    turnRun: 8,
    turnStep: 0.16,
    reach: 1.25,
    air: 2.4,
    getUp: 0.7,
  };
}

/** The camera for it: low over the shoulder, quick to swing behind, a wider lens at a sprint. */
export const EARTH_CHASE = { height: 1.55, distance: 3.8, shoulder: 0.42, follow: 4.5, lead: 0.2, leadMax: 1.2, fovKick: 9, horizontal: 16, vertical: 9 };
