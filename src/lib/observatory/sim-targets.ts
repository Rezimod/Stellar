/**
 * What a visitor can point the simulator at.
 *
 * Deliberately short. A first session should be a thing you can actually see
 * in a 150 mm instrument, not a catalogue to get lost in. The Sun is absent on
 * purpose — the safety envelope refuses it, and the list should not offer what
 * the instrument will not do.
 */

import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import { raDecToAzAlt } from '@/lib/sky/catalog';
import { TARGET_PHOTOS, type TargetPhoto } from '@/lib/sky/target-photos';
import { apparentDiameterArcsec } from './optics';
import type { AltAz } from './safety';
import type { ObservatoryNode } from './types';

export type SimTarget = {
  id: string;
  name: string;
  /** Solar-system bodies move; their position and size are computed. */
  kind: 'body' | 'fixed';
  /** J2000 coordinates, for fixed targets only. */
  ra?: number;
  dec?: number;
  /** Apparent size in arcminutes, for fixed targets only. */
  sizeArcmin?: number;
  /** One line about what you will actually see, not what Hubble saw. */
  expect: string;
};

const BODIES: Partial<Record<string, Body>> = {
  moon: Body.Moon,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

export const SIM_TARGETS: SimTarget[] = [
  { id: 'moon', name: 'The Moon', kind: 'body',
    expect: 'Overflows the frame. Crater shadows along the terminator are the show.' },
  { id: 'jupiter', name: 'Jupiter', kind: 'body',
    expect: 'A small bright disc. Two cloud belts and the four Galilean moons.' },
  { id: 'saturn', name: 'Saturn', kind: 'body',
    expect: 'Smaller than you expect, and the rings are still unmistakable.' },
  { id: 'mars', name: 'Mars', kind: 'body',
    expect: 'A tiny ochre disc. Surface detail only near opposition.' },
  { id: 'venus', name: 'Venus', kind: 'body',
    expect: 'A brilliant featureless phase. Bright enough to hurt at low gain.' },
  { id: 'm42', name: 'Orion Nebula', kind: 'fixed', ra: 5.591, dec: -5.391, sizeArcmin: 85,
    expect: 'Overflows the frame. The Trapezium and the bright core fill it.' },
  { id: 'm31', name: 'Andromeda Galaxy', kind: 'fixed', ra: 0.712, dec: 41.269, sizeArcmin: 178,
    expect: 'Far larger than the field. You are looking at the core only.' },
  { id: 'm57', name: 'Ring Nebula', kind: 'fixed', ra: 18.886, dec: 33.029, sizeArcmin: 1.4,
    expect: 'A small grey smoke ring. Stacking is what brings it out.' },
];

export const SIM_TARGET_BY_ID = new Map(SIM_TARGETS.map((t) => [t.id, t]));

export function targetPhoto(target: SimTarget): TargetPhoto | null {
  return TARGET_PHOTOS[target.id] ?? null;
}

export function targetAltAz(target: SimTarget, node: ObservatoryNode, date: Date): AltAz {
  if (target.kind === 'fixed') {
    const { altitude, azimuth } = raDecToAzAlt(target.ra!, target.dec!, node.lat, node.lon, date);
    return { altitude, azimuth };
  }

  const observer = new Observer(node.lat, node.lon, 0);
  const eq = Equator(BODIES[target.id]!, date, observer, true, true);
  const horizon = Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return { altitude: horizon.altitude, azimuth: horizon.azimuth };
}

/** Apparent size in arcminutes — computed for bodies, catalogued for the rest. */
export function targetSizeArcmin(target: SimTarget, date: Date): number {
  if (target.kind === 'fixed') return target.sizeArcmin!;
  return (apparentDiameterArcsec(target.id, date) ?? 60) / 60;
}
