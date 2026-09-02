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

/**
 * Bright targets are imaged in milliseconds and faint ones in seconds, and the
 * gap is four orders of magnitude. It also decides whether any field star
 * survives the exposure: on a 10 ms lunar sub, none do.
 */
export type TargetBrightness = 'bright' | 'faint';

export type SimTarget = {
  id: string;
  name: string;
  brightness: TargetBrightness;
  /** Solar-system bodies move; their position and size are computed. */
  kind: 'body' | 'fixed';
  /** J2000 coordinates, for fixed targets only. */
  ra?: number;
  dec?: number;
  /** Apparent size in arcminutes, for fixed targets only. */
  sizeArcmin?: number;
  /** One line about what you will actually see, not what Hubble saw. */
  expect: string;
  /**
   * How many target diameters the reference photo spans. Saturn's photo is
   * cropped to the rings, which run ~2.3 globe diameters; most others are a
   * disc with a little margin.
   */
  frameSpan?: number;
};

const BODIES: Partial<Record<string, Body>> = {
  moon: Body.Moon,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
};

export const SIM_TARGETS: SimTarget[] = [
  { frameSpan: 1.02, id: 'moon', brightness: 'bright', name: 'The Moon', kind: 'body',
    expect: 'Overflows the frame. Crater shadows along the terminator are the show.' },
  { id: 'jupiter', brightness: 'bright', name: 'Jupiter', kind: 'body',
    expect: 'A small bright disc. Two cloud belts and the four Galilean moons.' },
  { frameSpan: 2.35, id: 'saturn', brightness: 'bright', name: 'Saturn', kind: 'body',
    expect: 'Smaller than you expect, and the rings are still unmistakable.' },
  { id: 'mars', brightness: 'bright', name: 'Mars', kind: 'body',
    expect: 'A tiny ochre disc. Surface detail only near opposition.' },
  { id: 'venus', brightness: 'bright', name: 'Venus', kind: 'body',
    expect: 'A brilliant featureless phase. Bright enough to hurt at low gain.' },
  { frameSpan: 1.0, id: 'm42', brightness: 'faint', name: 'Orion Nebula', kind: 'fixed', ra: 5.591, dec: -5.391, sizeArcmin: 85,
    expect: 'Overflows the frame. The Trapezium and the bright core fill it.' },
  { frameSpan: 1.0, id: 'm31', brightness: 'faint', name: 'Andromeda Galaxy', kind: 'fixed', ra: 0.712, dec: 41.269, sizeArcmin: 178,
    expect: 'Far larger than the field. You are looking at the core only.' },
  { frameSpan: 2.0, id: 'm57', brightness: 'faint', name: 'Ring Nebula', kind: 'fixed', ra: 18.886, dec: 33.029, sizeArcmin: 1.4,
    expect: 'A small grey smoke ring. Stacking is what brings it out.' },
];

export const SIM_TARGET_BY_ID = new Map(SIM_TARGETS.map((t) => [t.id, t]));

/** Sub-exposure choices, in seconds. Lucky imaging on the left, DSO on the right. */
export const EXPOSURES: Record<TargetBrightness, number[]> = {
  bright: [0.005, 0.01, 0.02, 0.05],
  faint: [0.5, 2, 8, 30],
};

/** Default when a target does not declare one: a disc with a little margin. */
export function targetFrameSpan(target: SimTarget): number {
  return target.frameSpan ?? 1.15;
}

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
