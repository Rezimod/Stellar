// World Mode: the surface scene for Mars, for Proxima b and for Earth, built
// from one profile. The descent is flown, then the crew is handed the ground: three
// camera positions, the suit, the world's own sky and weather, and what is
// there — on Mars the base and its readouts, on Proxima b the biosphere and
// the people who live in it; on Earth, Tbilisi (world-earth), with its own
// ground, sky and air, a short re-entry before the descent, and no helmet.
// The Moon's rig (camera, suit, dust, prints, lights, post, perf) is reused
// as it is; only gravity, gait and colour change.
//
// Movement is simulated at a fixed 120 Hz and drawn interpolated; the
// camera, the effects and the glass run once per drawn frame.

import * as THREE from 'three';
import { makeMoonPost } from '@/lib/solar-system/moon-post';
import { makeMoonDust } from '@/lib/solar-system/moon-fx';
import { makeCosmonaut, type WalkInput } from '@/lib/solar-system/moon-cosmonaut';
import { makePrints } from '@/lib/solar-system/moon-prints';
import { makeSuitAudio } from '@/lib/solar-system/moon-audio';
import { makeLander, type LanderTelemetry } from '@/lib/solar-system/moon-lander';
import { makeMoonPerf, type PerfSample } from '@/lib/solar-system/moon-perf';
import { makeLightPool } from '@/lib/solar-system/moon-lights';
import { makeKit } from '@/lib/solar-system/moon-kit';
import { makeCameraRig } from '@/lib/solar-system/moon-camera';
import { makeInteractions, type InteractionPrompt } from '@/lib/solar-system/moon-interactions';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { PointOfInterest } from '@/lib/solar-system/moon-base';
import { makeWorldTerrain } from '@/lib/solar-system/world-terrain';
import { makeWorldSky } from '@/lib/solar-system/world-sky';
import { makeMarsBase } from '@/lib/solar-system/world-mars-base';
import { makeFlora } from '@/lib/solar-system/world-flora';
import { makeAliens, type AlienTelemetry } from '@/lib/solar-system/world-aliens';
import { WORLDS, type WorldId, type WorldProfile } from '@/lib/solar-system/world-profiles';
import type { EarthData } from '@/lib/solar-system/world-earth-data';
import { EARTH_DESCENT, EARTH_WALK_RADIUS, makeEarthWorld, type EarthState } from '@/lib/solar-system/world-earth';
import { makeEarthEntry } from '@/lib/solar-system/world-earth-entry';
import { haze } from '@/lib/solar-system/world-earth-haze';
import { makeFlightAudio } from '@/lib/solar-system/flight-audio';

export type WorldView = 'chase' | 'helmet' | 'wide';
const VIEWS: WorldView[] = ['chase', 'helmet', 'wide'];

export interface WorldInput {
  moveX: number;
  moveY: number;
  jump: boolean;
  run: boolean;
  crouch: boolean;
  orbitDX: number;
  orbitDY: number;
  zoom: number;
  interact: boolean;
  use: boolean;
  viewToggle: boolean;
  throttle: number;
}

export interface WorldOptions {
  startOnSurface?: boolean;
  onContextLost?: () => void;
  /** Earth only: the baked Tbilisi data, loaded before the scene is built. */
  earth?: EarthData;
}

export interface WorldTelemetry {
  ready: boolean;
  phase: 'descent' | 'touchdown' | 'surface';
  landing: LanderTelemetry;
  grade: string;
  view: WorldView;
  poiId: string;
  altitude: number;
  speed: number;
  hint: 'walk' | 'jump' | '';
  o2: number;
  heartRate: number;
  suitTemp: number;
  outsideC: number;
  evaSeconds: number;
  distanceM: number;
  crouched: boolean;
  stumbling: boolean;
  sliding: boolean;
  heading: number;
  prompt: InteractionPrompt;
  readout: string;
  readoutHold: number;
  /** A line across the glass — a key under the world's `banner` — and how long it stays. */
  banner: string;
  bannerHold: number;
  /** Proxima b only. */
  aliens: AlienTelemetry | null;
  /** Earth only. */
  earth: EarthState | null;
  /** Coming in hot, before the powered descent (Earth). */
  entry: boolean;
}

export interface WorldSurfaceHandle {
  input: WorldInput;
  telemetry: WorldTelemetry;
  profile: WorldProfile;
  startAudio: () => void;
  teleport: (x: number, z: number) => void;
  where: () => { x: number; z: number; y: number };
  skipDescent: () => void;
  perf: () => PerfSample;
  /** Earth: move the clock (any ISO date), finish an expedition act, point the camera (degrees from north, pitch rad). */
  setTime: (iso: string) => void;
  advance: () => void;
  look: (heading: number, pitch?: number) => void;
  /** Show or hide a named part of the scene (profiling). */
  layer: (name: string, on: boolean) => void;
  /** Earth: the sky's working numbers, for checking the light. */
  sky: () => Record<string, number | number[]> | null;
  dispose: () => void;
}

declare global {
  interface Window {
    __stellarWorld?: WorldSurfaceHandle;
  }
}

const EGRESS_HOLD = 4.2;
const STEP = 1 / 120;
const MAX_STEPS = 12;
/** The first-contact record, kept on the device. */
export const CONTACT_KEY = 'stellar_proxima_contact';

export function makeWorldSurface(mount: HTMLElement, world: WorldId, opts: WorldOptions = {}): WorldSurfaceHandle {
  const profile = WORLDS[world];
  const buildStart = performance.now();
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const lite = isMobile;
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  const maxRatio = Math.min(window.devicePixelRatio, lite ? 1.5 : 2);
  renderer.setPixelRatio(maxRatio);
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(profile.sky.fog, 1);
  const earth = world === 'earth' && opts.earth ? makeEarthWorld(renderer, opts.earth, lite) : null;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene();
  // Earth's air is in its own materials (world-earth-haze), out to the Caucasus.
  if (!earth) scene.fog = new THREE.Fog(profile.sky.fog, profile.sky.fogNear, profile.sky.fogFar);
  const baseFov = isMobile ? 62 : 52;
  const camera = new THREE.PerspectiveCamera(baseFov, mount.clientWidth / mount.clientHeight, earth ? 0.1 : 0.05, earth ? 30000 : 4000);
  const SUN_DIR = earth ? earth.sky.state.keyDir.clone() : profile.sunDir;

  // ── Light: the star, the sky's fill, and the pool for whatever glows. ──
  const sun = new THREE.DirectionalLight(profile.sun.color, profile.sun.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  const sr = lite ? 42 : 60;
  sun.shadow.camera.left = -sr; sun.shadow.camera.right = sr; sun.shadow.camera.top = sr; sun.shadow.camera.bottom = -sr;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.22;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(profile.sky.fillSky, profile.sky.fillGround, profile.sky.fill);
  scene.add(hemi);
  const lightPool = makeLightPool(2);
  for (const l of lightPool.lights) scene.add(l);
  const shadowU = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize();
  const shadowV = new THREE.Vector3().crossVectors(SUN_DIR, shadowU);
  const shadowTexel = (sr * 2) / sun.shadow.mapSize.x;

  const sky = earth ? null : makeWorldSky(renderer, profile, lite);
  if (sky) {
    scene.add(sky.group);
    scene.environment = sky.environment;
  }
  scene.environmentIntensity = 0.5;

  const terrain = earth ? null : makeWorldTerrain(profile, lite);
  if (terrain) scene.add(terrain.mesh, terrain.rocks, terrain.horizon);
  if (earth) scene.add(earth.group, earth.sky.group);
  const heightAt = earth ? earth.heightAt : terrain!.heightAt;
  const floorAt = earth ? earth.floorAt : terrain!.floorAt;
  const dust = makeMoonDust(lite ? 700 : 1300, profile.gravity, profile.ground.dust);
  scene.add(dust.points);
  const prints = makePrints(lite ? 400 : 900);
  scene.add(prints.mesh);
  const kit = makeKit(lite);

  const colliders: Collider[] = [];
  const pois: PointOfInterest[] = [];
  const interactions = makeInteractions();
  const audio = makeSuitAudio(!!profile.breathable);
  const telemetryReadout = (key: string) => { telemetry.readout = key; telemetry.readoutHold = 7; audio.bleep(); };

  const base = world === 'mars' ? makeMarsBase(kit, heightAt, lite, telemetryReadout) : null;
  if (base) {
    scene.add(base.group);
    colliders.push(...base.colliders);
    pois.push(...base.pois);
    for (const i of base.interactables) interactions.add(i);
  }
  const flora = world === 'proximaB' && terrain ? makeFlora(profile, terrain, lite) : null;
  const aliens = flora ? makeAliens({
    heightAt, colliders: flora.colliders, village: flora.village, lite,
    onEvent: (kind) => {
      if (kind === 'notice') { banner('noticed'); audio.bleep(); }
      else if (kind === 'greet') { audio.bleep(); }
      else if (kind === 'stone') {
        banner('firstContact');
        audio.thump(30);
        try { localStorage.setItem(CONTACT_KEY, new Date().toISOString()); } catch { /* private mode */ }
      }
    },
  }) : null;
  if (flora && aliens) {
    scene.add(flora.group, aliens.group);
    colliders.push(...flora.colliders);
    pois.push(...flora.pois);
    for (const i of aliens.interactables) interactions.add(i);
  }

  if (earth) {
    colliders.push(...earth.colliders);
    pois.push(...earth.pois);
    for (const i of earth.interactables) interactions.add(i);
  }

  // Earth's air: no pressure suit, so an ordinary gait, and no helmet.
  const cosmonaut = makeCosmonaut(dust, lite, profile.gravity, !profile.breathable, !!profile.breathable);
  cosmonaut.onStep = (e) => { prints.stamp(e.x, e.y, e.z, e.yaw, e.side); audio.step(e.hard); cam.footfall(e.hard); };
  scene.add(cosmonaut.group);
  const padX = profile.pad.x; const padZ = profile.pad.z + 26;
  const lander = makeLander(padX, padZ, heightAt, dust, lite, lightPool, profile.gravity, earth ? EARTH_DESCENT : undefined);
  scene.add(lander.group);
  // Earth first comes in hot: the entry flies the vehicle down to where the powered descent starts.
  const entry = earth ? makeEarthEntry(lander.group, lander.position.clone(), new THREE.Vector3(-EARTH_DESCENT.offsetX, 0, -EARTH_DESCENT.offsetZ).normalize()) : null;
  if (entry) scene.add(entry.group);
  const flightAudio = entry ? makeFlightAudio() : null;
  const walkRadius = earth ? EARTH_WALK_RADIUS : profile.walkRadius;

  const post = makeMoonPost(renderer, scene, camera, lite);
  const pinned = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('fixedpx');
  const perf = makeMoonPerf(renderer, mount, {
    minRatio: pinned ? maxRatio : Math.min(1, maxRatio),
    maxRatio,
    onPixelRatio: (r) => { renderer.setPixelRatio(r); post.setSize(mount.clientWidth, mount.clientHeight); },
  });
  const cameraColliders = () => (aliens ? colliders.concat(aliens.colliders)
    : earth ? colliders.concat(earth.cameraColliders(cosmonaut.position.x, cosmonaut.position.z)) : colliders);
  const cam = makeCameraRig(camera, floorAt, cameraColliders, baseFov);
  cam.distance = isMobile ? 5.6 : 5.2;

  const input: WorldInput = {
    moveX: 0, moveY: 0, jump: false, run: false, crouch: false, orbitDX: 0, orbitDY: 0, zoom: 0,
    interact: false, use: false, viewToggle: false, throttle: 0,
  };
  const telemetry: WorldTelemetry = {
    ready: false, phase: 'descent', landing: lander.telemetry, grade: '', view: 'chase', poiId: '',
    altitude: 0, speed: 0, hint: 'walk', o2: 97.4, heartRate: 64, suitTemp: 21.5, outsideC: profile.ambientC,
    evaSeconds: 0, distanceM: 0, crouched: false, stumbling: false, sliding: false, heading: 0,
    prompt: interactions.prompt, readout: '', readoutHold: 0, banner: '', bannerHold: 0,
    aliens: aliens ? aliens.telemetry : null,
    earth: earth ? earth.state : null,
    entry: !!entry,
  };
  function banner(key: string) { telemetry.banner = key; telemetry.bannerHold = 5; }

  let view: WorldView = 'chase';
  const setView = (next: WorldView) => {
    view = next;
    telemetry.view = next;
    cosmonaut.setHelmetView(next === 'helmet');
    cosmonaut.group.visible = true;
    post.setHelmet(next === 'helmet' ? 1 : 0);
    if (next === 'helmet') { cam.yaw = cosmonaut.yaw + Math.PI; cam.lookPitch = 0; }
    if (next === 'chase') cam.pitch = 0.3;
    if (next === 'wide') cam.pitch = 0.5;
    cam.snap();
  };

  let t = 0;
  let acc = 0;
  let jumped = false;
  let walked = false;
  let lastPoi = '';
  let exertion = 0;
  let egressHold = 0;
  let entryHandoff = !!entry;
  let jumpLatch = false;
  let jumpEdge = false;
  const walk: WalkInput = { moveX: 0, moveZ: 0, jump: false, run: false, crouch: false, work: false };
  const tmp = new THREE.Vector3();
  const descentFocus = new THREE.Vector3();
  const descentPos = new THREE.Vector3();
  const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const walkColliders = () => (earth ? colliders : cameraColliders());
  const stepFrom = new THREE.Vector3();
  const place = (x: number, y: number, z: number) => {
    cosmonaut.position.set(x, y, z);
    cosmonaut.velocity.set(0, 0, 0);
    cosmonaut.settle();
  };

  const simStep = (h: number, firstStep: boolean) => {
    if (earth?.carried()) return;
    const fx = -Math.sin(cam.yaw); const fz = -Math.cos(cam.yaw);
    const rx = -fz; const rz = fx;
    walk.moveX = fx * input.moveY + rx * input.moveX;
    walk.moveZ = fz * input.moveY + rz * input.moveX;
    walk.run = input.run && !input.crouch;
    walk.crouch = input.crouch;
    walk.jump = firstStep && jumpEdge;
    walk.work = interactions.prompt.holding;
    stepFrom.copy(cosmonaut.position);
    cosmonaut.update(h, walk, floorAt, walkColliders(), walkRadius);
    earth?.confine(cosmonaut.position, stepFrom);
  };

  let raf = 0;
  let last = performance.now();
  let docVisible = !document.hidden;
  let contextLost = false;
  const onVis = () => {
    docVisible = !document.hidden;
    last = performance.now();
    if (docVisible && !raf && telemetry.ready && !contextLost) raf = requestAnimationFrame(loop);
  };
  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    opts.onContextLost?.();
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const loop = () => {
    raf = 0;
    if (!docVisible) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    perf.begin(now);
    t += dt;
    cam.update(dt);
    cam.orbit(input.orbitDX, input.orbitDY, view === 'helmet');
    input.orbitDX = input.orbitDY = 0;
    cam.zoom(input.zoom);
    input.zoom = 0;
    const crew = cosmonaut.position;

    if (entry && !entry.done) {
      entry.update(dt);
      telemetry.entry = !entry.done;
      const lt = lander.telemetry;
      const ground = heightAt(lander.position.x, lander.position.z);
      lt.altitude = Math.max(0, lander.position.y - ground);
      lt.offset = Math.hypot(lander.position.x - padX, lander.position.z - padZ);
      flightAudio?.reentry(entry.done ? 0 : entry.heat);
      if (t < dt * 2) camera.position.copy(entry.cameraFrom);
      else camera.position.lerp(entry.cameraFrom, 1 - Math.exp(-dt * 6));
      camera.position.x += Math.sin(t * 43) * entry.heat * 0.6;
      camera.position.y += Math.sin(t * 37 + 1) * entry.heat * 0.4;
      camera.lookAt(entry.cameraAt);
      input.interact = false;
      cosmonaut.group.visible = false;
    } else if (telemetry.phase !== 'surface') {
      const lt = lander.telemetry;
      if (!lt.landed) {
        lander.update(dt, { throttle: input.throttle, moveX: input.moveX, moveY: input.moveY }, heightAt);
        if (lt.landed) {
          telemetry.phase = 'touchdown';
          telemetry.grade = lt.touchdown < 0.9 ? 'feather' : lt.touchdown < 1.9 ? 'good' : lt.touchdown < 3.2 ? 'firm' : 'hard';
          egressHold = EGRESS_HOLD;
          audio.thump(lt.touchdown < 1.5 ? 40 : 6);
          cam.shake(Math.min(1, 0.25 + lt.touchdown * 0.2));
          pois.push({ id: 'ourLander', x: lander.position.x, z: lander.position.z, r: 8 });
          colliders.push({ x: lander.position.x, z: lander.position.z, r: 3.4 });
        }
      } else {
        lander.update(dt, { throttle: 0, moveX: 0, moveY: 0 }, heightAt);
      }
      input.interact = false;
      const snapCam = t < dt * 2 || entryHandoff;
      entryHandoff = false;
      const close = THREE.MathUtils.clamp(1 - lt.altitude / 80, 0, 1);
      tmp.copy(lander.position).y += 3.0;
      descentFocus.lerp(tmp, snapCam ? 1 : 1 - Math.exp(-dt * 3.5));
      const dist = 17 + close * 4;
      const pitch = cam.pitch - 0.26 + close * 0.34;
      const sway = lt.throttle * 0.18;
      descentPos.set(
        descentFocus.x + Math.sin(cam.yaw) * dist * Math.cos(pitch) + Math.sin(t * 0.9) * sway,
        descentFocus.y + Math.sin(pitch) * dist + Math.sin(t * 1.3) * sway * 0.5,
        descentFocus.z + Math.cos(cam.yaw) * dist * Math.cos(pitch),
      );
      const floor = heightAt(descentPos.x, descentPos.z) + 2.2;
      if (descentPos.y < floor) descentPos.y = floor;
      if (snapCam) camera.position.copy(descentPos);
      else camera.position.lerp(descentPos, 1 - Math.exp(-dt * 4.5));
      if (lt.throttle > 0.05 && lt.altitude < 40) camera.position.y += Math.sin(t * 37) * 0.02 * lt.throttle;
      camera.lookAt(descentFocus);
      const wantFov = baseFov + 6;
      if (Math.abs(camera.fov - wantFov) > 0.01) { camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix(); }
      crew.set(lt.egressX, heightAt(lt.egressX, lt.egressZ), lt.egressZ);
      cosmonaut.settle();
      cosmonaut.group.visible = false;
      if (telemetry.phase === 'touchdown') {
        egressHold -= dt;
        if (egressHold <= 0) {
          telemetry.phase = 'surface';
          cosmonaut.position.set(lt.egressX, heightAt(lt.egressX, lt.egressZ), lt.egressZ);
          cosmonaut.yaw = Math.PI;
          cosmonaut.settle();
          cam.yaw = 0;
          setView('chase');
          banner('arrived');
          audio.bleep();
        }
      }
    } else {
      const press = input.interact;
      input.interact = false;
      jumpEdge = input.jump && !jumpLatch;
      jumpLatch = input.jump;
      if (input.viewToggle) {
        input.viewToggle = false;
        setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);
      }
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS) {
        simStep(STEP, steps === 0);
        acc -= STEP;
        steps += 1;
      }
      if (steps === MAX_STEPS) acc = 0;
      cosmonaut.present(acc / STEP);

      interactions.update(dt, { x: crew.x, z: crew.z, yaw: cosmonaut.yaw, driving: false, press, held: input.use || press });

      if (view === 'helmet') {
        const rel = wrap(cam.yaw + Math.PI - cosmonaut.yaw);
        if (cosmonaut.state.speed < 0.3 && Math.abs(rel) > 0.9) cosmonaut.yaw += rel * (1 - Math.exp(-dt * 4));
        cosmonaut.look(wrap(cam.yaw + Math.PI - cosmonaut.yaw), cam.lookPitch);
        cosmonaut.eye(tmp);
        cam.firstPerson(dt, tmp, 0);
      } else {
        const wide = view === 'wide';
        cam.chase(dt, {
          position: cosmonaut.group.position, velocity: cosmonaut.velocity, yaw: cosmonaut.yaw,
          height: wide ? 2.2 : 1.35,
          distance: wide ? cam.distance * 4.2 + 14 : cam.distance,
          speedFrac: Math.min(1, cosmonaut.state.speed / cosmonaut.profile.run),
        }, wide
          ? { follow: 1, lead: 0, leadMax: 0, fovKick: 0, horizontal: 4, vertical: 3 }
          : { follow: 2.6, lead: 0.16, leadMax: 0.8, fovKick: 4, horizontal: 14, vertical: 6.5 });
      }
      if (!walked && cosmonaut.state.speed > 0.5) walked = true;
      if (!jumped && cosmonaut.state.airborne && cosmonaut.state.altitude > 0.3) jumped = true;
      telemetry.hint = !walked ? 'walk' : !jumped ? 'jump' : '';
    }

    // ── The glass. ──
    telemetry.altitude = cosmonaut.state.altitude;
    telemetry.speed = cosmonaut.state.speed;
    telemetry.crouched = cosmonaut.state.crouched;
    telemetry.stumbling = cosmonaut.state.stumble > 0;
    telemetry.sliding = cosmonaut.state.sliding;
    telemetry.heading = earth ? earth.heading(cam.yaw) : (THREE.MathUtils.radToDeg(Math.atan2(-Math.sin(cam.yaw), -Math.cos(cam.yaw))) + 360) % 360;
    const work = Math.min(1, cosmonaut.state.effort + (interactions.prompt.holding ? 0.35 : 0));
    exertion += (work - exertion) * (1 - Math.exp(-dt * 0.35));
    if (telemetry.phase === 'surface') {
      telemetry.evaSeconds += dt;
      if (!earth?.carried()) telemetry.distanceM += telemetry.speed * dt;
      // Heavier ground costs more air.
      telemetry.o2 = Math.max(0, telemetry.o2 - dt * 0.0011 * (1 + exertion * 2.2) * (0.6 + profile.gravity / 5));
      telemetry.heartRate += ((64 + exertion * 68 + (cosmonaut.state.landed ? 6 : 0)) - telemetry.heartRate) * (1 - Math.exp(-dt * 0.6));
      telemetry.suitTemp += ((21.5 + exertion * 1.8) - telemetry.suitTemp) * (1 - Math.exp(-dt * 0.2));
    }
    audio.update(dt, exertion, view === 'helmet');

    let best = ''; let bestD = 1e9;
    for (const poi of pois) {
      const d = Math.hypot(poi.x - crew.x, poi.z - crew.z);
      if (d < poi.r && d < bestD) { bestD = d; best = poi.id; }
    }
    if (best && best !== lastPoi && telemetry.phase === 'surface') audio.bleep();
    lastPoi = best;
    telemetry.poiId = best;
    telemetry.readoutHold = Math.max(0, telemetry.readoutHold - dt);
    if (telemetry.readoutHold <= 0) telemetry.readout = '';
    telemetry.bannerHold = Math.max(0, telemetry.bannerHold - dt);
    if (telemetry.bannerHold <= 0) telemetry.banner = '';

    dust.update(dt, heightAt);
    sky?.update(dt, camera.position);
    if (earth) {
      earth.update(dt, crew, telemetry.heading, input.use && telemetry.phase === 'surface', camera.position, place);
      const st = earth.sky.state;
      SUN_DIR.copy(st.keyDir);
      if (SUN_DIR.y < 0.02) SUN_DIR.y = 0.02;
      SUN_DIR.normalize();
      shadowU.crossVectors(THREE.Object3D.DEFAULT_UP, SUN_DIR).normalize();
      shadowV.crossVectors(SUN_DIR, shadowU);
      sun.color.copy(st.keyColor);
      sun.intensity = st.keyIntensity;
      hemi.color.copy(st.hemiSky);
      hemi.groundColor.copy(st.hemiGround);
      hemi.intensity = st.hemiIntensity;
      if (scene.environment !== earth.sky.environment) scene.environment = earth.sky.environment;
      if (earth.state.outsideC !== null) telemetry.outsideC = earth.state.outsideC;
    }
    base?.update(dt, t, crew.x, crew.z, lightPool);
    flora?.update(dt, t);
    if (aliens && telemetry.phase === 'surface') aliens.update(dt, t, crew.x, crew.z, lightPool);
    const su = Math.round(crew.dot(shadowU) / shadowTexel) * shadowTexel;
    const sv = Math.round(crew.dot(shadowV) / shadowTexel) * shadowTexel;
    sun.target.position.copy(shadowU).multiplyScalar(su).addScaledVector(shadowV, sv).addScaledVector(SUN_DIR, crew.dot(SUN_DIR));
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 220);
    lightPool.flush(crew.x, crew.y, crew.z);
    perf.mark();
    post.render(dt);
    perf.end();
  };

  const onResize = () => {
    const w = mount.clientWidth; const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  perf.setBuildMs(performance.now() - buildStart);
  let disposed = false;
  const hiddenForCompile: THREE.Object3D[] = [];
  scene.traverse((o) => { if (!o.visible) { hiddenForCompile.push(o); o.visible = true; } });
  const begin = () => {
    for (const o of hiddenForCompile) o.visible = false;
    if (disposed || raf || contextLost) return;
    telemetry.ready = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const compiling = renderer.compileAsync(scene, camera);
  compiling.then(begin, begin);

  const release = () => {
    lander.dispose();
    entry?.dispose();
    flightAudio?.dispose();
    earth?.dispose();
    cosmonaut.dispose();
    base?.dispose();
    flora?.dispose();
    aliens?.dispose();
    kit.dispose();
    prints.dispose();
    dust.dispose();
    terrain?.dispose();
    sky?.dispose();
    post.dispose();
    renderer.dispose();
  };

  const handle: WorldSurfaceHandle = {
    input, telemetry, profile,
    startAudio: () => { audio.start(); earth?.startAudio(); },
    teleport(x, z) {
      cosmonaut.position.set(x, floorAt(x, z), z);
      cosmonaut.velocity.set(0, 0, 0);
      cosmonaut.settle();
      cam.snap();
    },
    where: () => ({ x: cosmonaut.position.x, y: cosmonaut.position.y, z: cosmonaut.position.z }),
    skipDescent() {
      if (telemetry.phase === 'surface') return;
      entry?.skip();
      telemetry.entry = false;
      flightAudio?.reentry(0);
      lander.position.set(padX, heightAt(padX, padZ) + 0.35, padZ);
      lander.telemetry.landed = true;
      lander.telemetry.touchdown = 0.6;
      lander.telemetry.egressX = padX;
      lander.telemetry.egressZ = padZ + 4.2;
      telemetry.phase = 'touchdown';
      telemetry.grade = 'feather';
      egressHold = 0.2;
    },
    perf: perf.sample,
    setTime: (iso) => earth?.setTime(iso),
    advance: () => earth?.advance(),
    layer(name, on) {
      const o = scene.getObjectByName(name);
      if (o) o.visible = on;
    },
    sky: () => {
      if (!earth) return null;
      const st = earth.sky.state;
      return {
        sunAlt: st.sunAlt, adapt: st.adapt, key: st.keyIntensity, hemi: st.hemiIntensity, cloud: st.cloud, visibility: st.visibility,
        night: st.night, limitMag: st.limitMag, hazeBeta: haze.uHazeBeta.value, haze: haze.uHazeColor.value.toArray(), hazeSun: haze.uHazeSunColor.value.toArray(),
        hemiSky: st.hemiSky.toArray(), keyColor: st.keyColor.toArray(), exposure: renderer.toneMappingExposure,
      };
    },
    look(heading, pitch) {
      // Heading is clockwise from north (−z); the camera looks along (−sin yaw, −cos yaw).
      cam.yaw = Math.atan2(-Math.sin((heading * Math.PI) / 180), Math.cos((heading * Math.PI) / 180));
      if (pitch !== undefined) { cam.pitch = pitch; cam.lookPitch = pitch; }
      cam.snap();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      perf.dispose();
      if (window.__stellarWorld === handle) delete window.__stellarWorld;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      audio.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      compiling.then(release, release);
    },
  };
  if (opts.startOnSurface) handle.skipDescent();
  if (process.env.NODE_ENV !== 'production') window.__stellarWorld = handle;
  return handle;
}
