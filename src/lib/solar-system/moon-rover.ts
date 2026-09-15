// The rover, driveable. A rocker-bogie six-wheeler on the heightfield: six
// wheels that each find their own ground so the rockers and bogies
// articulate over every rise, the body riding a sprung average of them, the
// corner wheels steering, the camera head looking into the turn, headlights
// on while it is driven, dust off the wheels, tracks left behind.
//
// The drive is a real vehicle rather than a cursor. Heading is steered
// directly — so it never fishtails — but velocity is not: grip limits how
// fast sideways motion can be taken out, so ask for more turn than the
// regolith can give at speed and the rover drifts wide, then bites again as
// soon as the wheel is straightened. The hill takes speed going up.
//
// Four gears. Creep turns inside its own length and parks. Cruise is the
// drive out to a site. Sprint is for crossing the mare against the oxygen
// clock and will slide if you ask too much of it. Ion is the fourth, and the
// crew does not have it until the thing in the crater has been opened.

import * as THREE from 'three';
import { MOON_G, type DustBurst, type DustHandle } from '@/lib/solar-system/moon-fx';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { PrintsHandle } from '@/lib/solar-system/moon-prints';
import type { TerrainHandle } from '@/lib/solar-system/moon-terrain';

/** The parts of the rover the drive articulates, built by moon-rover-mesh. */
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
  /** The driver's eye, for the cockpit view. */
  seat: THREE.Object3D;
  headlight: THREE.SpotLight;
  /** The arm's shoulder and elbow: stowed on the move, unfolded at rest. */
  arm: THREE.Object3D[];
  /** The brake lights' material — lit while the rover slows. */
  brakeLight: THREE.MeshStandardMaterial;
  /** The ion strips along the tub: dark until the fourth gear is earned. */
  ionMat: THREE.MeshStandardMaterial;
}

/** The gears, slowest first. `ion` is the expedition's reward. */
export type RoverGear = 'creep' | 'cruise' | 'sprint' | 'ion';
export const ROVER_GEARS: RoverGear[] = ['creep', 'cruise', 'sprint', 'ion'];

interface GearSpec {
  /** Top speed, m/s; how hard it gets there, lets off, and brakes. */
  top: number;
  accel: number;
  coast: number;
  brake: number;
  /** Yaw rate at full lock, rad/s, and the speed over which it halves. */
  steer: number;
  steerFade: number;
  /** Sideways acceleration the wheels can take out, m/s². */
  grip: number;
  /** Turns on the spot. */
  pivot: boolean;
}
const SPEC: Record<RoverGear, GearSpec> = {
  creep: { top: 3.0, accel: 2.6, coast: 3.2, brake: 5.5, steer: 1.05, steerFade: 6, grip: 9, pivot: true },
  cruise: { top: 8.0, accel: 3.2, coast: 2.3, brake: 5.0, steer: 0.95, steerFade: 9, grip: 7, pivot: false },
  sprint: { top: 15.0, accel: 4.4, coast: 1.7, brake: 4.8, steer: 0.9, steerFade: 11, grip: 4.2, pivot: false },
  ion: { top: 26.0, accel: 7.2, coast: 1.0, brake: 5.8, steer: 0.85, steerFade: 14, grip: 3.2, pivot: false },
};

export interface RoverHandle {
  /** Signed speed along the heading, m/s. */
  speed: number;
  /** Sideways speed, m/s: how much it is sliding. */
  slip: number;
  yaw: number;
  yawRate: number;
  driving: boolean;
  /** The gear it is in, and the ones this crew has earned. */
  gear: RoverGear;
  gears: RoverGear[];
  /** Walk the gears up or down by one; clamped at the ends. */
  shift: (dir: number) => void;
  /** Go straight to a gear by its place in `gears`; clamped. */
  select: (index: number) => void;
  /** Add a gear to what this crew has. */
  unlock: (gear: RoverGear) => void;
  /** Top speed of the gear it is in, for the dial. */
  top: number;
  /** State of charge, 0…1. Nearly flat, it will only creep. */
  battery: number;
  charge: (dt: number) => void;
  /** A meaningful jolt this step, 0…1, for the camera. */
  bump: number;
  /** Where the body is, smoothed: the camera anchor. */
  position: THREE.Vector3;
  update: (dt: number, throttle: number, steer: number, colliders: Collider[], walkRadius: number) => void;
  /** Draw the body between the last two simulation steps. */
  present: (alpha: number) => void;
}

const STEER_LOCK = 0.42;
const HEAVE_W = 13;
const HEAVE_Z = 0.72;

export function makeRover(group: THREE.Group, collider: Collider, parts: RoverParts, terrain: TerrainHandle, dust: DustHandle, prints: PrintsHandle, gears: RoverGear[] = ['creep', 'cruise', 'sprint']): RoverHandle {
  const up = new THREE.Vector3(0, 1, 0);
  const yawQ = new THREE.Quaternion();
  const tiltQ = new THREE.Quaternion();
  const tilt = new THREE.Euler();
  const heights = new Float32Array(6);
  const puff: DustBurst = { x: 0, y: 0, z: 0, count: 1, speedMin: 0.4, speedMax: 1, cone: 0.9, size: 0.14, dirX: 0, dirZ: 0, bias: 1.2 };
  let vx = 0; let vz = 0;
  let wheelSpin = 0;
  let trackAcc = 0;
  let dustAcc = 0;
  let pitch = 0; let roll = 0;
  let heave = group.position.y; let heaveVel = 0;
  const rockerTilt = [0, 0];
  const bogieTilt = [0, 0];
  let steerAngle = 0;
  let mastYaw = 0;
  let idle = 0;
  let armOut = 0;
  let lastSpeed = 0;
  // Presentation: the last two simulated poses.
  const prevPos = new THREE.Vector3().copy(group.position);
  const curPos = new THREE.Vector3().copy(group.position);
  const prevQ = new THREE.Quaternion().copy(group.quaternion);
  const curQ = new THREE.Quaternion().copy(group.quaternion);

  const handle: RoverHandle = {
    speed: 0, slip: 0, yaw: group.rotation.y, yawRate: 0, driving: false, gear: 'cruise', gears, top: SPEC.cruise.top,
    battery: 1, bump: 0, position: curPos,
    shift(dir) { handle.select(handle.gears.indexOf(handle.gear) + dir); },
    select(index) {
      const list = handle.gears;
      handle.gear = list[THREE.MathUtils.clamp(Math.round(index), 0, list.length - 1)];
      handle.top = SPEC[handle.gear].top;
    },
    unlock(gear) { if (!handle.gears.includes(gear)) handle.gears.push(gear); },
    charge(dt) { handle.battery = Math.min(1, handle.battery + dt * 0.08); },
    update(dt, throttleIn, steerIn, colliders, walkRadius) {
      prevPos.copy(curPos);
      prevQ.copy(curQ);
      const spec = SPEC[handle.gear];
      // A flat battery limps home at a crawl.
      const top = handle.battery < 0.04 ? Math.min(spec.top, 3) : spec.top;
      handle.top = spec.top;
      // Shaped inputs: fine control near the middle, all of it at the stops.
      const throttle = Math.sign(throttleIn) * Math.pow(Math.abs(throttleIn), 1.35);
      const steer = Math.sign(steerIn) * Math.pow(Math.abs(steerIn), 1.2);
      // Steering first: a yaw rate that answers quickly, fades with speed,
      // and in Creep works standing still. The velocity does not turn with
      // the body — it is split along the new heading below, and grip decides
      // how much of the sideways part survives.
      const speedBefore = Math.abs(vx * Math.sin(handle.yaw) + vz * Math.cos(handle.yaw));
      const goingBack = vx * Math.sin(handle.yaw) + vz * Math.cos(handle.yaw) < -0.2;
      const authority = spec.pivot ? 1 : THREE.MathUtils.clamp(speedBefore / 2.0, 0, 1);
      const wantRate = handle.driving ? -steer * spec.steer * authority / (1 + speedBefore / spec.steerFade) * (goingBack ? -1 : 1) : 0;
      handle.yawRate += (wantRate - handle.yawRate) * (1 - Math.exp(-dt * 8));
      handle.yaw += handle.yawRate * dt;
      const c = Math.cos(handle.yaw); const s = Math.sin(handle.yaw);
      let fwd = vx * s + vz * c;
      let lat = vx * c - vz * s;
      if (handle.driving) {
        const target = throttle >= 0 ? throttle * top : throttle * Math.min(top * 0.4, 4);
        const opposing = Math.abs(fwd) > 0.2 && target !== 0 && Math.sign(target) !== Math.sign(fwd);
        // The first metres per second come quickly; the last ones take a while.
        const launch = 1 + 0.8 * Math.max(0, 1 - Math.abs(fwd) / (spec.top * 0.35));
        const rate = opposing ? spec.brake : Math.abs(target) < Math.abs(fwd) ? spec.coast : spec.accel * launch;
        fwd += THREE.MathUtils.clamp(target - fwd, -rate * dt, rate * dt);
      } else {
        fwd *= Math.exp(-dt * 2);
      }
      // The hill: the slope between the front and back wheels.
      const slope = (heights[0] + heights[3] - heights[2] - heights[5]) / 2 / 3.1;
      fwd -= MOON_G * THREE.MathUtils.clamp(slope, -0.6, 0.6) * dt;
      // Parked, the brakes hold it on a slope.
      if (!handle.driving && Math.abs(fwd) < 0.6) fwd -= THREE.MathUtils.clamp(fwd, -6 * dt, 6 * dt);

      const speed = Math.abs(fwd);
      // Grip takes the sideways motion out, at a rate the gear allows.
      lat -= THREE.MathUtils.clamp(lat, -spec.grip * dt, spec.grip * dt);
      vx = fwd * s + lat * c;
      vz = fwd * c - lat * s;

      let x = curPos.x + vx * dt;
      let z = curPos.z + vz * dt;
      const rr = Math.hypot(x, z);
      const edge = walkRadius - 2;
      if (rr > edge) {
        x *= edge / rr; z *= edge / rr;
        const vn = (vx * x + vz * z) / edge;
        if (vn > 0) { vx -= vn * x / edge; vz -= vn * z / edge; }
      }
      handle.bump *= Math.exp(-dt * 6);
      for (const col of colliders) {
        if (col === collider) continue;
        const dx = x - col.x; const dz = z - col.z;
        const d = Math.hypot(dx, dz);
        const min = col.r + collider.r;
        if (d < min && d > 1e-4) {
          const nx = dx / d; const nz = dz / d;
          x += nx * (min - d);
          z += nz * (min - d);
          const vn = vx * nx + vz * nz;
          // Only the motion into it stops; sliding along it carries on.
          if (vn < 0) {
            vx -= vn * nx; vz -= vn * nz;
            handle.bump = Math.max(handle.bump, Math.min(1, -vn / 6));
          }
        }
      }
      curPos.x = x; curPos.z = z;
      collider.x = x; collider.z = z;
      handle.speed = vx * s + vz * c;
      handle.slip = Math.abs(vx * c - vz * s);
      handle.battery = Math.max(0, handle.battery - Math.abs(handle.speed) * dt * 0.00011);

      // ── Six wheels, six grounds. The body rides a sprung mean of them and
      // leans with the slope; each rocker tilts to put its front wheel down,
      // each bogie to put both of its wheels down. ──
      for (let i = 0; i < 6; i++) {
        const [lx, lz] = parts.wheelXZ[i];
        heights[i] = terrain.heightAt(x + lx * c + lz * s, z - lx * s + lz * c);
      }
      const left = (heights[0] + heights[1] + heights[2]) / 3;
      const right = (heights[3] + heights[4] + heights[5]) / 3;
      const front = (heights[0] + heights[3]) / 2;
      const rear = (heights[1] + heights[2] + heights[4] + heights[5]) / 4;
      const ground = (left + right) / 2;
      const was = heaveVel;
      heaveVel += ((ground - heave) * HEAVE_W * HEAVE_W - heaveVel * 2 * HEAVE_Z * HEAVE_W) * dt;
      heave += heaveVel * dt;
      // Never through a wheel: the body cannot sit lower than the highest ground under it allows.
      let highest = -Infinity;
      for (let i = 0; i < 6; i++) if (heights[i] > highest) highest = heights[i];
      if (heave < highest - 0.14) { heave = highest - 0.14; heaveVel = Math.max(0, heaveVel); }
      const jolt = Math.abs(heaveVel - was) / dt;
      if (jolt > 26) handle.bump = Math.max(handle.bump, Math.min(1, (jolt - 26) / 60));
      curPos.y = heave;
      const k = 1 - Math.exp(-dt * 10);
      const accelPitch = THREE.MathUtils.clamp((handle.speed - lastSpeed) / dt, -6, 6) * 0.006;
      pitch += (-Math.atan2(front - rear, 2.3) + accelPitch - pitch) * k;
      roll += (Math.atan2(right - left, 2.7) - roll) * k;
      yawQ.setFromAxisAngle(up, handle.yaw);
      tilt.set(pitch, 0, roll);
      tiltQ.setFromEuler(tilt);
      curQ.copy(yawQ).multiply(tiltQ);
      for (let side = 0; side < 2; side++) {
        const hf = heights[side * 3]; const hm = heights[side * 3 + 1]; const hr = heights[side * 3 + 2];
        rockerTilt[side] += (-Math.atan2(hf - (hm + hr) / 2, 2.1) - pitch - rockerTilt[side]) * k;
        parts.rockers[side].rotation.x = rockerTilt[side];
        bogieTilt[side] += (-Math.atan2(hm - hr, 1.35) - pitch - rockerTilt[side] - bogieTilt[side]) * k;
        parts.bogies[side].rotation.x = bogieTilt[side];
      }
      // Corner wheels steer, the rear pair against the front — hard over for
      // a pivot turn standing still; the mast head looks into the turn.
      const lock = spec.pivot && speed < 0.6 ? 0.75 : STEER_LOCK;
      steerAngle += ((handle.driving ? -steer * lock : 0) - steerAngle) * (1 - Math.exp(-dt * 7));
      for (let i = 0; i < parts.steer.length; i++) parts.steer[i].rotation.y = i % 2 === 0 ? steerAngle : -steerAngle;
      idle = handle.driving && speed > 0.3 ? 0 : idle + dt;
      const mastTarget = handle.driving ? steerAngle * 1.6 : Math.sin(idle * 0.4) * 0.8;
      mastYaw += (mastTarget - mastYaw) * (1 - Math.exp(-dt * 2.5));
      parts.mast.rotation.y = mastYaw;
      parts.headlight.intensity += ((handle.driving ? 7 : 0) - parts.headlight.intensity) * (1 - Math.exp(-dt * 4));
      const braking = Math.abs(handle.speed) < Math.abs(lastSpeed) - 0.01 && Math.abs(handle.speed) > 0.2;
      lastSpeed = handle.speed;
      parts.brakeLight.emissiveIntensity += ((braking ? 2.6 : 0.15) - parts.brakeLight.emissiveIntensity) * (1 - Math.exp(-dt * 8));
      const ionOwned = handle.gears.includes('ion');
      parts.ionMat.emissiveIntensity = handle.gear === 'ion' ? 1.3 + 0.4 * Math.sin(idle + wheelSpin * 0.2) : ionOwned ? 0.35 : 0;
      armOut += ((idle > 2.5 ? 1 : 0) - armOut) * (1 - Math.exp(-dt * 1.4));
      parts.arm[0].rotation.y = -1.3 * armOut;
      parts.arm[0].rotation.x = 0.35 * armOut;
      parts.arm[1].rotation.x = -0.9 + 1.5 * armOut;
      wheelSpin += handle.speed / 0.55 * dt;
      for (const w of parts.spin) w.rotation.x = wheelSpin;

      // Dust off the wheels — more from the rear pair and from a slide — and
      // tracks under all six.
      // Emitted at a steady 30 puffs a second, whatever the step rate.
      dustAcc = Math.min(2, dustAcc + dt * 30);
      if ((speed > 0.6 || handle.slip > 1) && dustAcc >= 1) {
        dustAcc %= 1;
        const kk = Math.min(1, speed / 15) + Math.min(0.6, handle.slip / 6);
        const fx = Math.sin(handle.yaw); const fz = Math.cos(handle.yaw);
        for (let i = 0; i < 6; i++) {
          const [lx, lz] = parts.wheelXZ[i];
          const isRear = lz < -1;
          if (!isRear && Math.random() > kk * 0.6) continue;
          puff.x = x + lx * c + lz * s; puff.y = heights[i]; puff.z = z - lx * s + lz * c;
          puff.count = Math.round(1 + kk * (isRear ? 5 : 2));
          puff.speedMax = 1 + kk * 3;
          puff.dirX = -fx; puff.dirZ = -fz;
          dust.burst(puff);
        }
      }
      if (speed > 0.6 || handle.slip > 1) {
        trackAcc += Math.hypot(vx, vz) * dt;
        if (trackAcc > 0.7) {
          trackAcc = 0;
          for (let side = -1; side <= 1; side += 2) {
            const tx = x + c * side * 1.35; const tz = z - s * side * 1.35;
            prints.track(tx, terrain.heightAt(tx, tz), tz, handle.yaw, 0.36);
          }
        }
      }
    },
    present(alpha) {
      group.position.lerpVectors(prevPos, curPos, alpha);
      group.quaternion.slerpQuaternions(prevQ, curQ, alpha);
    },
  };
  // Start settled on the ground.
  curPos.y = heave = terrain.heightAt(curPos.x, curPos.z);
  prevPos.copy(curPos);
  return handle;
}
