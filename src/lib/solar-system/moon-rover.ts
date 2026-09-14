// The cargo rover, driveable. A simple ground vehicle on the heightfield:
// throttle and steering from the stick, wheels that turn, the body seated
// on the slope under it, dust off the wheels, tracks left behind. Low
// gravity means little grip — it slides wide on a fast turn, on purpose.

import * as THREE from 'three';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { DustHandle } from '@/lib/solar-system/moon-fx';
import type { PrintsHandle } from '@/lib/solar-system/moon-prints';
import type { TerrainHandle } from '@/lib/solar-system/moon-terrain';

export interface RoverHandle {
  speed: number;
  yaw: number;
  driving: boolean;
  update: (dt: number, throttle: number, steer: number, colliders: Collider[], walkRadius: number) => void;
}

const TOP = 7.5;
const ACCEL = 2.6;
const BRAKE = 4.5;
const STEER_RATE = 0.9;

export function makeRover(group: THREE.Group, collider: Collider, wheels: THREE.Object3D[], terrain: TerrainHandle, dust: DustHandle, prints: PrintsHandle): RoverHandle {
  const n = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const yawQ = new THREE.Quaternion();
  let wheelSpin = 0;
  let trackAcc = 0;
  let slide = 0;
  const handle: RoverHandle = {
    speed: 0, yaw: group.rotation.y, driving: false,
    update(dt, throttle, steer, colliders, walkRadius) {
      const s = handle.speed;
      if (handle.driving) {
        const target = throttle * TOP;
        const rate = Math.abs(target) < Math.abs(s) || Math.sign(target) !== Math.sign(s) ? BRAKE : ACCEL;
        handle.speed += THREE.MathUtils.clamp(target - s, -rate * dt, rate * dt);
      } else {
        handle.speed *= Math.exp(-dt * 2);
      }
      const v = handle.speed;
      // Steering authority grows with speed; grip fades with it (regolith slides).
      const turn = -steer * STEER_RATE * THREE.MathUtils.clamp(Math.abs(v) / 2.5, 0, 1) * Math.sign(v || 1);
      handle.yaw += turn * dt;
      slide += ((Math.abs(turn) > 0.3 && Math.abs(v) > 5 ? 0.35 : 0) - slide) * (1 - Math.exp(-dt * 2));
      const fx = Math.sin(handle.yaw); const fz = Math.cos(handle.yaw);
      const sx = -Math.cos(handle.yaw) * slide * v * 0.2; const sz = Math.sin(handle.yaw) * slide * v * 0.2;
      let x = group.position.x + (fx * v + sx) * dt;
      let z = group.position.z + (fz * v + sz) * dt;
      const rr = Math.hypot(x, z);
      if (rr > walkRadius - 2) { x *= (walkRadius - 2) / rr; z *= (walkRadius - 2) / rr; handle.speed *= 0.3; }
      for (const c of colliders) {
        if (c === collider) continue;
        const dx = x - c.x; const dz = z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + collider.r;
        if (d < min && d > 1e-4) {
          x += dx * (min - d) / d;
          z += dz * (min - d) / d;
          handle.speed *= 0.2;
        }
      }
      group.position.x = x; group.position.z = z;
      group.position.y = terrain.heightAt(x, z);
      collider.x = x; collider.z = z;
      // Seat the body on the slope, then yaw.
      terrain.normalAt(x, z, n);
      q.setFromUnitVectors(up, n);
      yawQ.setFromAxisAngle(up, handle.yaw);
      group.quaternion.copy(q).multiply(yawQ);
      wheelSpin += v / 0.55 * dt;
      for (const w of wheels) w.rotation.x = wheelSpin;
      // Dust from the rear wheels, tracks under all six.
      if (Math.abs(v) > 0.6) {
        const k = Math.abs(v) / TOP;
        dust.burst({ x: x - fx * 1.6, y: group.position.y, z: z - fz * 1.6, count: Math.round(2 + k * 8), speedMin: 0.5, speedMax: 1.2 + k * 3, cone: 0.9, size: 0.14, dirX: -fx, dirZ: -fz, bias: 1.2 });
        trackAcc += Math.abs(v) * dt;
        if (trackAcc > 0.7) {
          trackAcc = 0;
          for (const side of [-1, 1]) {
            const tx = x + Math.cos(handle.yaw) * side * 1.35; const tz = z - Math.sin(handle.yaw) * side * 1.35;
            prints.track(tx, terrain.heightAt(tx, tz), tz, handle.yaw, 0.36);
          }
        }
      }
    },
  };
  return handle;
}
