// The cosmonaut on the surface: an articulated EVA suit modelled on the
// current lunar suits — a hard upper torso, a pressure bubble inside a white
// visor assembly with the gold sun visor down and two helmet lamps, a
// rounded life-support pack, convolute bellows at the elbows, knees and
// ankles, gauntlet gloves and thick-soled lunar boots — driven by a gait
// taken from the Apollo films: a short, careful stride at walking pace that
// blends into the two-footed lunar lope as the speed comes up, knees always
// bending the right way, boots kept level with the ground. The one-sixth-g
// controller moves it: long floating strides, slow arcs, a squat on
// touchdown, dust off the boots.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
  /** Standing on a floor rather than regolith: no dust off the boots. */
  indoors: boolean;
  dispose: () => void;
}

const WALK = 2.1;
const RUN = 4.6;
const JUMP_V = 2.7;
const GROUND_ACCEL = 9;
const AIR_ACCEL = 1.2;
const SUIT_RADIUS = 0.55;
const HIP_H = 0.98;
/** Leg segments, hip pivot → knee → ankle → sole. */
const THIGH = 0.46;
const SHIN = 0.42;

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

/** A solid of revolution from (radius, height) pairs listed bottom to top. */
const lathe = (pts: [number, number][], seg = 22) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/** A limb segment hanging down from its pivot: rounded at both ends, tapering. */
const taper = (rTop: number, rBottom: number, length: number) => lathe([
  [0, -length], [rBottom * 0.72, -length + 0.012], [rBottom, -length + 0.045],
  [(rTop + rBottom) / 2 * 1.04, -length / 2], [rTop, -0.045], [rTop * 0.72, -0.012], [0, 0],
]);

export function makeCosmonaut(dust: DustHandle): CosmonautHandle {
  const group = new THREE.Group();
  group.name = 'cosmonaut';
  const body = new THREE.Group();
  group.add(body);
  const weave = fabricNormal();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe2e2dd, roughness: 0.8, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35) });
  const bellows = new THREE.MeshStandardMaterial({ color: 0xcfcfca, roughness: 0.85, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.6, 0.6) });
  const clothDirty = new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.92, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.5, 0.5) });
  const hard = new THREE.MeshStandardMaterial({ color: 0xefefea, roughness: 0.38, metalness: 0.05 });
  const bearing = new THREE.MeshStandardMaterial({ color: 0x9aa0a7, roughness: 0.4, metalness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.6, metalness: 0.3 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x5d636b, roughness: 0.75, metalness: 0.05, normalMap: weave, normalScale: new THREE.Vector2(0.4, 0.4) });
  const sole = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95, metalness: 0 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322c, roughness: 0.7, metalness: 0 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1e4ea8, roughness: 0.7, metalness: 0 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0xd4a53a, roughness: 0.05, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe2f2, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.25, clearcoat: 1 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x0a2a2a, emissive: new THREE.Color(0x5eead4), emissiveIntensity: 0.8, roughness: 0.3 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff4dc), emissiveIntensity: 1.4 });
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.5, metalness: 0.4 });
  hard.side = THREE.DoubleSide;
  const owned: THREE.Material[] = [cloth, clothDirty, bellows, hard, bearing, dark, glove, sole, red, blue, visor, glass, screen, lampMat, hoseMat];
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
  /** Convolute rings: the pleated joint of a pressure suit. */
  const convolute = (parent: THREE.Object3D, r: number, count: number, y0: number, step: number) => {
    for (let b = 0; b < count; b++) mesh(parent, new THREE.TorusGeometry(r, r * 0.2, 8, 20), bellows, 0, y0 - b * step, 0).rotation.x = Math.PI / 2;
  };
  const band = (parent: THREE.Object3D, r: number, y: number, m: THREE.Material, h = 0.035) =>
    mesh(parent, new THREE.CylinderGeometry(r, r, h, 20, 1, true), m, 0, y, 0);

  // ── Torso: hard upper torso, soft waist brief, the waist bearing. ──
  const torso = new THREE.Group();
  torso.position.y = HIP_H;
  body.add(torso);
  mesh(torso, lathe([[0.19, 0.1], [0.225, 0.18], [0.27, 0.32], [0.295, 0.45], [0.285, 0.55], [0.22, 0.63], [0.13, 0.665], [0, 0.67]]), hard, 0, 0, 0)
    .scale.set(1.12, 1, 0.8);
  mesh(torso, lathe([[0, -0.1], [0.17, -0.09], [0.215, -0.02], [0.21, 0.06], [0.19, 0.12]]), cloth, 0, 0, 0).scale.set(1.1, 1, 0.85);
  mesh(torso, new THREE.TorusGeometry(0.2, 0.022, 8, 28), bearing, 0, 0.1, 0).rotation.x = Math.PI / 2;
  // Display and control module on the chest, with its dials.
  mesh(torso, new RoundedBoxGeometry(0.3, 0.15, 0.1, 2, 0.025), dark, 0, 0.36, 0.23);
  mesh(torso, new THREE.BoxGeometry(0.16, 0.07, 0.01), screen, -0.04, 0.37, 0.282);
  for (const dx of [0.08, 0.12]) mesh(torso, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12), bearing, dx, 0.37, 0.285).rotation.x = Math.PI / 2;
  // Name tape, a Georgian flag patch, a commander's red band on the torso.
  const tape = document.createElement('canvas');
  tape.width = 256; tape.height = 64;
  const tc = tape.getContext('2d')!;
  tc.fillStyle = '#e9e9e4'; tc.fillRect(0, 0, 256, 64);
  tc.fillStyle = '#1b1f26'; tc.font = '600 34px "JetBrains Mono", ui-monospace, monospace';
  tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.fillText('MODEBADZE', 128, 34);
  const tapeTex = new THREE.CanvasTexture(tape);
  tapeTex.colorSpace = THREE.SRGBColorSpace;
  const flag = document.createElement('canvas');
  flag.width = 96; flag.height = 64;
  const fc = flag.getContext('2d')!;
  fc.fillStyle = '#ffffff'; fc.fillRect(0, 0, 96, 64);
  fc.fillStyle = '#e8112d';
  fc.fillRect(40, 0, 16, 64); fc.fillRect(0, 24, 96, 16);
  for (const [cx, cy] of [[20, 12], [76, 12], [20, 52], [76, 52]]) { fc.fillRect(cx - 2, cy - 7, 4, 14); fc.fillRect(cx - 7, cy - 2, 14, 4); }
  const flagTex = new THREE.CanvasTexture(flag);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  const tapeMat = new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.8 });
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.8 });
  owned.push(tapeMat, flagMat);
  mesh(torso, new THREE.PlaneGeometry(0.17, 0.042), tapeMat, -0.13, 0.5, 0.232).rotation.y = -0.28;
  mesh(torso, new THREE.PlaneGeometry(0.09, 0.06), flagMat, 0.14, 0.5, 0.23).rotation.y = 0.3;

  // ── Tool belt: a geology hammer on the right hip, a sample pouch on the
  // left, the tether reel in front. ──
  const beltRing = mesh(torso, new THREE.TorusGeometry(0.235, 0.018, 8, 28), dark, 0, -0.05, 0);
  beltRing.rotation.x = Math.PI / 2;
  beltRing.scale.set(1.1, 0.85, 1);
  const hammer = new THREE.Group();
  hammer.position.set(0.25, -0.1, 0.02);
  hammer.rotation.z = 0.25;
  torso.add(hammer);
  mesh(hammer, new THREE.CylinderGeometry(0.012, 0.014, 0.26, 8), hoseMat, 0, -0.12, 0);
  mesh(hammer, new THREE.BoxGeometry(0.04, 0.035, 0.11), bearing, 0, 0.02, 0);
  mesh(hammer, new THREE.BoxGeometry(0.03, 0.03, 0.05), bearing, 0, 0.02, 0.07).rotation.x = 0.4;
  mesh(torso, new RoundedBoxGeometry(0.11, 0.13, 0.06, 2, 0.02), clothDirty, -0.24, -0.14, 0.05);
  mesh(torso, new THREE.BoxGeometry(0.11, 0.02, 0.065), dark, -0.24, -0.075, 0.05);
  const reel = mesh(torso, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), bearing, 0.11, -0.08, 0.2);
  reel.rotation.x = Math.PI / 2;
  mesh(torso, new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8), dark, 0.11, -0.08, 0.2).rotation.x = Math.PI / 2;

  // ── Life-support pack: rounded shell, side covers, top cap, vents. ──
  const pack = new THREE.Group();
  pack.position.set(0, 0.36, -0.35);
  torso.add(pack);
  mesh(pack, new RoundedBoxGeometry(0.54, 0.7, 0.27, 4, 0.06), hard);
  mesh(pack, new RoundedBoxGeometry(0.48, 0.12, 0.24, 3, 0.04), clothDirty, 0, 0.36, 0);
  for (const s of [-1, 1]) {
    mesh(pack, new RoundedBoxGeometry(0.03, 0.52, 0.2, 2, 0.012), bearing, s * 0.275, -0.02, 0);
    mesh(pack, new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), dark, s * 0.18, -0.37, 0.02);
  }
  for (let v = 0; v < 5; v++) mesh(pack, new THREE.BoxGeometry(0.3, 0.012, 0.01), dark, 0, 0.12 - v * 0.05, -0.137);
  mesh(pack, new THREE.BoxGeometry(0.12, 0.05, 0.012), red, 0.15, 0.26, -0.137);
  mesh(pack, new THREE.CylinderGeometry(0.005, 0.005, 0.32, 6), bearing, 0.21, 0.5, -0.06);
  // Umbilicals from the pack round to the chest module.
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.22, 0.12, -0.24), new THREE.Vector3(side * 0.34, 0.14, -0.02),
      new THREE.Vector3(side * 0.3, 0.26, 0.2), new THREE.Vector3(side * 0.15, 0.34, 0.26),
    ]);
    mesh(torso, new THREE.TubeGeometry(curve, 18, 0.018, 8, false), hoseMat);
  }

  // ── Helmet: neck ring, clear bubble, white visor assembly open at the
  // front, the gold sun visor drawn down, a lamp on each temple. ──
  const neck = new THREE.Group();
  neck.position.set(0, 0.64, 0);
  torso.add(neck);
  mesh(neck, new THREE.TorusGeometry(0.155, 0.03, 10, 28), bearing, 0, 0.02, 0).rotation.x = Math.PI / 2;
  const helmetParts = new THREE.Group();
  neck.add(helmetParts);
  const HC = 0.2;
  mesh(helmetParts, new THREE.SphereGeometry(0.185, 28, 20), glass, 0, HC, 0);
  // SphereGeometry's phi runs from -X; π/2 is straight ahead (+Z).
  mesh(helmetParts, new THREE.SphereGeometry(0.212, 32, 24, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8), hard, 0, HC, -0.005);
  mesh(helmetParts, new THREE.SphereGeometry(0.203, 32, 24, Math.PI / 2 - 1.02, 2.04, 0.42, 1.5), visor, 0, HC, 0);
  mesh(helmetParts, new THREE.TorusGeometry(0.2, 0.012, 8, 32, Math.PI * 1.1), hard, 0, HC + 0.01, 0.02).rotation.set(0.25, 0, -Math.PI * 0.05);
  for (const side of [-1, 1]) {
    const lamp = mesh(helmetParts, new RoundedBoxGeometry(0.05, 0.05, 0.1, 2, 0.015), dark, side * 0.2, HC + 0.08, 0.03);
    lamp.rotation.z = side * 0.35;
    mesh(helmetParts, new THREE.CircleGeometry(0.018, 14), lampMat, side * 0.2, HC + 0.08, 0.082);
  }

  // ── Limbs. Each joint is a group at its pivot so the swing reads true. ──
  const sides: number[] = [];
  const shoulders: THREE.Group[] = []; const elbows: THREE.Group[] = [];
  const hips: THREE.Group[] = []; const knees: THREE.Group[] = []; const ankles: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    sides.push(side);
    // Arm: shoulder bearing, upper arm with the red band, elbow convolutes,
    // forearm, wrist disconnect, glove with gauntlet and thumb.
    const sh = new THREE.Group();
    sh.position.set(side * 0.33, 0.5, 0);
    torso.add(sh);
    mesh(sh, new THREE.SphereGeometry(0.1, 16, 12), hard);
    mesh(sh, new THREE.TorusGeometry(0.092, 0.018, 8, 22), bearing, 0, -0.05, 0).rotation.x = Math.PI / 2;
    mesh(sh, taper(0.088, 0.072, 0.3), cloth, 0, -0.04, 0);
    band(sh, 0.086, -0.17, red, 0.045);
    const el = new THREE.Group();
    el.position.set(0, -0.34, 0);
    sh.add(el);
    convolute(el, 0.075, 3, 0.02, 0.032);
    mesh(el, taper(0.07, 0.058, 0.26), cloth, 0, -0.05, 0);
    mesh(el, new THREE.TorusGeometry(0.06, 0.016, 8, 20), bearing, 0, -0.3, 0).rotation.x = Math.PI / 2;
    const hand = new THREE.Group();
    hand.position.set(0, -0.32, 0);
    el.add(hand);
    mesh(hand, new THREE.CylinderGeometry(0.066, 0.058, 0.07, 16), glove, 0, -0.02, 0);
    mesh(hand, new RoundedBoxGeometry(0.085, 0.1, 0.05, 2, 0.02), glove, 0, -0.1, 0.005);
    mesh(hand, new RoundedBoxGeometry(0.08, 0.07, 0.042, 2, 0.018), glove, 0, -0.17, 0.02).rotation.x = -0.45;
    mesh(hand, new THREE.CapsuleGeometry(0.016, 0.04, 4, 8), glove, -side * 0.048, -0.09, 0.03).rotation.z = -side * 0.5;
    // Left forearm: the cuff display and its checklist; right: a wrist mirror.
    if (side < 0) {
      mesh(el, new RoundedBoxGeometry(0.1, 0.075, 0.035, 2, 0.01), dark, 0, -0.19, 0.06).rotation.x = -0.35;
      mesh(el, new THREE.PlaneGeometry(0.07, 0.04), screen, 0, -0.185, 0.081).rotation.x = -0.35;
    } else {
      mesh(el, new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16), bearing, 0, -0.2, 0.066).rotation.x = Math.PI / 2 - 0.35;
    }
    shoulders.push(sh); elbows.push(el);

    // Leg: hip bearing, thigh, knee convolutes, shin, ankle bellows, boot.
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, 0.02, 0);
    torso.add(hip);
    mesh(hip, new THREE.SphereGeometry(0.115, 16, 12), cloth);
    mesh(hip, taper(0.115, 0.09, THIGH), cloth, 0, -0.02, 0);
    band(hip, 0.108, -0.14, red, 0.05);
    const kn = new THREE.Group();
    kn.position.set(0, -THIGH, 0);
    hip.add(kn);
    convolute(kn, 0.096, 4, 0.04, 0.036);
    mesh(kn, taper(0.088, 0.072, SHIN), cloth, 0, -0.06, 0);
    const an = new THREE.Group();
    an.position.set(0, -SHIN, 0);
    kn.add(an);
    convolute(an, 0.074, 2, 0.05, 0.03);
    mesh(an, new THREE.CylinderGeometry(0.082, 0.09, 0.08, 18), clothDirty, 0, 0, 0.01);
    mesh(an, new RoundedBoxGeometry(0.15, 0.08, 0.27, 3, 0.035), clothDirty, 0, -0.045, 0.045);
    mesh(an, new THREE.SphereGeometry(0.075, 16, 12), clothDirty, 0, -0.05, 0.15).scale.set(1, 0.55, 0.9);
    mesh(an, new RoundedBoxGeometry(0.16, 0.03, 0.32, 2, 0.01), sole, 0, -0.095, 0.05);
    mesh(an, new THREE.BoxGeometry(0.07, 0.03, 0.015), blue, 0, -0.02, 0.19);
    hips.push(hip); knees.push(kn); ankles.push(an);
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
  let lope = 0;
  const eyeLocal = new THREE.Vector3(0, HC, 0.08);
  let lookYaw = 0;
  let lookPitch = 0;
  let helmetView = false;
  const handle: CosmonautHandle = {
    group, position, yaw: 0, state, onStep: null, indoors: false,
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
        if (!handle.indoors) dust.burst({ x: position.x, y: ground, z: position.z, count: 14, speedMin: 0.6, speedMax: 1.8, cone: 0.9, size: 0.12 });
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
          if (!handle.indoors) dust.burst({ x: position.x, y: g2, z: position.z, count: Math.round(10 + squat * 40), speedMin: 0.8, speedMax: 2.2 + squat * 2, cone: 1.25, size: 0.14 });
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
      const leanTarget = airborne ? 0.1 : speed / RUN * 0.3;
      lean += (leanTarget - lean) * (1 - Math.exp(-dt * 6));

      // ── Pose. Rotation about X: negative swings a limb forward, positive
      // folds a knee back. ──
      const gait = Math.min(1, speed / RUN);
      // The walk hands over to the lope — both feet pushing off nearly
      // together, a long float between contacts — as the speed comes up.
      const lopeTarget = THREE.MathUtils.smoothstep(speed, WALK * 1.1, RUN * 0.8);
      lope += (lopeTarget - lope) * (1 - Math.exp(-dt * 3));
      const strideHz = THREE.MathUtils.lerp(0.9 + gait * 0.7, 1.2, lope);
      if (!airborne) phase += dt * strideHz * Math.PI * 2 * Math.min(1, speed / 0.6);
      const moving = Math.min(1, speed / 0.6);
      const amp = airborne ? 0 : THREE.MathUtils.lerp(0.28 + gait * 0.3, 0.4, lope) * moving;
      const legLag = THREE.MathUtils.lerp(Math.PI, 0.45, lope);
      const bob = airborne ? 0 : THREE.MathUtils.lerp(Math.abs(Math.cos(phase)) * 0.03 * gait, Math.max(0, Math.sin(phase)) * 0.09, lope) * moving;
      body.position.y = bob - squat * 0.16;
      torso.rotation.x = lean + squat * 0.3 + lope * 0.05 * Math.cos(phase) * moving;
      torso.rotation.z = airborne ? 0 : -Math.sin(phase) * 0.035 * gait * (1 - lope);
      const breathe = Math.sin(idleT * 1.5) * 0.01;
      torso.scale.set(1, 1 + breathe * (speed < 0.3 ? 1 : 0), 1);
      const tuck = airborne ? Math.min(1, airT / 0.35) : 0;
      const free = 1 - tuck;
      const flail = airborne ? Math.sin(airT * 2.6) * 0.07 : 0;
      for (let i = 0; i < 2; i++) {
        const s = sides[i];
        const p = phase + (i === 0 ? 0 : legLag);
        const swing = Math.sin(p) * amp;
        // The knee folds while the leg swings through (thigh travelling
        // forward), and stays a little soft in stance — suits don't lock.
        const flex = 0.1 + Math.max(0, Math.cos(p)) * (0.5 + lope * 0.35) * moving;
        hips[i].rotation.x = -swing * free + tuck * (-0.6 - i * 0.12) - squat * 0.8;
        hips[i].rotation.z = s * 0.035;
        knees[i].rotation.x = flex * free + tuck * (1.0 + i * 0.15) + squat * 1.45;
        // Boots stay close to level with the ground.
        ankles[i].rotation.x = -(hips[i].rotation.x + knees[i].rotation.x) * 0.8;
        // Arms: a small counter-swing at a walk; carried forward for balance in the lope.
        const walkArm = swing * 0.45 - 0.08;
        const lopeArm = -0.3 + Math.sin(phase) * 0.08 * moving;
        shoulders[i].rotation.x = THREE.MathUtils.lerp(walkArm, lopeArm, lope) * free + tuck * -0.55 + flail;
        shoulders[i].rotation.z = s * (0.2 + tuck * 0.45);
        elbows[i].rotation.x = -(0.45 + lope * 0.35 + tuck * 0.3 + Math.max(0, -swing) * 0.25);
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
          if (!handle.indoors) dust.burst({ x: fx, y: g2, z: fz, count: Math.round(3 + gait * 6), speedMin: 0.4, speedMax: 1 + gait * 1.4, cone: 0.7, size: 0.09, dirX: -Math.sin(handle.yaw), dirZ: -Math.cos(handle.yaw), bias: 0.6 });
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
      flagTex.dispose();
    },
  };
  return handle;
}
