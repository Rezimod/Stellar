/**
 * Where the four Galilean moons are right now.
 *
 * Io, Europa, Ganymede and Callisto are the best value in a 150 mm scope:
 * visible every clear night, obviously moving hour to hour, and occasionally
 * crossing the disc or slipping behind it. Positions come from
 * `JupiterMoons`, which returns Jupiter-centric state vectors; projecting them
 * onto the sky is what turns them into something you can point at.
 */

import { Body, EquatorFromVector, GeoVector, JupiterMoons, type Vector } from 'astronomy-engine';
import { apparentDiameterArcsec } from './optics';

export type GalileanMoon = {
  id: 'io' | 'europa' | 'ganymede' | 'callisto';
  name: string;
  /** Arcseconds east of Jupiter's centre. Negative is west. */
  eastArcsec: number;
  /** Arcseconds north of Jupiter's centre. */
  northArcsec: number;
  /** Separation from the centre, in Jupiter radii — the unit an eyepiece view uses. */
  separationRadii: number;
  /** True when the moon is between Earth and Jupiter. */
  inFront: boolean;
  /** On the disc: transiting if in front, occulted if behind. */
  state: 'transit' | 'occulted' | 'clear';
};

const NAMES: Record<GalileanMoon['id'], string> = {
  io: 'Io',
  europa: 'Europa',
  ganymede: 'Ganymede',
  callisto: 'Callisto',
};

const ARCSEC_PER_DEG = 3600;

function add(a: Vector, b: { x: number; y: number; z: number }) {
  return { ...a, x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } as Vector;
}

const magnitude = (v: { x: number; y: number; z: number }) =>
  Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

export function galileanMoons(date: Date): GalileanMoon[] {
  const jupiter = GeoVector(Body.Jupiter, date, true);
  const jEq = EquatorFromVector(jupiter);
  const jupiterRadiusArcsec = (apparentDiameterArcsec('jupiter', date) ?? 40) / 2;
  const moons = JupiterMoons(date);
  const cosDec = Math.cos((jEq.dec * Math.PI) / 180);

  return (Object.keys(NAMES) as GalileanMoon['id'][]).map((id) => {
    const relative = moons[id];
    const geo = add(jupiter, relative);
    const eq = EquatorFromVector(geo);

    // Right ascension is in hours; 15 degrees per hour, and the sky converges
    // toward the poles, hence cos(dec).
    let deltaRaHours = eq.ra - jEq.ra;
    if (deltaRaHours > 12) deltaRaHours -= 24;
    if (deltaRaHours < -12) deltaRaHours += 24;

    const eastArcsec = deltaRaHours * 15 * cosDec * ARCSEC_PER_DEG;
    const northArcsec = (eq.dec - jEq.dec) * ARCSEC_PER_DEG;
    const separationArcsec = Math.hypot(eastArcsec, northArcsec);
    const inFront = magnitude(geo) < magnitude(jupiter);
    const onDisc = separationArcsec < jupiterRadiusArcsec;

    return {
      id,
      name: NAMES[id],
      eastArcsec,
      northArcsec,
      separationRadii: separationArcsec / jupiterRadiusArcsec,
      inFront,
      state: onDisc ? (inFront ? 'transit' : 'occulted') : 'clear',
    };
  });
}
