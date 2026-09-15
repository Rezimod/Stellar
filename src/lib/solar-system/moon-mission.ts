// The expedition: one long job of work on the surface, in five acts.
//
// The base picks up a magnetic anomaly a hundred metres out and asks the
// crew to go and drill it. The core comes up with metal in it that has no
// business being there, and the bearing it gives points across the mare to
// a crater nobody has walked. Under the regolith there is a hull. Sweep it
// clear, the seam finds its power, and something that has been waiting a
// very long time opens its door.
//
// This file owns the props — the waypoint beacons, the drill rig, the
// buried craft — and the state machine that walks the crew through them.
// It keeps its progress in localStorage, so a crew that has made contact
// comes back to a craft that is still lit and a rover with the fourth gear
// unlocked.

import * as THREE from 'three';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { DustHandle } from '@/lib/solar-system/moon-fx';
import { fbm } from '@/lib/solar-system/moon-terrain';

export type MissionStage = 'survey' | 'drill' | 'trace' | 'excavate' | 'contact' | 'done';
export type MissionTask = '' | 'drill' | 'sweep' | 'enter';

export interface MissionTelemetry {
  stage: MissionStage;
  /** The line on the glass, a key under `solarSystem.moon.mission`. */
  objective: string;
  /** Range and world bearing to the thing to go to; -1 when there is none. */
  distance: number;
  bearing: number;
  hasMarker: boolean;
  /** The held job at this site, and how far through it the crew is. */
  task: MissionTask;
  work: number;
  atSite: boolean;
  /** Metres of core drawn, while the drill turns. */
  depth: number;
  /** A line to throw up big for a few seconds when an act ends. */
  banner: string;
  bannerHold: number;
  /** Everything earned so far, newest last. */
  rewards: string[];
  complete: boolean;
}

export interface MissionContext {
  crewX: number;
  crewZ: number;
  /** The action key or button, held down. */
  working: boolean;
  /** Riding the rover — you cannot drill from the saddle. */
  driving: boolean;
}

export interface MissionHandle {
  group: THREE.Group;
  /** The rig and the hull: things to walk round rather than through. */
  colliders: Collider[];
  telemetry: MissionTelemetry;
  /** Where the active marker stands, for the world-space pip. */
  marker: THREE.Vector3 | null;
  /** Fired when an act ends or a tool bites — the scene makes the noise. */
  onEvent: ((kind: 'step' | 'bite' | 'reward') => void) | null;
  update: (dt: number, t: number, ctx: MissionContext) => void;
  /** Development only: skip to the end of the current act. */
  advance: () => void;
  dispose: () => void;
}

/** Where the survey stake and the buried craft stand, in world metres. */
export const SURVEY_SITE = new THREE.Vector2(-96, 62);
export const ANOMALY_SITE = new THREE.Vector2(108, 84);
const SITE_REACH = 7.5;
const HATCH_REACH = 3.4;
const DRILL_SECONDS = 8;
const SWEEP_SECONDS = 9;
const CORE_DEPTH = 5.2;
const STORE = 'stellar_moon_expedition_v1';

/** What survives a reload: how far the crew got, and what they were given. */
interface Saved { stage: MissionStage; rewards: string[] }

const STAGES: MissionStage[] = ['survey', 'drill', 'trace', 'excavate', 'contact', 'done'];

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return { stage: 'survey', rewards: [] };
    const v = JSON.parse(raw) as Partial<Saved>;
    const stage = STAGES.includes(v.stage as MissionStage) ? (v.stage as MissionStage) : 'survey';
    const rewards = Array.isArray(v.rewards) ? v.rewards.filter((r) => typeof r === 'string').slice(0, 8) : [];
    return { stage, rewards };
  } catch {
    return { stage: 'survey', rewards: [] };
  }
}
function save(s: Saved) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private window: play it through anyway */ }
}

/** Has this crew made contact before? The rover's fourth gear depends on it. */
export function missionComplete(): boolean {
  return load().stage === 'done';
}

export function makeMission(
  heightAt: (x: number, z: number) => number,
  stampCrater: (x: number, z: number, r: number, depth: number) => void,
  dust: DustHandle,
  lite: boolean,
): MissionHandle {
  // Dig the crater the thing is lying in before anything reads a height.
  stampCrater(ANOMALY_SITE.x, ANOMALY_SITE.y, 15, 2.3);
  const group = new THREE.Group();
  group.name = 'expedition';
  const geoms: THREE.BufferGeometry[] = [];
  const owned: THREE.Material[] = [];
  const seg = lite ? 18 : 32;
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  const steel = new THREE.MeshStandardMaterial({ color: 0x767b83, roughness: 0.42, metalness: 0.82 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd2d2cc, roughness: 0.62, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.55, metalness: 0.4 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffb347), emissiveIntensity: 2 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x06202a, emissive: new THREE.Color(0x5eead4), emissiveIntensity: 0.9, roughness: 0.3 });
  const spoil = new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 1, metalness: 0 });
  /** The hull: oily and almost a mirror, but never a silhouette — a pure
   *  mirror under one sun and a dim sky is a black hole in the frame. */
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3b4a66, roughness: 0.28, metalness: 0.82, envMapIntensity: 3.2, emissive: new THREE.Color(0x1b4a6a), emissiveIntensity: 0 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x5a6a8c, roughness: 0.2, metalness: 0.9, envMapIntensity: 3.4 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, emissive: new THREE.Color(0x35e0ff), emissiveIntensity: 0, roughness: 0.3, metalness: 0.6 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  owned.push(steel, white, dark, amber, screen, spoil, hullMat, ribMat, seamMat, glowMat, beaconMat);

  // ── The waypoint: a column of light standing on a ring, with a slow
  // diamond turning at eye height. You can see it from the ramp. ──
  const beacon = new THREE.Group();
  group.add(beacon);
  // The column starts above head height and fades out as the crew closes on
  // it: a marker you can see from the ramp, and never one you stand inside.
  const column = mesh(beacon, new THREE.CylinderGeometry(0.5, 0.9, 24, 12, 1, true), beaconMat, 0, 14);
  column.castShadow = false;
  const ring = mesh(beacon, new THREE.RingGeometry(2.4, 3.1, seg), beaconMat, 0, 0.1);
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;
  const pip = mesh(beacon, new THREE.OctahedronGeometry(0.55), beaconMat, 0, 2.6);
  pip.castShadow = false;

  // ── The drill rig at the survey site: a tripod over a turning bit, a
  // spoil ring around the collar, a console with the log on it. ──
  const rig = new THREE.Group();
  rig.position.set(SURVEY_SITE.x, heightAt(SURVEY_SITE.x, SURVEY_SITE.y), SURVEY_SITE.y);
  group.add(rig);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = mesh(rig, new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), steel, Math.sin(a) * 0.95, 1.7, Math.cos(a) * 0.95);
    leg.rotation.z = -Math.sin(a) * 0.5;
    leg.rotation.x = Math.cos(a) * 0.5;
    mesh(rig, new THREE.CylinderGeometry(0.28, 0.24, 0.1, 10), steel, Math.sin(a) * 1.85, 0.05, Math.cos(a) * 1.85);
  }
  mesh(rig, new THREE.CylinderGeometry(0.34, 0.34, 0.3, 12), white, 0, 3.4);
  mesh(rig, new THREE.SphereGeometry(0.1, 8, 6), amber, 0, 3.66);
  /** The mast slides down its own length as the bit goes in. */
  const mast = new THREE.Group();
  rig.add(mast);
  mesh(mast, new THREE.CylinderGeometry(0.13, 0.13, 2.6, 10), steel, 0, 2.0);
  const bit = new THREE.Group();
  bit.position.y = 0.7;
  mast.add(bit);
  mesh(bit, new THREE.CylinderGeometry(0.16, 0.1, 0.6, 10), dark);
  for (let f = 0; f < 3; f++) {
    const flute = mesh(bit, new THREE.BoxGeometry(0.05, 0.62, 0.3), steel, 0, 0, 0);
    flute.rotation.y = f * Math.PI / 3;
  }
  const collar = mesh(rig, new THREE.TorusGeometry(0.8, 0.26, 8, seg), spoil, 0, 0.12);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 1, 0.5);
  collar.castShadow = false;
  const console3d = mesh(rig, new THREE.BoxGeometry(0.7, 0.9, 0.45), white, 1.9, 0.5, 0.6);
  console3d.rotation.y = -0.5;
  mesh(console3d, new THREE.PlaneGeometry(0.5, 0.3), screen, 0, 0.28, 0.23).rotation.x = -0.3;
  /** The core tray: sections fill in as the metres come up. */
  const cores: THREE.Mesh[] = [];
  mesh(rig, new THREE.BoxGeometry(1.5, 0.08, 0.36), dark, -1.9, 0.3, 0.3).rotation.y = 0.4;
  for (let i = 0; i < 5; i++) {
    const c = mesh(rig, new THREE.CylinderGeometry(0.07, 0.07, 0.26, 8), spoil, -1.9 + (i - 2) * 0.27 * Math.cos(0.4), 0.42, 0.3 - (i - 2) * 0.27 * Math.sin(0.4));
    c.rotation.set(Math.PI / 2, 0, 0);
    c.rotateZ(0.4);
    c.visible = false;
    cores.push(c);
  }
  /** The last section is the one that has metal in it. */
  const metalCore = new THREE.MeshStandardMaterial({ color: 0x2b3444, roughness: 0.2, metalness: 0.95 });
  owned.push(metalCore);

  // ── The craft: a long teardrop hull lying in the crater on its side,
  // three-quarters under the regolith, with a seam down its flank that
  // becomes a door. A mound of dust covers it until the crew sweeps it. ──
  const craft = new THREE.Group();
  const anomalyY = heightAt(ANOMALY_SITE.x, ANOMALY_SITE.y);
  craft.position.set(ANOMALY_SITE.x, anomalyY, ANOMALY_SITE.y);
  craft.rotation.y = 0.7;
  group.add(craft);
  const hull = mesh(craft, new THREE.SphereGeometry(4.6, seg, seg / 2), hullMat, 0, 0.6, 0);
  hull.scale.set(1, 0.52, 2.15);
  // A raised spine down the length of it and three ribs round the girth —
  // the only features on it, and each one hugging the hull it sits on.
  const spine = mesh(craft, new THREE.TorusGeometry(4.55, 0.16, 8, seg, Math.PI), ribMat, 0, 0.6, 0);
  spine.rotation.set(0, Math.PI / 2, 0);
  spine.scale.set(2.17, 0.53, 1);
  for (let i = -1; i <= 1; i++) {
    // The hull is an ellipsoid; a rib at z is its cross-section there.
    const k = Math.sqrt(1 - Math.pow(i * 3.1 / 9.89, 2));
    const rib = mesh(craft, new THREE.TorusGeometry(4.3, 0.1, 8, seg), ribMat, 0, 0.6, i * 3.1);
    rib.scale.set(4.6 * k / 4.3, 2.39 * k / 4.3, 1);
  }
  /** The seam, then the hatch that slides out of it. */
  const seam = mesh(craft, new THREE.BoxGeometry(0.14, 0.06, 5.4), seamMat, 3.35, 1.5, 0);
  seam.rotation.z = -0.35;
  const hatch = new THREE.Group();
  craft.add(hatch);
  const hatchPanel = mesh(hatch, new THREE.BoxGeometry(0.22, 2.0, 2.6), ribMat, 3.5, 1.35, 0);
  hatchPanel.rotation.z = -0.35;
  const doorGlow = mesh(hatch, new THREE.PlaneGeometry(2.1, 1.9), glowMat, 3.62, 1.35, 0);
  doorGlow.rotation.y = Math.PI / 2;
  doorGlow.castShadow = false;
  const craftLight = new THREE.PointLight(0x7fe9ff, 0, 26, 1.8);
  craftLight.position.set(4.4, 1.6, 0);
  craft.add(craftLight);
  /** The regolith over it: a low mound that sinks as the crew sweeps. */
  const moundGeom = new THREE.SphereGeometry(5.6, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2);
  {
    // Heap it, so it reads as regolith piled over something rather than a
    // grey dome sitting on the mare.
    const pos = moundGeom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
      const n = 1 + (fbm(x * 0.5 + 40, z * 0.5, 3, 811) - 0.5) * 0.5;
      pos.setXYZ(i, x * n, y * (0.85 + n * 0.2), z * n);
    }
    moundGeom.computeVertexNormals();
  }
  const mound = mesh(craft, moundGeom, spoil, 0, -0.4, 0);
  // Tall enough to bury the spine as well as the hull: until the crew sweeps
  // it, all there is to see is a heap of regolith that should not be there.
  mound.scale.set(1.04, 0.74, 2.0);
  mound.castShadow = false;

  // What the crew walks round: the rig, and three circles down the hull.
  const colliders: Collider[] = [{ x: rig.position.x, z: rig.position.z, r: 2.0 }];
  for (const [lz, r] of [[-6.4, 3.0], [0, 4.5], [6.4, 3.0]] as [number, number][]) {
    colliders.push({
      x: craft.position.x - Math.sin(craft.rotation.y) * lz,
      z: craft.position.z - Math.cos(craft.rotation.y) * lz,
      r,
    });
  }

  const saved = load();
  const telemetry: MissionTelemetry = {
    stage: saved.stage, objective: `obj.${saved.stage}`, distance: -1, bearing: 0, hasMarker: true,
    task: '', work: 0, atSite: false, depth: 0, banner: '', bannerHold: 0, rewards: saved.rewards, complete: saved.stage === 'done',
  };
  const marker = new THREE.Vector3();
  let work = 0;
  let awake = 0;
  let bitSpin = 0;
  let lastBite = 0;

  const handle: MissionHandle = {
    group, colliders, telemetry, marker, onEvent: null,
    update() { /* replaced below */ },
    advance() { /* replaced below */ },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
    },
  };

  /** Move on, keep it, and put the news on the glass. */
  const enter = (stage: MissionStage, reward?: string) => {
    telemetry.stage = stage;
    telemetry.objective = `obj.${stage}`;
    telemetry.banner = `banner.${stage}`;
    telemetry.bannerHold = 5.5;
    telemetry.complete = stage === 'done';
    work = 0;
    telemetry.work = 0;
    if (reward && !telemetry.rewards.includes(reward)) telemetry.rewards.push(reward);
    save({ stage, rewards: telemetry.rewards });
    handle.onEvent?.(reward ? 'reward' : 'step');
  };

  /** Where the crew is being sent, act by act. */
  const siteFor = (stage: MissionStage): THREE.Vector2 | null => {
    if (stage === 'survey' || stage === 'drill') return SURVEY_SITE;
    if (stage === 'trace' || stage === 'excavate' || stage === 'contact') return ANOMALY_SITE;
    return null;
  };

  handle.update = (dt, t, ctx) => {
    const stage = telemetry.stage;
    const site = siteFor(stage);
    const done = stage === 'done';
    // ── The marker: on the site while there is one, and on the hatch once
    // the hull is clear. ──
    if (site) {
      const onHatch = stage === 'contact';
      const mx = onHatch ? craft.position.x + Math.cos(craft.rotation.y) * 4.6 : site.x;
      const mz = onHatch ? craft.position.z - Math.sin(craft.rotation.y) * 4.6 : site.y;
      marker.set(mx, heightAt(mx, mz), mz);
      beacon.position.copy(marker);
      beacon.visible = true;
      telemetry.hasMarker = true;
      const dx = mx - ctx.crewX; const dz = mz - ctx.crewZ;
      telemetry.distance = Math.hypot(dx, dz);
      telemetry.bearing = Math.atan2(dx, dz);
    } else {
      beacon.visible = false;
      telemetry.hasMarker = false;
      telemetry.distance = -1;
    }

    const reach = stage === 'contact' ? HATCH_REACH : SITE_REACH;
    const near = telemetry.distance >= 0 && telemetry.distance < reach;
    telemetry.atSite = near && !ctx.driving;

    // ── The acts. ──
    if (stage === 'survey') {
      telemetry.task = '';
      if (near) enter('drill');
    } else if (stage === 'drill') {
      telemetry.task = 'drill';
      if (telemetry.atSite && ctx.working) {
        work = Math.min(1, work + dt / DRILL_SECONDS);
        bitSpin += dt * 9;
        // The bit walks down its mast, and throws cuttings out of the collar.
        if (t - lastBite > 0.35) {
          lastBite = t;
          handle.onEvent?.('bite');
          dust.burst({
            x: rig.position.x, y: rig.position.y + 0.15, z: rig.position.z,
            count: 4, speedMin: 0.5, speedMax: 1.6, cone: 1.1, size: 0.1,
          });
        }
      } else {
        work = Math.max(0, work - dt * 0.12);
      }
      telemetry.work = work;
      telemetry.depth = work * CORE_DEPTH;
      mast.position.y = -work * 1.1;
      bit.rotation.y = bitSpin;
      collar.scale.setScalar(1 + work * 0.5);
      collar.scale.z = 0.5;
      for (let i = 0; i < cores.length; i++) {
        const filled = work > (i + 0.85) / cores.length;
        cores[i].visible = filled;
        if (filled && i === cores.length - 1 && cores[i].material !== metalCore) cores[i].material = metalCore;
      }
      if (work >= 1) enter('trace', 'core');
    } else if (stage === 'trace') {
      telemetry.task = '';
      if (near) enter('excavate');
    } else if (stage === 'excavate') {
      telemetry.task = 'sweep';
      if (telemetry.atSite && ctx.working) {
        work = Math.min(1, work + dt / SWEEP_SECONDS);
        if (t - lastBite > 0.22) {
          lastBite = t;
          handle.onEvent?.('bite');
          const a = Math.random() * Math.PI * 2;
          dust.burst({
            x: craft.position.x + Math.cos(a) * 4, y: craft.position.y + 0.4, z: craft.position.z + Math.sin(a) * 4,
            count: 6, speedMin: 0.6, speedMax: 2.2, cone: 1.2, size: 0.13,
          });
        }
      } else {
        work = Math.max(0, work - dt * 0.08);
      }
      telemetry.work = work;
      if (work >= 1) enter('contact', 'hull');
    } else if (stage === 'contact') {
      telemetry.task = 'enter';
      // Not until the door has finished getting out of the way.
      if (telemetry.atSite && hatch.position.x < -1.2) enter('done', 'contact');
    } else {
      telemetry.task = '';
    }

    // ── How much of the hull is out of the ground, and how awake it is. ──
    const cleared = stage === 'excavate' ? work : (stage === 'contact' || done) ? 1 : 0;
    mound.position.y = -0.4 - cleared * 4.6;
    mound.visible = cleared < 0.99;
    const wantAwake = stage === 'contact' || done ? 1 : cleared * 0.35;
    awake += (wantAwake - awake) * (1 - Math.exp(-dt * 1.4));
    const pulse = 0.65 + 0.35 * Math.sin(t * 1.9);
    seamMat.emissiveIntensity = awake * 2.6 * pulse;
    // Awake, the hull itself carries a little of its own light, so the side
    // the sun is not on is a shape rather than a hole in the frame.
    hullMat.emissiveIntensity = awake * 0.5 * pulse;
    const open = done || stage === 'contact' ? 1 : 0;
    hatch.position.x += ((open ? -1.5 : 0) - hatch.position.x) * (1 - Math.exp(-dt * 1.6));
    hatch.position.y += ((open ? 0.2 : 0) - hatch.position.y) * (1 - Math.exp(-dt * 1.6));
    glowMat.opacity = awake * (open ? 0.85 : 0.1) * pulse;
    craftLight.intensity = awake * (open ? 9 : 1.5) * pulse;

    // The waypoint turns and breathes so it reads as a marker, not a mast,
    // and gets out of the way once the crew is standing on it.
    pip.rotation.y = t * 0.8;
    pip.position.y = 3.4 + Math.sin(t * 1.5) * 0.25;
    ring.rotation.z = t * 0.35;
    const fade = telemetry.distance < 0 ? 1 : THREE.MathUtils.clamp((telemetry.distance - 4) / 9, 0, 1);
    beaconMat.opacity = (0.32 + 0.2 * Math.sin(t * 2.4)) * fade;
    column.visible = fade > 0.02;
    pip.visible = fade > 0.02;

    telemetry.bannerHold = Math.max(0, telemetry.bannerHold - dt);
    if (telemetry.bannerHold <= 0) telemetry.banner = '';
  };

  handle.advance = () => {
    const order: MissionStage[] = STAGES;
    const next = order[Math.min(order.length - 1, order.indexOf(telemetry.stage) + 1)];
    enter(next, next === 'trace' ? 'core' : next === 'contact' ? 'hull' : next === 'done' ? 'contact' : undefined);
  };

  return handle;
}
