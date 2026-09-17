// What the rover looks like doing what the drive decides: the rockers and
// bogies articulating over the ground, the corner wheels steering, the
// hubs spinning (and spinning up when the regolith lets go), the mast head
// looking into the turn, the headlights and brake lights, the arm folding
// out at rest, dust off the wheels and tracks left behind.

import * as THREE from 'three';
import type { DustBurst, DustHandle } from '@/lib/solar-system/moon-fx';
import type { PrintsHandle } from '@/lib/solar-system/moon-prints';
import type { RoverParts } from '@/lib/solar-system/moon-rover';

export interface DressState {
  x: number; z: number; yaw: number;
  speed: number; slip: number;
  /** How much faster the driven wheels turn than the ground goes by, 0…1. */
  spin: number;
  driving: boolean;
  steer: number;
  pivot: boolean;
  braking: boolean;
  airborne: boolean;
  heights: Float32Array;
  pitch: number;
  gearIon: boolean;
  ionOwned: boolean;
  vx: number; vz: number;
}

const STEER_LOCK = 0.42;

export function makeRoverDress(parts: RoverParts, terrain: { heightAt: (x: number, z: number) => number }, dust: DustHandle, prints: PrintsHandle) {
  const puff: DustBurst = { x: 0, y: 0, z: 0, count: 1, speedMin: 0.4, speedMax: 1, cone: 0.9, size: 0.14, dirX: 0, dirZ: 0, bias: 1.2 };
  const rockerTilt = [0, 0];
  const bogieTilt = [0, 0];
  let steerAngle = 0;
  let mastYaw = 0;
  let idle = 0;
  let armOut = 0;
  let wheelSpin = 0;
  let trackAcc = 0;
  let dustAcc = 0;

  return (dt: number, s: DressState) => {
    const k = 1 - Math.exp(-dt * 10);
    const c = Math.cos(s.yaw); const sn = Math.sin(s.yaw);
    const h = s.heights;
    for (let side = 0; side < 2; side++) {
      const hf = h[side * 3]; const hm = h[side * 3 + 1]; const hr = h[side * 3 + 2];
      // In the air the wheels hang level; on the ground each finds its own.
      const rock = s.airborne ? 0 : -Math.atan2(hf - (hm + hr) / 2, 2.1) - s.pitch;
      rockerTilt[side] += (rock - rockerTilt[side]) * k;
      parts.rockers[side].rotation.x = rockerTilt[side];
      const bog = s.airborne ? 0 : -Math.atan2(hm - hr, 1.35) - s.pitch - rockerTilt[side];
      bogieTilt[side] += (bog - bogieTilt[side]) * k;
      parts.bogies[side].rotation.x = bogieTilt[side];
    }
    const lock = s.pivot && s.speed < 0.6 ? 0.75 : STEER_LOCK;
    steerAngle += ((s.driving ? -s.steer * lock : 0) - steerAngle) * (1 - Math.exp(-dt * 7));
    for (let i = 0; i < parts.steer.length; i++) parts.steer[i].rotation.y = i % 2 === 0 ? steerAngle : -steerAngle;
    idle = s.driving && s.speed > 0.3 ? 0 : idle + dt;
    const mastTarget = s.driving ? steerAngle * 1.6 : Math.sin(idle * 0.4) * 0.8;
    mastYaw += (mastTarget - mastYaw) * (1 - Math.exp(-dt * 2.5));
    parts.mast.rotation.y = mastYaw;
    parts.headlight.intensity += ((s.driving ? 7 : 0) - parts.headlight.intensity) * (1 - Math.exp(-dt * 4));
    parts.brakeLight.emissiveIntensity += ((s.braking ? 2.6 : 0.15) - parts.brakeLight.emissiveIntensity) * (1 - Math.exp(-dt * 8));
    parts.ionMat.emissiveIntensity = s.gearIon ? 1.3 + 0.4 * Math.sin(idle + wheelSpin * 0.2) : s.ionOwned ? 0.35 : 0;
    armOut += ((idle > 2.5 ? 1 : 0) - armOut) * (1 - Math.exp(-dt * 1.4));
    parts.arm[0].rotation.y = -1.3 * armOut;
    parts.arm[0].rotation.x = 0.35 * armOut;
    parts.arm[1].rotation.x = -0.9 + 1.5 * armOut;
    // Hubs turn with the ground, and faster when the regolith lets go under the torque.
    const ground = s.airborne ? Math.sign(s.speed) * Math.max(Math.abs(s.speed), 2) : s.speed;
    wheelSpin += (ground * (1 + s.spin * 1.6)) / 0.55 * dt;
    for (const w of parts.spin) w.rotation.x = wheelSpin;

    if (s.airborne) return;
    // Dust — more from the rear pair, a slide, and spinning wheels — and tracks under all six.
    const speed = Math.abs(s.speed);
    dustAcc = Math.min(2, dustAcc + dt * 30);
    if ((speed > 0.6 || s.slip > 1 || s.spin > 0.2) && dustAcc >= 1) {
      dustAcc %= 1;
      const kk = Math.min(1, speed / 15) + Math.min(0.6, s.slip / 6) + s.spin * 0.7;
      const fx = Math.sin(s.yaw); const fz = Math.cos(s.yaw);
      for (let i = 0; i < 6; i++) {
        const [lx, lz] = parts.wheelXZ[i];
        const isRear = lz < -1;
        if (!isRear && Math.random() > kk * 0.6) continue;
        puff.x = s.x + lx * c + lz * sn; puff.y = h[i]; puff.z = s.z - lx * sn + lz * c;
        puff.count = Math.round(1 + kk * (isRear ? 5 : 2));
        puff.speedMax = 1 + kk * 3;
        puff.dirX = -fx; puff.dirZ = -fz;
        dust.burst(puff);
      }
    }
    if (speed > 0.6 || s.slip > 1) {
      trackAcc += Math.hypot(s.vx, s.vz) * dt;
      if (trackAcc > 0.7) {
        trackAcc = 0;
        for (let side = -1; side <= 1; side += 2) {
          const tx = s.x + c * side * 1.35; const tz = s.z - sn * side * 1.35;
          prints.track(tx, terrain.heightAt(tx, tz), tz, s.yaw, 0.36);
        }
      }
    }
  };
}
