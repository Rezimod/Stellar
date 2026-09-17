// What the stick means on foot, for every surface and every controller.
// The stick is in the camera's frame; the walk wants it in the world's. Its
// length picks the gait — a nudge is a walk, most of the way is a jog, hard
// over is a run — and Shift is a sprint whether held or tapped: a tap
// latches until the stick is let go, so a thumb on a phone gets the same
// deal as a finger on a key.

import type { WalkInput } from '@/lib/solar-system/suit-locomotion';

export interface FootStick {
  /** Camera frame: x right, y forward, each in [−1, 1]. */
  moveX: number;
  moveY: number;
  jump: boolean;
  run: boolean;
  sprint: boolean;
  walk: boolean;
  crouch: boolean;
}

export interface SprintLatch {
  /** A tap of the sprint key latches until the stick is let go. */
  latched: boolean;
  wasDown: boolean;
  downFor: number;
}

export function makeSprintLatch(): SprintLatch { return { latched: false, wasDown: false, downFor: 0 }; }

/** Resolve hold-or-tap sprint: held is a sprint; a tap shorter than a third of a second latches one. */
export function sprintFrom(latch: SprintLatch, down: boolean, moving: boolean, dt: number): boolean {
  if (down) latch.downFor += dt;
  if (!down && latch.wasDown && latch.downFor < 0.33 && moving) latch.latched = true;
  if (!down) latch.downFor = 0;
  if (!moving) latch.latched = false;
  latch.wasDown = down;
  return down || latch.latched;
}

/** Fill the walk's world-space intent from the camera-frame stick and the camera's yaw. */
export function walkFromStick(out: WalkInput, s: FootStick, camYaw: number, jumpEdge: boolean, work: boolean): WalkInput {
  const fx = -Math.sin(camYaw); const fz = -Math.cos(camYaw);
  const rx = -fz; const rz = fx;
  const len = Math.hypot(s.moveX, s.moveY);
  const k = len > 1 ? 1 / len : 1;
  out.moveX = (fx * s.moveY + rx * s.moveX) * k;
  out.moveZ = (fz * s.moveY + rz * s.moveX) * k;
  out.run = s.run && !s.crouch;
  out.sprint = s.sprint && !s.crouch;
  out.walk = s.walk;
  out.crouch = s.crouch;
  out.jump = jumpEdge;
  out.work = work;
  return out;
}

/** A standard-mapping gamepad's dead zone, with the rest of the travel spread back over 0…1. */
export function deadZone(v: number, dz = 0.15): number {
  return Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz);
}
