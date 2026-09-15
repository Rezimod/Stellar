// The landing. Not a camera move — a vehicle.
//
// The crew arrives a hundred and forty metres over the mare with the pad
// off the nose and the descent engine already lit. The right hand holds
// the throttle, the left translates. One sixth g is patient: the engine
// only has to take the edge off, and a metre a second of drift at fifty
// metres is a hundred metres downrange if you leave it. Below thirty the
// exhaust starts to move regolith and the pad disappears into the sheet of
// it, which is exactly what the Apollo crews found.
//
// Nobody is allowed to crash. The guidance computer watches the numbers,
// and the moment the engine could no longer stop the fall in the height
// that is left, it takes the stick and flies it down itself. What the
// pilot is playing for is the touchdown speed on the plaque afterwards.

import * as THREE from 'three';
import { MOON_G, type DustHandle } from '@/lib/solar-system/moon-fx';
import { keep, mergeStatic } from '@/lib/solar-system/moon-batch';
import type { LightPool } from '@/lib/solar-system/moon-lights';

export interface LanderInput {
  /** The descent engine, 0…1. */
  throttle: number;
  /** Translation on the pad's own axes, each -1…1. */
  moveX: number;
  moveY: number;
}

export interface LanderTelemetry {
  altitude: number;
  /** Down is positive: the number a pilot reads. */
  descent: number;
  ground: number;
  fuel: number;
  throttle: number;
  /** Metres from the middle of the pad, and how fast it is going sideways. */
  offset: number;
  drift: number;
  driftX: number;
  driftZ: number;
  /** The computer has the stick. */
  assist: boolean;
  /** Set once, at the moment the pads touch. */
  landed: boolean;
  touchdown: number;
  /** Where the crew steps off. */
  egressX: number;
  egressZ: number;
}

export interface LanderHandle {
  group: THREE.Group;
  telemetry: LanderTelemetry;
  /** The point the chase camera should hold. */
  position: THREE.Vector3;
  yaw: number;
  update: (dt: number, input: LanderInput, heightAt: (x: number, z: number) => number) => void;
  dispose: () => void;
}

const START_ALT = 138;
const START_DESCENT = 13.5;
/** Full throttle, in gravities — a shade over twice the surface pull, as the LM had. */
const THRUST_G = 2.4;
const RCS_G = 1.48;
const FUEL_BURN = 0.035;
/** How much of the engine's braking the profile asks for: the rest is the
 *  margin that makes the profile flyable at all. */
const PROFILE = 0.8;
const TOUCH = 0.35;

export function makeLander(
  padX: number,
  padZ: number,
  heightAt: (x: number, z: number) => number,
  dust: DustHandle,
  lite: boolean,
  lights?: LightPool,
  g = MOON_G,
): LanderHandle {
  const MAX_THRUST = THRUST_G * g;
  const RCS = RCS_G * g;
  const group = new THREE.Group();
  group.name = 'lander';
  const geoms: THREE.BufferGeometry[] = [];
  const owned: THREE.Material[] = [];
  const seg = lite ? 10 : 16;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.34, metalness: 0.95 });
  const foil = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.3, metalness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd6d6d0, roughness: 0.6, metalness: 0.08 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x777c84, roughness: 0.4, metalness: 0.85 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb6c8, roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.5, clearcoat: 1 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff2d0), emissiveIntensity: 1.8 });
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  owned.push(gold, foil, white, steel, glass, lampMat, plumeMat);
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // ── The vehicle: an octagonal descent stage in gold foil, the crew can
  // above it with two triangular windows, four legs with dish pads and a
  // ladder down the front one, the engine bell underneath. ──
  mesh(group, new THREE.CylinderGeometry(2.3, 2.5, 1.8, 8), gold, 0, 1.9);
  mesh(group, new THREE.CylinderGeometry(2.32, 2.32, 0.12, 8), foil, 0, 2.86);
  const can = mesh(group, new THREE.CylinderGeometry(1.5, 1.7, 1.9, 8), white, 0, 3.75);
  can.rotation.y = Math.PI / 8;
  mesh(group, new THREE.CylinderGeometry(0.95, 1.3, 0.7, 8), white, 0, 4.95);
  mesh(group, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10), steel, 0, 5.4);
  for (const s of [-1, 1]) {
    const w = mesh(group, new THREE.PlaneGeometry(0.62, 0.46), glass, s * 0.52, 3.95, 1.62);
    w.rotation.x = -0.32;
    w.rotation.y = s * 0.16;
  }
  mesh(group, new THREE.BoxGeometry(1.1, 0.5, 0.12), foil, 0, 3.2, 1.66);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const lx = Math.sin(a) * 3.5; const lz = Math.cos(a) * 3.5;
    const leg = mesh(group, new THREE.CylinderGeometry(0.09, 0.11, 3.5, 8), gold, lx * 0.62, 1.3, lz * 0.62);
    leg.rotation.z = -Math.sin(a) * 0.62;
    leg.rotation.x = Math.cos(a) * 0.62;
    mesh(group, new THREE.CylinderGeometry(0.72, 0.56, 0.16, 12), gold, lx, 0.1, lz);
    const brace = mesh(group, new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), steel, lx * 0.78, 0.65, lz * 0.78);
    brace.rotation.z = -Math.sin(a) * 1.15;
    brace.rotation.x = Math.cos(a) * 1.15;
  }
  // Ladder down the front leg, and the porch at the top of it.
  for (let i = 0; i < 7; i++) mesh(group, new THREE.BoxGeometry(0.5, 0.045, 0.05), steel, 0, 0.55 + i * 0.36, 2.52);
  for (const s of [-1, 1]) mesh(group, new THREE.CylinderGeometry(0.028, 0.028, 2.4, 6), steel, s * 0.25, 1.65, 2.52);
  mesh(group, new THREE.BoxGeometry(0.9, 0.06, 0.6), steel, 0, 3.0, 2.3);
  // RCS quads on the corners, the docking light, the engine.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const q = mesh(group, new THREE.BoxGeometry(0.28, 0.28, 0.28), steel, Math.sin(a) * 2.4, 2.6, Math.cos(a) * 2.4);
    for (const d of [-1, 1]) mesh(q, new THREE.ConeGeometry(0.06, 0.14, 8), foil, d * 0.2, 0, 0).rotation.z = d * Math.PI / 2;
  }
  mesh(group, new THREE.SphereGeometry(0.1, 8, 6), lampMat, 0, 2.95, 2.6);
  const bell = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.4, metalness: 0.9, side: THREE.DoubleSide });
  owned.push(bell);
  mesh(group, new THREE.CylinderGeometry(0.42, 0.95, 1.1, seg, 1, true), bell, 0, 0.45);
  // The plume: a cone of light under the bell, plus the light it throws.
  const plume = keep(mesh(group, new THREE.ConeGeometry(0.8, 5.0, seg, 1, true), plumeMat, 0, -2.4));
  plume.rotation.x = Math.PI;
  plume.castShadow = false;
  geoms.push(...mergeStatic(group, { minCaster: 0.1 }).geometries);

  const position = group.position;
  const vel = new THREE.Vector3(1.6, -START_DESCENT, -2.4);
  const padY = heightAt(padX, padZ);
  position.set(padX - 34, padY + START_ALT, padZ + 52);
  const telemetry: LanderTelemetry = {
    altitude: START_ALT, descent: START_DESCENT, ground: padY, fuel: 1, throttle: 0,
    offset: 0, drift: 0, driftX: vel.x, driftZ: vel.z,
    assist: false, landed: false, touchdown: 0, egressX: padX, egressZ: padZ,
  };
  let flicker = 0;
  let dustAcc = 0;

  const handle: LanderHandle = {
    group, telemetry, position, yaw: 0,
    update(dt, input, height) {
      if (telemetry.landed) {
        // Down and quiet: the plume dies, the dust settles.
        telemetry.throttle += (0 - telemetry.throttle) * (1 - Math.exp(-dt * 6));
        plumeMat.opacity = telemetry.throttle * 0.5;
        lights?.request(position.x, position.y - 1.2, position.z, 0xaad6ff, telemetry.throttle * 20, 20, 2);
        return;
      }
      const ground = height(position.x, position.z);
      const alt = position.y - ground;
      const fall = Math.max(0, -vel.y);
      // ── Guidance: could the engine still stop this fall in the height
      // that is left? Leave a second of margin and a metre of pad. ──
      const net = MAX_THRUST - g;
      const offset = Math.hypot(position.x - padX, position.z - padZ);
      // `safe` is the fastest the vehicle could be falling at this height and
      // still be stopped by the engine, less the margin that makes a profile
      // flyable rather than theoretical. Cross it by a clear margin and the
      // computer takes the stick, because from there on nothing the pilot
      // does gets it down gently.
      const safe = Math.sqrt(2 * net * Math.max(0, alt - 1.2)) * PROFILE;
      const want = Math.max(0.6, Math.min(START_DESCENT, safe));
      // Landing thirty metres off the middle of a pad that is forty-six
      // across is a landing; landing in the rocks beyond it is not, so the
      // computer also steps in for a pilot who has not killed the drift.
      if (fall > safe * 1.06 + 0.9 || (alt < 25 && offset > 32)) telemetry.assist = true;

      let throttle = THREE.MathUtils.clamp(input.throttle, 0, 1);
      let tx = input.moveX; let tz = -input.moveY;
      if (telemetry.assist) {
        // Hold the profile, and steer the drift out on the way down.
        throttle = THREE.MathUtils.clamp((fall - want) * 1.4 + (g / MAX_THRUST), 0, 1);
        const backX = (padX - position.x) * 0.06 - vel.x * 0.55;
        const backZ = (padZ - position.z) * 0.06 - vel.z * 0.55;
        tx = THREE.MathUtils.clamp(backX, -1, 1);
        tz = THREE.MathUtils.clamp(backZ, -1, 1);
      }
      // Dry, the engine derates rather than quits: the last of the pressure
      // will still set it down, just not gently.
      if (telemetry.fuel <= 0) throttle = Math.min(throttle, 0.55);
      telemetry.fuel = Math.max(0, telemetry.fuel - throttle * FUEL_BURN * dt);
      telemetry.throttle += (throttle - telemetry.throttle) * (1 - Math.exp(-dt * 7));

      vel.y += (telemetry.throttle * MAX_THRUST - g) * dt;
      vel.x += tx * RCS * dt;
      vel.z += tz * RCS * dt;
      // A little damping so the RCS is flyable rather than a skid.
      vel.x *= Math.exp(-dt * 0.35);
      vel.z *= Math.exp(-dt * 0.35);
      position.addScaledVector(vel, dt);

      const g2 = height(position.x, position.z);
      if (position.y - g2 <= TOUCH) {
        position.y = g2 + TOUCH;
        telemetry.landed = true;
        telemetry.touchdown = Math.max(0, -vel.y);
        vel.set(0, 0, 0);
        // The pads throw a ring of dust out from under the vehicle.
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2;
          dust.burst({
            x: position.x + Math.cos(a) * 2.6, y: g2, z: position.z + Math.sin(a) * 2.6,
            count: 3, speedMin: 1.4, speedMax: 5.5, cone: 1.45, size: 0.17,
            dirX: Math.cos(a), dirZ: Math.sin(a), bias: 2.6,
          });
        }
        telemetry.egressX = position.x;
        telemetry.egressZ = position.z + 6.5;
      }

      // ── The exhaust, and what it does to the ground. ──
      flicker += dt * 30;
      const t = telemetry.throttle;
      plumeMat.opacity = t * (0.45 + 0.1 * Math.sin(flicker));
      plume.scale.set(0.85 + t * 0.3, 0.5 + t * 0.7 + 0.06 * Math.sin(flicker * 1.7), 0.85 + t * 0.3);
      lights?.request(position.x, position.y - 1.2, position.z, 0xaad6ff, t * 26, 20 + alt * 0.6, 2);
      // Below thirty metres the blast starts to move regolith; by ten it is
      // a sheet of it going sideways faster than the vehicle is coming down.
      const blast = t * Math.max(0, 1 - alt / 30);
      dustAcc += blast * dt * 60;
      while (dustAcc >= 1) {
        dustAcc -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * (3 + blast * 9);
        dust.burst({
          x: position.x + Math.cos(a) * r, y: g2, z: position.z + Math.sin(a) * r,
          count: 1, speedMin: 1.5, speedMax: 3 + blast * 9, cone: 1.5, size: 0.14,
          dirX: Math.cos(a), dirZ: Math.sin(a), bias: 2.2 + blast * 2,
        });
      }
      // The vehicle leans a touch into the translation it is asking for.
      group.rotation.z += (-tx * 0.06 - group.rotation.z) * (1 - Math.exp(-dt * 3));
      group.rotation.x += (tz * 0.06 - group.rotation.x) * (1 - Math.exp(-dt * 3));

      telemetry.altitude = Math.max(0, position.y - g2 - TOUCH);
      telemetry.descent = Math.max(0, -vel.y);
      telemetry.ground = g2;
      telemetry.offset = Math.hypot(position.x - padX, position.z - padZ);
      telemetry.driftX = vel.x;
      telemetry.driftZ = vel.z;
      telemetry.drift = Math.hypot(vel.x, vel.z);
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
    },
  };
  return handle;
}
