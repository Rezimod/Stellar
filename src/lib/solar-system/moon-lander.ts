// The landing. Not a camera move — a vehicle: the crew's own ship.
//
// The crew arrives a hundred and forty metres over the mare with the pad
// off the nose and the engines already lit under them. The right hand holds
// the throttle, the left translates. One sixth g is patient: the engines
// only have to take the edge off, and a metre a second of drift at fifty
// metres is a hundred metres downrange if you leave it. Below thirty the
// exhaust starts to move regolith and the pad disappears into the sheet of
// it, which is exactly what the Apollo crews found.
//
// Nobody is allowed to crash. The guidance computer watches the numbers,
// and the moment the engines could no longer stop the fall in the height
// that is left, it takes the stick and flies it down itself. What the
// pilot is playing for is the touchdown speed on the plaque afterwards.
//
// The vehicle is whichever hull the crew flew here in (ship-mesh's kinds):
// the same file the flight scene shows, at its own size in metres, standing
// on its gear, its engines vectored down for the hover. The Endurance is a
// station-sized ring that never lands; its crew, and anyone who asks for no
// kind at all, come down in the lander. The physics and the telemetry are
// the same whichever hull it is, so the landing HUD never has to know.

import * as THREE from 'three';
import { MOON_G, type DustBurst, type DustHandle } from '@/lib/solar-system/moon-fx';
import { keep } from '@/lib/solar-system/moon-batch';
import { acquireModel } from '@/game/models';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import { plumeCoreColor, type ShipKind } from '@/lib/solar-system/ship-mesh';
import type { LightPool } from '@/lib/solar-system/moon-lights';

/** What comes down: one of the flyable hulls, or the lander itself. */
export type DescentKind = ShipKind | 'lander';

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
  /** Seconds since the engine was lit to leave, or −1 on the ground. */
  climb: number;
}

export interface LanderHandle {
  group: THREE.Group;
  telemetry: LanderTelemetry;
  /** The point the chase camera should hold. */
  position: THREE.Vector3;
  /** Which way the nose points (rad about +Y); the lander has no nose and reads 0. */
  yaw: number;
  /** Which hull this is, and how far back a chase camera should sit to frame it. */
  kind: DescentKind;
  chase: number;
  /** The walk collider round the hull, m. */
  hull: number;
  update: (dt: number, input: LanderInput, heightAt: (x: number, z: number) => number) => void;
  /** The crew is aboard: light the engine and go back up. */
  launch: () => void;
  dispose: () => void;
}

/** The lander, built in Blender (assets-src/blender/lander.py). */
const LANDER_MODEL = '/explore/models/lander.glb';
/** The flyable hulls, the same files the flight scene shows (ship-mesh.ts),
 *  in metres. Only the lander can be acquired by name here: the test that
 *  keeps the prefetch honest reads these urls out of this file. */
const KESTREL_MODEL = '/explore/models/ship-stellar.glb';
const XFOIL_MODEL = '/explore/models/ship-fighter.glb';
const CRUISER_MODEL = '/explore/models/ship-cruiser.glb';

/** A hull's numbers for the landing: the file, how high its origin stands
 *  over the ground on its gear, where the crew step off (in the hull's own
 *  frame, +X to port, +Z forward), how big it is for the walk and for the
 *  camera, where its engines are and which way the nose points once it is
 *  set down (the chase camera looks along -Z). */
interface VehicleSpec {
  url: string;
  rest: number;
  egress: { x: number; z: number };
  hull: number;
  chase: number;
  yaw: number;
  /** The nozzles, in the hull's frame, and the radius of each. Hulls that
   *  name their engines in the file (`Engine_*` empties) are read from it
   *  instead, and these are the fallback if the file never comes. */
  engines: { x: number; y: number; z: number; r: number }[];
  /** The plume's direction in the hull's frame: straight down for the lander,
   *  down and a little aft for a ship hovering on vectored mains. */
  thrust: THREE.Vector3;
  /** The drive's colour, as the flight scene tints it. */
  drive: number;
  /** Gear to build in code, when the file has none: strut feet [x, belly y, z]. */
  gear: [number, number, number][] | null;
  /** The file's own landing gear node, shown down for the landing. */
  gearNode: string | null;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const DOWN_AFT = new THREE.Vector3(0, -1, -0.42).normalize();
const VEHICLES: Record<DescentKind, VehicleSpec> = {
  lander: {
    url: LANDER_MODEL, rest: 0.35, egress: { x: 0, z: 6.5 }, hull: 3.4, chase: 17, yaw: 0,
    engines: [0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2 + Math.PI / 4; return { x: Math.sin(a) * 0.62, y: -1.9, z: Math.cos(a) * 0.62, r: 0.34 }; }),
    thrust: DOWN, drive: 0x9fd4ff, gear: null, gearNode: null,
  },
  kestrel: {
    url: KESTREL_MODEL, rest: 3.1, egress: { x: 8.6, z: 1.2 }, hull: 6.4, chase: 27, yaw: Math.PI,
    engines: [{ x: 0, y: 0.08, z: -7.73, r: 0.96 }, { x: 4.65, y: 0, z: -5.57, r: 0.87 }, { x: -4.65, y: 0, z: -5.57, r: 0.87 }],
    thrust: DOWN_AFT, drive: 0xff9448, gear: null, gearNode: 'Gear',
  },
  xfoil: {
    url: XFOIL_MODEL, rest: 1.9, egress: { x: 6.2, z: 0.6 }, hull: 4.8, chase: 21, yaw: Math.PI,
    engines: [{ x: 1.55, y: -0.05, z: -5.2, r: 0.4 }, { x: -1.55, y: -0.05, z: -5.2, r: 0.4 }],
    thrust: DOWN_AFT, drive: 0x8ad8ff, gear: [[1.7, -0.78, -2.6], [-1.7, -0.78, -2.6], [0, -0.78, 3.4]], gearNode: null,
  },
  cruiser: {
    url: CRUISER_MODEL, rest: 2.3, egress: { x: 9.4, z: 2 }, hull: 7.8, chase: 34, yaw: Math.PI,
    engines: [{ x: 0, y: 0.65, z: -14.23, r: 0.52 }, { x: 2.1, y: 0.5, z: -14.41, r: 0.36 }, { x: -2.1, y: 0.5, z: -14.41, r: 0.36 }],
    thrust: DOWN_AFT, drive: 0x5eead4, gear: [[3.4, -0.75, -6.5], [-3.4, -0.75, -6.5], [0, -0.75, 8.5]], gearNode: null,
  },
  // A ring the size of a station does not land: its crew take the lander down.
  endurance: null as unknown as VehicleSpec,
};
VEHICLES.endurance = VEHICLES.lander;

const START_ALT = 138;
const START_DESCENT = 13.5;
/** Full throttle, in gravities — a shade over twice the surface pull, as the LM had. */
const THRUST_G = 2.4;
const RCS_G = 1.48;
const FUEL_BURN = 0.035;
/** How much of the engine's braking the profile asks for: the rest is the
 *  margin that makes the profile flyable at all. */
const PROFILE = 0.8;
/** Radius of the laid pad the crew aims at, as moon-base-zones draws it. The
 *  other worlds have no paint, so this simply makes their guidance precise. */
const PAD_R = 11.5;

/** Where the powered descent begins: height over the pad, sink rate, and how far off it the vehicle is. */
export interface DescentStart { alt: number; descent: number; offsetX: number; offsetZ: number; driftX: number; driftZ: number }
const MOON_START: DescentStart = { alt: START_ALT, descent: START_DESCENT, offsetX: -34, offsetZ: 52, driftX: 1.6, driftZ: -2.4 };

export interface LanderOptions {
  /** Which hull comes down. Left out, the lander does. */
  kind?: DescentKind;
}

export function makeLander(
  padX: number,
  padZ: number,
  heightAt: (x: number, z: number) => number,
  dust: DustHandle,
  lite: boolean,
  lights?: LightPool,
  g = MOON_G,
  start: DescentStart = MOON_START,
  opts: LanderOptions = {},
): LanderHandle {
  const MAX_THRUST = THRUST_G * g;
  const RCS = RCS_G * g;
  const kind: DescentKind = opts.kind && opts.kind in VEHICLES ? opts.kind : 'lander';
  const spec = VEHICLES[kind];
  /** How high the origin stands over the ground with the gear on it. */
  const REST = spec.rest;
  const group = new THREE.Group();
  group.name = kind === 'lander' ? 'lander' : 'ship';
  group.rotation.y = spec.yaw;
  /** The visible vehicle, under the physics origin: it squats on its gear at touchdown. */
  const hull = new THREE.Group();
  group.add(hull);
  const geoms: THREE.BufferGeometry[] = [];
  const owned: THREE.Material[] = [];
  const seg = lite ? 10 : 16;
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff2d0), emissiveIntensity: 1.8 });
  const drive = new THREE.Color(spec.drive);
  // The exhaust: a soft haze in the drive's colour round a long HDR core —
  // the blue-white streak a ship hovers on — and a glow at each nozzle.
  const plumeMat = new THREE.MeshBasicMaterial({ color: drive.clone().multiplyScalar(1.3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: plumeCoreColor(drive), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const glowMat = new THREE.SpriteMaterial({ map: softSpriteTexture(), color: plumeCoreColor(drive).multiplyScalar(0.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.55, metalness: 0.7 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8, metalness: 0.4 });
  owned.push(lampMat, plumeMat, coreMat, glowMat, strutMat, padMat);
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // ── The plumes. One pair of cones per nozzle — haze and core — pointing
  // the way the spec says the thrust goes, and a glow sprite at the throat.
  // Built from the spec now, and rebuilt from the file's `Engine_*` empties
  // if it names them, so the exhaust sits exactly on the modelled bells. ──
  const plumes: THREE.Mesh[] = [];
  const cores: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const plumeFrame = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), spec.thrust);
  const buildPlumes = (engines: VehicleSpec['engines']) => {
    for (const p of plumes) p.removeFromParent();
    for (const c of cores) c.removeFromParent();
    for (const s of glows) s.removeFromParent();
    plumes.length = cores.length = glows.length = 0;
    for (const e of engines) {
      // The haze is short and wide, the core long and narrow; both hang from
      // the throat (apex up) so scaling in Y stretches them away from it.
      const haze = keep(mesh(hull, new THREE.ConeGeometry(e.r * 1.05, e.r * 9, seg, 1, true), plumeMat, e.x, e.y, e.z));
      const core = keep(mesh(hull, new THREE.ConeGeometry(e.r * 0.5, e.r * 15, seg, 1, true), coreMat, e.x, e.y, e.z));
      for (const m of [haze, core]) {
        // Wide end at the throat, tip trailing down the thrust line (-Y here).
        m.geometry.rotateX(Math.PI);
        m.geometry.translate(0, -(m.geometry as THREE.ConeGeometry).parameters.height / 2, 0);
        m.quaternion.copy(plumeFrame);
        m.castShadow = false;
        m.receiveShadow = false;
      }
      plumes.push(haze);
      cores.push(core);
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(e.x, e.y, e.z).addScaledVector(spec.thrust, e.r * 0.6);
      glow.scale.setScalar(e.r * 5.5);
      hull.add(glow);
      glows.push(glow);
    }
  };
  buildPlumes(spec.engines);
  const plumeScale = (x: number, y: number, z: number) => {
    for (const p of plumes) p.scale.set(x, y, z);
    for (const c of cores) c.scale.set(x * 0.9, y * 1.25, z * 0.9);
  };
  const plumeOpacity = (k: number) => {
    plumeMat.opacity = k * 0.55;
    coreMat.opacity = Math.min(1, k * 0.95);
    glowMat.opacity = Math.min(1, k * 0.9);
    const show = k > 0.01;
    for (const p of plumes) p.visible = show;
    for (const c of cores) c.visible = show;
    for (const s of glows) s.visible = show;
  };
  plumeOpacity(0);

  // ── The gear: the file's own, shown down, or three struts on pads built
  // here for the hulls that carry none. ──
  const gear = new THREE.Group();
  hull.add(gear);
  if (spec.gear) {
    const strutGeom = new THREE.CylinderGeometry(0.09, 0.12, 1, 8);
    const padGeom = new THREE.CylinderGeometry(0.55, 0.62, 0.16, 12);
    geoms.push(strutGeom, padGeom);
    for (const [x, belly, z] of spec.gear) {
      const drop = REST + belly - 0.08;
      const strut = new THREE.Mesh(strutGeom, strutMat);
      strut.scale.y = drop;
      strut.position.set(x, belly - drop / 2, z);
      strut.castShadow = true;
      gear.add(strut);
      const pad = new THREE.Mesh(padGeom, padMat);
      pad.position.set(x, -REST + 0.08, z);
      pad.castShadow = true;
      pad.receiveShadow = !lite;
      gear.add(pad);
    }
  }

  // ── The vehicle itself: the ship the crew flew here in, or lander.glb
  // (assets-src/blender/lander.py). The file is in metres, so it goes in as
  // it is; only the lighter LOD copies are dropped, since the vehicle is
  // never far from the camera on the ground. ──
  let releaseModel: (() => void) | null = null;
  let disposed = false;
  acquireModel(spec.url, true).then((handle) => {
    if (disposed) { handle.release(); return; }
    releaseModel = handle.release;
    const shell = handle.scene.clone(true);
    const drop: THREE.Object3D[] = [];
    const engines: VehicleSpec['engines'] = [];
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    shell.updateMatrixWorld(true);
    shell.traverse((o) => {
      if (/_LOD\d$/.test(o.name)) drop.push(o);
      const mm = o as THREE.Mesh;
      if (mm.isMesh) {
        mm.castShadow = true;
        mm.receiveShadow = !lite;
      } else if (o.name.startsWith('Engine')) {
        o.getWorldPosition(pos);
        o.getWorldScale(scl);
        engines.push({ x: pos.x, y: pos.y, z: pos.z, r: Math.max(0.2, scl.x) });
      }
    });
    for (const o of drop) o.removeFromParent();
    if (engines.length) buildPlumes(engines);
    hull.add(shell);
  }, () => undefined);
  if (kind === 'lander') mesh(hull, new THREE.SphereGeometry(0.1, 8, 6), lampMat, 0, 2.95, 2.6);

  const position = group.position;
  const vel = new THREE.Vector3(start.driftX, -start.descent, start.driftZ);
  const padY = heightAt(padX, padZ);
  // The origin starts `rest` higher than the altitude reads, so the reading
  // is the height under the gear, and zero when it is on the ground.
  position.set(padX + start.offsetX, padY + start.alt + REST, padZ + start.offsetZ);
  const telemetry: LanderTelemetry = {
    altitude: start.alt, descent: start.descent, ground: padY, fuel: 1, throttle: 0,
    offset: 0, drift: 0, driftX: vel.x, driftZ: vel.z,
    assist: false, landed: false, touchdown: 0, egressX: padX, egressZ: padZ, climb: -1,
  };
  let flicker = 0;
  let dustAcc = 0;
  /** The gear takes the touchdown: the hull squats and springs back. */
  let squat = 0;
  let squatVel = 0;
  const grain: DustBurst = { x: 0, y: 0, z: 0, count: 1, speedMin: 2, speedMax: 4, cone: 1.5, size: 0.15, dirX: 0, dirZ: 0, bias: 2.4 };
  /** Where the crew step off, in the world: the spec's point turned by the nose. */
  const egressAt = () => {
    const c = Math.cos(spec.yaw); const s = Math.sin(spec.yaw);
    telemetry.egressX = position.x + spec.egress.x * c + spec.egress.z * s;
    telemetry.egressZ = position.z - spec.egress.x * s + spec.egress.z * c;
  };
  /** The exhaust, and what it does to the ground: the plumes stretch with
   *  the throttle and flicker, the light under the vehicle follows, and
   *  below thirty metres the blast starts to move regolith — by ten it is a
   *  sheet of it going sideways faster than the vehicle is coming down. */
  const exhaust = (dt: number, t: number, alt: number, g2: number, rate: number) => {
    flicker += dt * 30;
    plumeOpacity(t * (0.85 + 0.15 * Math.sin(flicker)));
    plumeScale(0.8 + t * 0.35, 0.35 + t * 0.85 + 0.07 * Math.sin(flicker * 1.7), 0.8 + t * 0.35);
    lights?.request(position.x, position.y - REST * 0.5, position.z, spec.drive, t * 28 * Math.max(1, spec.hull / 3.4), 20 + alt * 0.6 + spec.hull * 2, 2);
    const blast = t * Math.max(0, 1 - alt / 30);
    dustAcc += blast * dt * rate;
    const ring = spec.hull * 0.45;
    while (dustAcc >= 1) {
      dustAcc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = ring + Math.random() * (3 + blast * 9);
      grain.x = position.x + Math.cos(a) * r; grain.y = g2; grain.z = position.z + Math.sin(a) * r;
      grain.count = 1; grain.speedMin = 1.5; grain.speedMax = 3 + blast * 9; grain.cone = 1.5; grain.size = 0.14 + blast * 0.04;
      grain.dirX = Math.cos(a); grain.dirZ = Math.sin(a); grain.bias = 2.2 + blast * 2;
      dust.burst(grain);
    }
  };
  /** The squat on the gear, as a damped spring, drawn into the hull's offset. */
  const settleGear = (dt: number) => {
    const k = 34; const c = 7.5;
    squatVel += (-k * squat - c * squatVel) * dt;
    squat += squatVel * dt;
    hull.position.y = -squat;
  };

  /** The translation the last step of powered descent asked for. */
  let tx = 0; let tz = 0;
  /** One step of powered descent. */
  const fly = (dt: number, input: LanderInput, height: (x: number, z: number) => number) => {
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
    const safe = Math.sqrt(2 * net * Math.max(0, alt - REST - 0.85)) * PROFILE;
    const want = Math.max(0.6, Math.min(Math.max(START_DESCENT, start.descent * (1 - 1 / (1 + alt / 60))), safe));
    // Landing thirty metres off the middle of a pad that is forty-six
    // across is a landing; landing in the rocks beyond it is not, so the
    // computer also steps in for a pilot who has not killed the drift.
    // The threshold stays wide on purpose: a pilot who is still working the
    // drift keeps the stick, and it is the computer's own approach below
    // that has to put the vehicle on the paint.
    if (fall > safe * 1.06 + 0.9 || (alt < 25 && offset > 32)) telemetry.assist = true;

    let throttle = THREE.MathUtils.clamp(input.throttle, 0, 1);
    tx = input.moveX; tz = -input.moveY;
    if (telemetry.assist) {
      // Fly back over the middle, then set down on it. The old gain pulled
      // the offset in on a 9-second time constant while the whole descent
      // lasted 16, so the computer ran out of height with the pad still
      // twenty metres away and put the vehicle down in the regolith beside
      // it. Close the offset faster, and while it is still wide, ease the
      // sink rate so there is height left to close it in — which is what a
      // pilot does, and what the fuel is for (a full tank is over a minute
      // of hover and the descent takes a quarter of that).
      const wide = offset > PAD_R * 0.25 && alt > 12;
      const target = wide ? Math.min(want, 2.4) : want;
      throttle = THREE.MathUtils.clamp((fall - target) * 1.4 + (g / MAX_THRUST), 0, 1);
      const backX = (padX - position.x) * 0.13 - vel.x * 0.62;
      const backZ = (padZ - position.z) * 0.13 - vel.z * 0.62;
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
    if (position.y - g2 <= REST) {
      position.y = g2 + REST;
      telemetry.landed = true;
      telemetry.touchdown = Math.max(0, -vel.y);
      // The gear takes the hit: the harder the touchdown, the deeper the squat.
      squatVel = Math.min(2.2, 0.5 + telemetry.touchdown * 0.45) * Math.min(1, REST / 1.2 + 0.25);
      vel.set(0, 0, 0);
      // The pads throw a ring of dust out from under the vehicle.
      const ring = spec.hull * 0.75;
      for (let i = 0; i < 26 + Math.round(spec.hull * 3); i++) {
        const a = Math.random() * Math.PI * 2;
        grain.x = position.x + Math.cos(a) * ring; grain.y = g2; grain.z = position.z + Math.sin(a) * ring;
        grain.count = 3; grain.speedMin = 1.4; grain.speedMax = 5.5 + spec.hull * 0.3; grain.cone = 1.45; grain.size = 0.17;
        grain.dirX = Math.cos(a); grain.dirZ = Math.sin(a); grain.bias = 2.6;
        dust.burst(grain);
      }
      egressAt();
    }
  };

  const handle: LanderHandle = {
    group, telemetry, position, yaw: spec.yaw, kind, chase: spec.chase, hull: spec.hull,
    update(dt, input, height) {
      if (telemetry.climb >= 0) {
        // Going home: the engines come up to full over a second, the vehicle
        // hangs a moment while it overcomes its own weight, then climbs.
        telemetry.climb += dt;
        telemetry.throttle += (1 - telemetry.throttle) * (1 - Math.exp(-dt * 2.5));
        vel.y += (telemetry.throttle * MAX_THRUST - g) * dt;
        if (vel.y < 0 && position.y - height(position.x, position.z) <= REST + 1e-3) vel.y = 0;
        position.y += vel.y * dt;
        const g2 = height(position.x, position.z);
        const alt = position.y - g2 - REST;
        exhaust(dt, telemetry.throttle, alt, g2, 90);
        // Off the gear: the hull unloads as the thrust comes on.
        squat += ((-0.08 * telemetry.throttle) - squat) * (1 - Math.exp(-dt * 4));
        hull.position.y = -squat;
        // A ship noses up a touch as it climbs away; the lander goes straight up.
        if (kind !== 'lander' && kind !== 'endurance') {
          group.rotation.x += ((-0.12 * Math.min(1, telemetry.climb / 4)) - group.rotation.x) * (1 - Math.exp(-dt * 1.5));
        }
        telemetry.altitude = Math.max(0, alt);
        telemetry.descent = -vel.y;
        return;
      }
      if (telemetry.landed) {
        // Down and quiet: the plumes die, the dust settles, the gear takes the weight.
        telemetry.throttle += (0 - telemetry.throttle) * (1 - Math.exp(-dt * 6));
        plumeOpacity(telemetry.throttle);
        plumeScale(0.8, 0.35 + telemetry.throttle * 0.5, 0.8);
        lights?.request(position.x, position.y - REST * 0.5, position.z, spec.drive, telemetry.throttle * 20, 20 + spec.hull * 2, 2);
        settleGear(dt);
        group.rotation.z += (0 - group.rotation.z) * (1 - Math.exp(-dt * 3));
        group.rotation.x += (0 - group.rotation.x) * (1 - Math.exp(-dt * 3));
        return;
      }
      // The flight itself in steps no longer than a 120th of a second, so the
      // touchdown — and its grade — does not depend on the frame rate.
      const n = Math.max(1, Math.ceil(dt * 120 - 1e-6));
      for (let i = 0; i < n && !telemetry.landed; i++) fly(dt / n, input, height);
      const g2 = height(position.x, position.z);
      const alt = position.y - g2 - REST;

      // ── The exhaust, and what it does to the ground. ──
      exhaust(dt, telemetry.throttle, alt, g2, 60);
      // The vehicle leans a touch into the translation it is asking for —
      // in its own frame, so a hull with its nose the other way leans the
      // same way the pilot pushed.
      const facing = Math.cos(spec.yaw);
      group.rotation.z += (-tx * 0.06 * facing - group.rotation.z) * (1 - Math.exp(-dt * 3));
      group.rotation.x += (tz * 0.06 * facing - group.rotation.x) * (1 - Math.exp(-dt * 3));

      telemetry.altitude = Math.max(0, alt);
      telemetry.descent = Math.max(0, -vel.y);
      telemetry.ground = g2;
      telemetry.offset = Math.hypot(position.x - padX, position.z - padZ);
      telemetry.driftX = vel.x;
      telemetry.driftZ = vel.z;
      telemetry.drift = Math.hypot(vel.x, vel.z);
    },
    launch() {
      if (!telemetry.landed || telemetry.climb >= 0) return;
      telemetry.climb = 0;
      vel.set(0, 0, 0);
    },
    dispose() {
      disposed = true;
      releaseModel?.();
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
    },
  };
  return handle;
}
