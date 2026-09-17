// Getting in and out of the rover, decided rather than teleported: which
// side to climb in from, where the seat is, where a boot can come down on
// the way out, and how a crew that bails leaves the saddle. The rover's
// frame: +z forward, the driver's seat on the left at x −0.38, the tub's
// sides at x ±0.9; the body origin sits 1.1 m up when seated.

import { seatTrack, type Track } from '@/lib/solar-system/suit-scripted';

export interface RoverFrame { x: number; y: number; z: number; yaw: number }
export interface Spot { x: number; y: number; z: number; yaw: number }

const DOOR_X = 1.55;
const DOOR_Z = 0.55;
const SEAT = { x: -0.38, y: 1.1, z: 0.55 };

/** A point in the rover's frame, in the world. */
export function roverPoint(r: RoverFrame, lx: number, ly: number, lz: number): { x: number; y: number; z: number } {
  const c = Math.cos(r.yaw); const s = Math.sin(r.yaw);
  return { x: r.x + lx * c + lz * s, y: r.y + ly, z: r.z - lx * s + lz * c };
}

/** The side (−1 left, +1 right) a crew standing at (cx, cz) should use: the nearer, unless it is blocked. */
export function doorSide(r: RoverFrame, cx: number, cz: number, clear: (x: number, z: number) => boolean): number {
  const c = Math.cos(r.yaw); const s = Math.sin(r.yaw);
  const lx = (cx - r.x) * c - (cz - r.z) * s;
  const near = lx >= 0 ? 1 : -1;
  const p = roverPoint(r, near * DOOR_X, 0, DOOR_Z);
  if (clear(p.x, p.z)) return near;
  const q = roverPoint(r, -near * DOOR_X, 0, DOOR_Z);
  return clear(q.x, q.z) ? -near : near;
}

/** Where the crew stands to climb in or steps down to, on a side, on the ground at `groundY`. */
export function doorSpot(r: RoverFrame, side: number, groundY: number): Spot {
  const p = roverPoint(r, side * DOOR_X, 0, DOOR_Z);
  return { x: p.x, y: groundY, z: p.z, yaw: r.yaw };
}

export function seatSpot(r: RoverFrame): Spot {
  const p = roverPoint(r, SEAT.x, SEAT.y, SEAT.z);
  return { x: p.x, y: p.y, z: p.z, yaw: r.yaw };
}

/** The climb in from a door spot, or down to one. */
export function boardTrack(kind: 'enterVehicle' | 'exitVehicle', r: RoverFrame, side: number, groundY: number, low: boolean): Track {
  return seatTrack(kind, doorSpot(r, side, groundY), seatSpot(r), low);
}

/** Bailing out: the crew leaves the seat sideways with the rover's own speed and a shove, m/s. */
export function bailVelocity(r: RoverFrame, side: number, speed: number, low: boolean): { vx: number; vy: number; vz: number } {
  const c = Math.cos(r.yaw); const s = Math.sin(r.yaw);
  const shove = low ? 2.2 : 1.6;
  return { vx: Math.sin(r.yaw) * speed + c * side * shove, vy: low ? 1.2 : 0.6, vz: Math.cos(r.yaw) * speed - s * side * shove };
}
