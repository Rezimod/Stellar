// The way down starts in the ship, not on a loading screen.
//
// Ask for the surface with a world under the nose and the ship flies the
// arrival itself: it turns onto the body and runs in (transit), comes off
// the gas and swings around to the side the Earth is on so the crew see
// home behind the mare (approach), then pitches over with the nose down at
// the ground and hands the vehicle to the lander (pitch-over).
//
// This file is the profile only — where the ship should be at a given
// second, as a distance in body radii, how far around it has swung, and
// how far the nose has come down. player-ship.ts turns that into a pose,
// and the surface loads underneath it.

export type ApproachPhase = 'transit' | 'approach' | 'pitchover' | 'done';

export interface ApproachLeg {
  phase: ApproachPhase;
  seconds: number;
  /** How far down to the handover height the leg gets, 0…1 — a fraction of
   *  the way rather than a height, so the run is the same eleven seconds
   *  whether it was asked for from a low pass or from halfway across the
   *  system. */
  drop: number;
  /** How far around the body the ship has swung by the end, 0…1. */
  swing: number;
  /** How far the nose has come down from along-track to straight down, 0…1. */
  pitch: number;
}

/** Eleven and a half seconds: long enough to read as a journey, short
 *  enough that nobody who has seen it twice resents it. */
export const APPROACH_LEGS: ApproachLeg[] = [
  { phase: 'transit', seconds: 4.5, drop: 0.55, swing: 0.35, pitch: 0 },
  { phase: 'approach', seconds: 4.5, drop: 0.88, swing: 0.85, pitch: 0.35 },
  { phase: 'pitchover', seconds: 2.5, drop: 1, swing: 1, pitch: 1 },
];
export const APPROACH_SECONDS = APPROACH_LEGS.reduce((s, l) => s + l.seconds, 0);
/** Where the ship hands the crew to the lander: a little over the surface,
 *  clear of the hull and of every ridge on it. */
export const APPROACH_END_RADII = 1.06;
/** The run never starts from further out than this, so crossing the system
 *  is the same eleven seconds as dropping out of orbit. */
export const APPROACH_MAX_RADII = 42;
/** Nor from closer in than the handover height: there has to be a way down. */
export const APPROACH_MIN_RADII = 1.25;

export interface ApproachPose {
  phase: ApproachPhase;
  /** 0…1 through the current leg. */
  legT: number;
  /** 0…1 through the whole arrival. */
  t: number;
  /** Where the ship is, in body radii from its centre. */
  radii: number;
  /** 0…1 from the direction the ship was in to the one it lands from. */
  swing: number;
  /** 0…1 from flying along the track to looking straight down. */
  pitch: number;
  done: boolean;
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Where the arrival is at `elapsed` seconds, having begun `startRadii` out. */
export function approachPose(elapsed: number, startRadii: number): ApproachPose {
  const from = Math.min(APPROACH_MAX_RADII, Math.max(APPROACH_MIN_RADII, startRadii));
  const height = (drop: number) => from + (APPROACH_END_RADII - from) * drop;
  const clock = Math.max(0, elapsed);
  let t0 = 0;
  let drop = 0;
  let swing = 0;
  let pitch = 0;
  for (const leg of APPROACH_LEGS) {
    const legT = Math.min(1, Math.max(0, (clock - t0) / leg.seconds));
    if (legT < 1) {
      const e = smooth(legT);
      return {
        phase: leg.phase,
        legT,
        t: Math.min(1, clock / APPROACH_SECONDS),
        radii: height(drop + (leg.drop - drop) * e),
        swing: swing + (leg.swing - swing) * e,
        pitch: pitch + (leg.pitch - pitch) * e,
        done: false,
      };
    }
    t0 += leg.seconds;
    drop = leg.drop;
    swing = leg.swing;
    pitch = leg.pitch;
  }
  return { phase: 'done', legT: 1, t: 1, radii: height(drop), swing, pitch, done: true };
}
