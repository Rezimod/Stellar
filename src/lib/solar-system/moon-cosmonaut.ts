// The cosmonaut on the surface: an articulated EVA suit (shoulders, elbows,
// hips, knees, a neck that turns) driven by a procedural lunar lope, and the
// one-sixth-g controller that moves it — long floating strides, slow
// arcs, a squat on touchdown, dust off the boots.

import * as THREE from 'three';
import { MOON_G, type DustHandle } from '@/lib/solar-system/moon-fx';

export interface Collider { x: number; z: number; r: number }

export interface WalkInput {
  /** World-space move intent, already camera-relative, |v| ≤ 1. */
  moveX: number;
  moveZ: number;
  jump: boolean;
  run: boolean;
}

export interface CosmonautState {
  airborne: boolean;
  speed: number;
  /** Height above the ground under the boots, m. */
  altitude: number;
  /** Set for one frame on a hard landing. */
  landed: boolean;
}

export interface StepEvent { x: number; y: number; z: number; yaw: number; side: number; hard: number }

export interface CosmonautHandle {
  group: THREE.Group;
  position: THREE.Vector3;
  /** Facing yaw, rad, +Z forward at 0. */
  yaw: number;
  state: CosmonautState;
  /** Eye point inside the helmet, world space. */
  eye: (out: THREE.Vector3) => THREE.Vector3;
  /** Inside the helmet the helmet itself is not drawn. */
  setHelmetView: (on: boolean) => void;
  /** Turn the head toward a look direction (helmet view) — yaw relative to the body, pitch. */
  look: (yaw: number, pitch: number) => void;
  onStep: ((e: StepEvent) => void) | null;
  update: (dt: number, input: WalkInput, heightAt: (x: number, z: number) => number, colliders: Collider[], walkRadius: number) => void;
  dispose: () => void;
}

const WALK = 2.1;
const RUN = 4.6;
const JUMP_V = 2.7;
const GROUND_ACCEL = 9;
const AIR_ACCEL = 1.2;
const SUIT_RADIUS = 0.55;
const HIP_H = 0.98;

/** A fine ripstop weave, so the white cloth is not a flat plastic. */
function fabricNormal(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const wx = Math.sin(x * Math.PI / 2) * 0.35 + (Math.random() - 0.5) * 0.3;
      const wy = Math.sin(y * Math.PI / 2) * 0.35 + (Math.random() - 0.5) * 0.3;
      img.data[i] = Math.round((wx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((wy * 0.5 + 0.5) * 255);
      img.data[i + 2] = 230;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

export function makeCosmonaut(dust: DustHandle): CosmonautHandle {
  const group = new THREE.Group();
  group.name = 'cosmonaut';
  const body = new THREE.Group();
  group.add(body);
  const weave = fabricNormal();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.78, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35) });
  const bellows = new THREE.MeshStandardMaterial({ color: 0xc9c9c4, roughness: 0.85, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.6, 0.6) });
  const clothDirty = new THREE.MeshStandardMaterial({ color: 0xbdbab3, roughness: 0.9, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.5, 0.5) });
  const bearing = new THREE.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.45, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.6, metalness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322c, roughness: 0.7, metalness: 0 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1e4ea8, roughness: 0.7, metalness: 0 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0xc89a2c, roughness: 0.06, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfd8ee, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, clearcoat: 1 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x0a2a2a, emissive: new THREE.Color(0x5eead4), emissiveIntensity: 0.8, roughness: 0.3 });
  const owned = [cloth, clothDirty, bellows, bearing, dark, red, blue, visor, glass, screen];
  const geoms: THREE.BufferGeometry[] = [];
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // Torso: a hard upper torso over a soft lower, with the waist bearing.
  const torso = new THREE.Group();
  torso.position.y = HIP_H;
  body.add(torso);
  mesh(torso, new THREE.CapsuleGeometry(0.24, 0.3, 6, 16), cloth, 0, 0.36, 0).scale.set(1.15, 1, 0.85);
  mesh(torso, new THREE.CylinderGeometry(0.22, 0.25, 0.22, 18), cloth, 0, 0.06, 0);
  mesh(torso, new THREE.TorusGeometry(0.235, 0.025, 8, 24), bearing, 0, 0.17, 0).rotation.x = Math.PI / 2;
  // Chest: display and control unit, the red mission stripe, a flag patch.
  mesh(torso, new THREE.BoxGeometry(0.26, 0.17, 0.1), dark, 0, 0.38, 0.22);
  mesh(torso, new THREE.BoxGeometry(0.18, 0.08, 0.02), screen, 0, 0.4, 0.275);
  mesh(torso, new THREE.BoxGeometry(0.08, 0.05, 0.02), red, 0.13, 0.5, 0.21);
  mesh(torso, new THREE.BoxGeometry(0.42, 0.04, 0.02), red, 0, 0.2, 0.2);
  // Name tape over the heart, and the mission patch on the other side.
  const tape = document.createElement('canvas');
  tape.width = 256; tape.height = 64;
  const tc = tape.getContext('2d')!;
  tc.fillStyle = '#e9e9e4'; tc.fillRect(0, 0, 256, 64);
  tc.fillStyle = '#1b1f26'; tc.font = '600 34px "JetBrains Mono", ui-monospace, monospace';
  tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.fillText('MODEBADZE', 128, 34);
  const tapeTex = new THREE.CanvasTexture(tape);
  tapeTex.colorSpace = THREE.SRGBColorSpace;
  const tapeMat = new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.8 });
  owned.push(tapeMat);
  mesh(torso, new THREE.PlaneGeometry(0.2, 0.05), tapeMat, -0.12, 0.28, 0.253);
  mesh(torso, new THREE.CircleGeometry(0.035, 16), red, 0.13, 0.28, 0.253);
  // Antenna on the pack.
  mesh(torso, new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), bearing, 0.2, 0.9, -0.38);
  // Life-support pack: a big backpack with a radiator plate and two tanks.
  mesh(torso, new THREE.BoxGeometry(0.5, 0.66, 0.26), clothDirty, 0, 0.32, -0.32);
  mesh(torso, new THREE.BoxGeometry(0.46, 0.5, 0.02), bearing, 0, 0.36, -0.46);
  mesh(torso, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), bearing, -0.16, 0.06, -0.3);
  mesh(torso, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), bearing, 0.16, 0.06, -0.3);
  mesh(torso, new THREE.BoxGeometry(0.36, 0.06, 0.2), red, 0, 0.68, -0.3);
  // Hoses from the pack to the chest unit.
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.5, metalness: 0.4 });
  owned.push(hoseMat);
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.2, 0.15, -0.3), new THREE.Vector3(side * 0.34, 0.1, -0.05),
      new THREE.Vector3(side * 0.3, 0.2, 0.18), new THREE.Vector3(side * 0.1, 0.34, 0.24),
    ]);
    mesh(torso, new THREE.TubeGeometry(curve, 16, 0.022, 8, false), hoseMat);
  }

  // Helmet: a pressure bubble, the gold sun visor drawn down, the neck ring,
  // a lamp on each side.
  const neck = new THREE.Group();
  neck.position.set(0, 0.62, 0);
  torso.add(neck);
  const helmetParts = new THREE.Group();
  neck.add(helmetParts);
  mesh(neck, new THREE.TorusGeometry(0.16, 0.03, 8, 24), bearing, 0, 0.02, 0).rotation.x = Math.PI / 2;
  mesh(helmetParts, new THREE.SphereGeometry(0.2, 24, 18), cloth, 0, 0.19, 0).scale.set(1, 1.05, 1);
  const vis = mesh(helmetParts, new THREE.SphereGeometry(0.19, 24, 18, -Math.PI * 0.44, Math.PI * 0.88, Math.PI * 0.2, Math.PI * 0.55), visor, 0, 0.19, 0.013);
  vis.scale.set(1, 1.05, 1);
  mesh(helmetParts, new THREE.SphereGeometry(0.205, 24, 18, -Math.PI * 0.48, Math.PI * 0.96, Math.PI * 0.16, Math.PI * 0.62), glass, 0, 0.19, 0.01).scale.set(1, 1.05, 1);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff4dc), emissiveIntensity: 1.2 });
  owned.push(lampMat);
  for (const side of [-1, 1]) {
    mesh(helmetParts, new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), dark, side * 0.18, 0.3, 0.06).rotation.set(Math.PI / 2, 0, side * 0.3);
    mesh(helmetParts, new THREE.CircleGeometry(0.026, 12), lampMat, side * 0.19, 0.31, 0.105);
  }

  // Limbs. Each joint is a group at the pivot so the swing reads correctly.
  const upperArmG = new THREE.CapsuleGeometry(0.075, 0.24, 4, 12);
  const foreArmG = new THREE.CapsuleGeometry(0.065, 0.22, 4, 12);
  const gloveG = new THREE.SphereGeometry(0.075, 12, 10);
  const thighG = new THREE.CapsuleGeometry(0.1, 0.3, 4, 12);
  const shinG = new THREE.CapsuleGeometry(0.09, 0.3, 4, 12);
  const bootG = new THREE.BoxGeometry(0.16, 0.11, 0.3);
  const bootSoleG = new THREE.BoxGeometry(0.17, 0.03, 0.32);
  const jointG = new THREE.SphereGeometry(0.075, 12, 10);
  const shoulders: THREE.Group[] = []; const elbows: THREE.Group[] = [];
  const hips: THREE.Group[] = []; const knees: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.31, 0.5, 0);
    torso.add(sh);
    mesh(sh, new THREE.SphereGeometry(0.1, 12, 10), bearing);
    mesh(sh, upperArmG, cloth, 0, -0.2, 0);
    mesh(sh, new THREE.BoxGeometry(0.17, 0.05, 0.17), red, 0, -0.12, 0);
    const el = new THREE.Group();
    el.position.set(0, -0.38, 0);
    sh.add(el);
    mesh(el, jointG, bearing);
    for (let b = 0; b < 3; b++) mesh(el, new THREE.TorusGeometry(0.072, 0.02, 6, 14), bellows, 0, -0.03 - b * 0.035, 0).rotation.x = Math.PI / 2;
    mesh(el, foreArmG, cloth, 0, -0.18, 0);
    mesh(el, new THREE.TorusGeometry(0.07, 0.015, 6, 16), bearing, 0, -0.32, 0).rotation.x = Math.PI / 2;
    mesh(el, gloveG, dark, 0, -0.4, 0.02);
    shoulders.push(sh); elbows.push(el);

    const hip = new THREE.Group();
    hip.position.set(side * 0.15, 0.02, 0);
    torso.add(hip);
    mesh(hip, new THREE.SphereGeometry(0.11, 12, 10), cloth);
    mesh(hip, thighG, cloth, 0, -0.24, 0);
    mesh(hip, new THREE.BoxGeometry(0.22, 0.05, 0.22), red, 0, -0.16, 0);
    const kn = new THREE.Group();
    kn.position.set(0, -0.46, 0);
    hip.add(kn);
    mesh(kn, jointG, cloth);
    for (let b = 0; b < 4; b++) mesh(kn, new THREE.TorusGeometry(0.095, 0.022, 6, 16), bellows, 0, 0.02 - b * 0.04, 0).rotation.x = Math.PI / 2;
    mesh(kn, shinG, cloth, 0, -0.22, 0);
    mesh(kn, new THREE.TorusGeometry(0.095, 0.018, 6, 16), bearing, 0, -0.4, 0).rotation.x = Math.PI / 2;
    mesh(kn, bootG, clothDirty, 0, -0.47, 0.05);
    mesh(kn, bootSoleG, dark, 0, -0.53, 0.05);
    mesh(kn, new THREE.BoxGeometry(0.1, 0.04, 0.03), blue, 0, -0.42, 0.14);
    hips.push(hip); knees.push(kn);
  }

  const position = group.position;
  const vel = new THREE.Vector3();
  const state: CosmonautState = { airborne: false, speed: 0, altitude: 0, landed: false };
  let phase = 0;
  let squat = 0;
  let lean = 0;
  let airT = 0;
  let stepSide = 1;
  let lastStepPhase = 0;
  let idleT = 0;
  const eyeLocal = new THREE.Vector3(0, 0.2, 0.08);
  let lookYaw = 0;
  let lookPitch = 0;
  let helmetView = false;
  const handle: CosmonautHandle = {
    group, position, yaw: 0, state, onStep: null,
    eye(out) { return neck.localToWorld(out.copy(eyeLocal)); },
    setHelmetView(on) { helmetView = on; helmetParts.visible = !on; },
    look(y, p) { lookYaw = y; lookPitch = p; },
    update(dt, input, heightAt, colliders, walkRadius) {
      state.landed = false;
      idleT += dt;
      const wantX = input.moveX; const wantZ = input.moveZ;
      const want = Math.min(1, Math.hypot(wantX, wantZ));
      const top = input.run ? RUN : WALK;
      const ground = heightAt(position.x, position.z);
      const onGround = position.y <= ground + 0.001 && vel.y <= 0;
      // Horizontal: chase the intent on the ground, only nudge it in the air.
      const accel = onGround ? GROUND_ACCEL : AIR_ACCEL;
      const tx = want > 0 ? (wantX / want) * top * want : 0;
      const tz = want > 0 ? (wantZ / want) * top * want : 0;
      const k = 1 - Math.exp(-dt * accel / (onGround ? 1 : 0.6));
      vel.x += (tx - vel.x) * k;
      vel.z += (tz - vel.z) * k;
      if (onGround && input.jump) {
        vel.y = JUMP_V + (input.run ? 0.4 : 0);
        // Push off: a little extra carry in the direction of travel.
        vel.x *= 1.1; vel.z *= 1.1;
        dust.burst({ x: position.x, y: ground, z: position.z, count: 14, speedMin: 0.6, speedMax: 1.8, cone: 0.9, size: 0.12 });
        squat = -0.4;
      }
      vel.y -= MOON_G * dt;
      position.x += vel.x * dt;
      position.z += vel.z * dt;
      position.y += vel.y * dt;
      // Keep inside the map and out of the structures.
      const rr = Math.hypot(position.x, position.z);
      if (rr > walkRadius) {
        position.x *= walkRadius / rr;
        position.z *= walkRadius / rr;
        vel.x *= 0.2; vel.z *= 0.2;
      }
      for (const c of colliders) {
        const dx = position.x - c.x; const dz = position.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + SUIT_RADIUS;
        if (d < min && d > 1e-4) {
          const push = (min - d) / d;
          position.x += dx * push;
          position.z += dz * push;
          const vn = (vel.x * dx + vel.z * dz) / d;
          if (vn < 0) { vel.x -= vn * dx / d; vel.z -= vn * dz / d; }
        }
      }
      const g2 = heightAt(position.x, position.z);
      if (position.y <= g2) {
        if (vel.y < -1.6) {
          state.landed = true;
          squat = Math.min(1, -vel.y / 4.5);
          handle.onStep?.({ x: position.x, y: g2, z: position.z, yaw: handle.yaw, side: 1, hard: 1 });
          handle.onStep?.({ x: position.x, y: g2, z: position.z, yaw: handle.yaw, side: -1, hard: 1 });
          dust.burst({ x: position.x, y: g2, z: position.z, count: Math.round(10 + squat * 40), speedMin: 0.8, speedMax: 2.2 + squat * 2, cone: 1.25, size: 0.14 });
        }
        position.y = g2;
        vel.y = 0;
      }
      const speed = Math.hypot(vel.x, vel.z);
      const airborne = position.y > g2 + 0.02;
      state.airborne = airborne;
      state.speed = speed;
      state.altitude = position.y - g2;
      airT = airborne ? airT + dt : 0;
      // Face where you go.
      if (speed > 0.3) {
        const target = Math.atan2(vel.x, vel.z);
        let d = target - handle.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        handle.yaw += d * (1 - Math.exp(-dt * (onGround ? 9 : 3)));
      }
      group.rotation.y = handle.yaw;
      squat += (0 - squat) * (1 - Math.exp(-dt * 5));
      const leanTarget = airborne ? 0.08 : speed / RUN * 0.28;
      lean += (leanTarget - lean) * (1 - Math.exp(-dt * 6));

      // ── Pose. ──
      const gait = speed / RUN;
      const strideHz = 0.9 + gait * 1.1;
      if (!airborne) phase += dt * strideHz * Math.PI * 2 * Math.min(1, speed / 0.6);
      const sw = Math.sin(phase); const cs = Math.cos(phase);
      const amp = airborne ? 0 : 0.35 + gait * 0.45;
      const bob = airborne ? 0 : Math.abs(cs) * 0.035 * gait;
      body.position.y = bob - squat * 0.16;
      torso.rotation.x = lean + squat * 0.35 + (airborne ? -0.05 : 0);
      torso.rotation.z = airborne ? 0 : -sw * 0.04 * gait;
      const breathe = Math.sin(idleT * 1.5) * 0.012;
      torso.scale.set(1, 1 + breathe * (speed < 0.3 ? 1 : 0), 1);
      const legTuck = airborne ? Math.min(1, airT / 0.4) : 0;
      const flail = airborne ? Math.sin(airT * 3) * 0.08 : 0;
      for (let i = 0; i < 2; i++) {
        const s = i === 0 ? 1 : -1;
        // Legs swing opposite; knees fold on the back-swing and tuck in flight.
        const legSwing = sw * s * amp;
        hips[i].rotation.x = legSwing * (1 - legTuck) + legTuck * (-0.35 + i * 0.25) + squat * 0.8;
        const kneeBend = Math.max(0, -legSwing) * 1.4 + gait * 0.25;
        knees[i].rotation.x = -(kneeBend * (1 - legTuck) + legTuck * (0.9 + i * 0.3) + squat * 1.5);
        // Arms counter-swing, held wide in the suit; out to the sides in flight.
        shoulders[i].rotation.x = -sw * s * amp * 0.6 * (1 - legTuck) + legTuck * -0.5 + flail;
        shoulders[i].rotation.z = s * (0.28 + legTuck * 0.5);
        elbows[i].rotation.x = -(0.45 + Math.max(0, sw * s) * 0.5 * amp + legTuck * 0.4);
        elbows[i].rotation.z = s * -0.15;
      }
      // Idle: a look about. In the helmet the head follows the view.
      if (helmetView) {
        neck.rotation.y = THREE.MathUtils.clamp(lookYaw, -1.1, 1.1);
        neck.rotation.x = THREE.MathUtils.clamp(-lookPitch, -0.7, 0.7);
      } else {
        neck.rotation.y = speed < 0.3 ? Math.sin(idleT * 0.35) * 0.35 : Math.sin(idleT * 0.8) * 0.06;
        neck.rotation.x = airborne ? -0.15 : 0.05;
      }
      // Footfalls on the ground raise a little dust.
      if (!airborne && speed > 0.8) {
        const stepPhase = Math.sin(phase) * stepSide;
        if (lastStepPhase > 0 && stepPhase <= 0) {
          stepSide = -stepSide;
          const fx = position.x - Math.sin(handle.yaw) * 0.1;
          const fz = position.z - Math.cos(handle.yaw) * 0.1;
          dust.burst({ x: fx, y: g2, z: fz, count: Math.round(3 + gait * 6), speedMin: 0.4, speedMax: 1 + gait * 1.4, cone: 0.7, size: 0.09, dirX: -Math.sin(handle.yaw), dirZ: -Math.cos(handle.yaw), bias: 0.6 });
          handle.onStep?.({ x: fx, y: g2, z: fz, yaw: handle.yaw, side: stepSide, hard: gait });
        }
        lastStepPhase = stepPhase;
      }
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      weave.dispose();
      tapeTex.dispose();
    },
  };
  return handle;
}
