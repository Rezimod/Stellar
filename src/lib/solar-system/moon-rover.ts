// The rover, driveable. A rocker-bogie six-wheeler on the heightfield:
// throttle and steering from the stick, six wheels that each find their
// own ground so the rockers and bogies articulate over every rise, the
// body riding on the average of them and pitching and rolling with the
// slope, the corner wheels steering, the camera head looking into the
// turn, headlights on while it is driven, dust off the wheels, tracks left
// behind. Low gravity means little grip — it slides wide on a fast turn,
// on purpose.

import * as THREE from 'three';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { DustHandle } from '@/lib/solar-system/moon-fx';
import type { PrintsHandle } from '@/lib/solar-system/moon-prints';
import type { TerrainHandle } from '@/lib/solar-system/moon-terrain';

/** The parts of the rover the drive articulates, built by moon-base. */
export interface RoverParts {
  /** The six wheel hubs, spun about their axles. */
  spin: THREE.Object3D[];
  /** The four corner pivots, turned to steer: front left, rear left, front right, rear right. */
  steer: THREE.Object3D[];
  /** Left and right rocker arms, then the bogies hung from them. */
  rockers: THREE.Object3D[];
  bogies: THREE.Object3D[];
  /** Where each wheel meets the ground, in the body's frame: per side, front, middle, rear. */
  wheelXZ: [number, number][];
  /** The camera head on the mast. */
  mast: THREE.Object3D;
  headlight: THREE.SpotLight;
}

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
/** How far a corner wheel turns at full lock, and how fast the body and
 *  the arms follow the ground (per second). */
const STEER_LOCK = 0.42;
const SUSPENSION = 7;

export function makeRover(group: THREE.Group, collider: Collider, parts: RoverParts, terrain: TerrainHandle, dust: DustHandle, prints: PrintsHandle): RoverHandle {
  const up = new THREE.Vector3(0, 1, 0);
  const yawQ = new THREE.Quaternion();
  const tiltQ = new THREE.Quaternion();
  const tilt = new THREE.Euler();
  let wheelSpin = 0;
  let trackAcc = 0;
  let slide = 0;
  let pitch = 0;
  let roll = 0;
  const rockerTilt = [0, 0];
  const bogieTilt = [0, 0];
  let steerAngle = 0;
  let mastYaw = 0;
  let idle = 0;
  const heights = new Float32Array(6);
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
      collider.x = x; collider.z = z;

      // ── Six wheels, six grounds. The body rides on their mean and leans
      // with the slope between front and rear, left and right; each rocker
      // tilts to put its front wheel down, each bogie to put both of its
      // wheels down. ──
      const c = Math.cos(handle.yaw); const sn = Math.sin(handle.yaw);
      for (let i = 0; i < 6; i++) {
        const [lx, lz] = parts.wheelXZ[i];
        heights[i] = terrain.heightAt(x + lx * c + lz * sn, z - lx * sn + lz * c);
      }
      const left = (heights[0] + heights[1] + heights[2]) / 3;
      const right = (heights[3] + heights[4] + heights[5]) / 3;
      const front = (heights[0] + heights[3]) / 2;
      const rear = (heights[1] + heights[2] + heights[4] + heights[5]) / 4;
      const k = 1 - Math.exp(-dt * SUSPENSION);
      group.position.y += ((left + right) / 2 - group.position.y) * k;
      pitch += (-Math.atan2(front - rear, 2.3) - pitch) * k;
      roll += (Math.atan2(right - left, 2.7) - roll) * k;
      yawQ.setFromAxisAngle(up, handle.yaw);
      tilt.set(pitch, 0, roll);
      tiltQ.setFromEuler(tilt);
      group.quaternion.copy(yawQ).multiply(tiltQ);
      for (let side = 0; side < 2; side++) {
        const hf = heights[side * 3]; const hm = heights[side * 3 + 1]; const hr = heights[side * 3 + 2];
        const rockerTarget = -Math.atan2(hf - (hm + hr) / 2, 2.1) - pitch;
        rockerTilt[side] += (rockerTarget - rockerTilt[side]) * k;
        parts.rockers[side].rotation.x = rockerTilt[side];
        const bogieTarget = -Math.atan2(hm - hr, 1.35) - pitch - rockerTilt[side];
        bogieTilt[side] += (bogieTarget - bogieTilt[side]) * k;
        parts.bogies[side].rotation.x = bogieTilt[side];
      }
      // Corner wheels steer, the rear pair against the front; the mast head
      // looks into the turn, and glances about when the rover stands.
      steerAngle += ((handle.driving ? -steer * STEER_LOCK : 0) - steerAngle) * (1 - Math.exp(-dt * 6));
      parts.steer.forEach((p, i) => { p.rotation.y = i % 2 === 0 ? steerAngle : -steerAngle; });
      idle = handle.driving && Math.abs(v) > 0.3 ? 0 : idle + dt;
      const mastTarget = handle.driving ? steerAngle * 1.6 : Math.sin(idle * 0.4) * 0.8;
      mastYaw += (mastTarget - mastYaw) * (1 - Math.exp(-dt * 2.5));
      parts.mast.rotation.y = mastYaw;
      parts.headlight.intensity += ((handle.driving ? 6 : 0) - parts.headlight.intensity) * (1 - Math.exp(-dt * 4));
      wheelSpin += v / 0.55 * dt;
      for (const w of parts.spin) w.rotation.x = wheelSpin;
      // Dust from the rear wheels, tracks under all six.
      if (Math.abs(v) > 0.6) {
        const kk = Math.abs(v) / TOP;
        dust.burst({ x: x - fx * 1.6, y: group.position.y, z: z - fz * 1.6, count: Math.round(2 + kk * 8), speedMin: 0.5, speedMax: 1.2 + kk * 3, cone: 0.9, size: 0.14, dirX: -fx, dirZ: -fz, bias: 1.2 });
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
