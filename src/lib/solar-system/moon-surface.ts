// Moon Mode: the surface scene that takes over when the ship lands. One
// renderer, one hard sun with a shadow map that follows the crew, earthshine,
// Earth with its clouds over the base, the Milky Way, the terrain, the
// outpost, the dust, the prints, the meteors, the rover — and the camera rig.
// The React overlay owns the DOM and feeds `input`; this file owns the frame.
//
// It opens with the landing, which is flown rather than watched, and then
// hands the crew the surface: six camera positions, a rover with four gears,
// three habitats behind airlocks, an outpost with work to do, and an
// expedition that runs from the mission computer out to a crater nobody has
// opened.
//
// Movement is simulated at a fixed 120 Hz and drawn interpolated, so it feels
// the same at 30 frames a second as at 144; the camera, the effects and the
// glass run once per drawn frame.

import * as THREE from 'three';
import { makeMoonPost } from '@/lib/solar-system/moon-post';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import { makeMoonTerrain, makeMoonHorizon, TERRAIN_WALK_RADIUS, PAD_CENTER } from '@/lib/solar-system/moon-terrain';
import { makeMoonDust } from '@/lib/solar-system/moon-fx';
import { makeCosmonaut, RUN, type SuitAnim, type WalkInput } from '@/lib/solar-system/moon-cosmonaut';
import { makeMoonBase, type Airlock } from '@/lib/solar-system/moon-base';
import { makeMeteors } from '@/lib/solar-system/moon-meteors';
import { makePrints } from '@/lib/solar-system/moon-prints';
import { makeSuitAudio } from '@/lib/solar-system/moon-audio';
import { makeRover, type RoverGear } from '@/lib/solar-system/moon-rover';
import { makeLander, type LanderTelemetry } from '@/lib/solar-system/moon-lander';
import { makeMission, missionComplete, type MissionTelemetry } from '@/lib/solar-system/moon-mission';
import { makeJobs, type JobId, type JobsTelemetry } from '@/lib/solar-system/moon-jobs';
import { makeMoonPerf, type PerfSample } from '@/lib/solar-system/moon-perf';
import { makeLightPool } from '@/lib/solar-system/moon-lights';
import { makeKit } from '@/lib/solar-system/moon-kit';
import { makeCameraRig } from '@/lib/solar-system/moon-camera';
import { makeInteractions, type InteractionPrompt } from '@/lib/solar-system/moon-interactions';

/** Three ways to watch the crew, three to ride the rover. */
export type SurfaceView = 'chase' | 'helmet' | 'wide' | 'rover' | 'cockpit' | 'mast';
const FOOT_VIEWS: SurfaceView[] = ['chase', 'helmet', 'wide'];
const ROVER_VIEWS: SurfaceView[] = ['rover', 'cockpit', 'mast'];

export interface SurfaceInput {
  /** Stick, camera frame: x right, y forward, each in [-1, 1]. */
  moveX: number;
  moveY: number;
  jump: boolean;
  run: boolean;
  crouch: boolean;
  /** Pointer drag since last frame, CSS px; consumed by the camera. */
  orbitDX: number;
  orbitDY: number;
  /** Wheel / pinch steps since last frame; consumed. */
  zoom: number;
  /** Edge-triggered: the action key went down. Consumed. */
  interact: boolean;
  /** The action key (or the tool key) is held. */
  use: boolean;
  /** Edge-triggered: walk the camera round. Consumed. */
  viewToggle: boolean;
  /** Held: the descent engine, 0…1, while there is still a vehicle to fly. */
  throttle: number;
  /** Edge-triggered: the gear to put the rover in, by its place in `telemetry.gears`. Consumed. */
  gearRequest: number | null;
}

export interface AirlockTelemetry {
  near: boolean;
  state: Airlock['state'];
  cycle: number;
}

export interface SurfaceOptions {
  /** Open on the surface beside the vehicle rather than on the way down. */
  startOnSurface?: boolean;
  /** The GPU took the context away; the owner should rebuild the scene. */
  onContextLost?: () => void;
}

export interface SurfaceTelemetry {
  /** Programs are compiled and frames are being drawn. */
  ready: boolean;
  phase: 'descent' | 'touchdown' | 'surface';
  touchdownIn: number;
  landing: LanderTelemetry;
  grade: string;
  view: SurfaceView;
  driving: boolean;
  poiId: string;
  poiDist: number;
  impactDist: number;
  impactHold: number;
  airborne: boolean;
  altitude: number;
  speed: number;
  hint: 'walk' | 'jump' | '';
  craters: number;
  o2: number;
  heartRate: number;
  suitTemp: number;
  evaSeconds: number;
  distanceM: number;
  roverSpeed: number;
  gear: RoverGear;
  gears: RoverGear[];
  roverTop: number;
  battery: number;
  charging: boolean;
  roverFault: boolean;
  crouched: boolean;
  stumbling: boolean;
  sliding: boolean;
  anim: SuitAnim;
  /** Where the crew is looking, degrees clockwise from north. */
  heading: number;
  mission: MissionTelemetry;
  jobs: JobsTelemetry;
  /** The one thing the action key will do right now. */
  prompt: InteractionPrompt;
  airlock: AirlockTelemetry;
  /** A status panel somebody is reading: a key under `moon.readout`, and how long it stays up. */
  readout: string;
  readoutHold: number;
  inside: string;
}

export interface MoonSurfaceHandle {
  input: SurfaceInput;
  telemetry: SurfaceTelemetry;
  startAudio: () => void;
  /** Development hooks. */
  nudgeMeteor: () => void;
  teleport: (x: number, z: number) => void;
  where: () => { x: number; z: number; y: number };
  advanceMission: () => void;
  startJob: (id?: JobId) => void;
  skipDescent: () => void;
  perf: () => PerfSample;
  roverAt: () => { x: number; z: number };
  dispose: () => void;
}

declare global {
  interface Window {
    __stellarMoon?: MoonSurfaceHandle;
  }
}

/** How long the touchdown plaque stays up before the crew steps out. */
const EGRESS_HOLD = 4.2;
const STEP = 1 / 120;
const MAX_STEPS = 12;
const SUN_DIR = new THREE.Vector3(-0.62, 0.46, 0.64).normalize();
const EARTH_DIR = new THREE.Vector3(0.28, 0.6, -0.75).normalize();

export function starfield(count: number, band: number): THREE.Points {
  const total = count + band;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0.4, 0.3));
  const v = new THREE.Vector3();
  for (let i = 0; i < total; i++) {
    const inBand = i >= count;
    if (inBand) {
      const a = Math.random() * Math.PI * 2;
      const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.22;
      v.set(Math.cos(a), g, Math.sin(a)).normalize().applyQuaternion(tilt);
    } else {
      const u = Math.random() * 2 - 1; const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      v.set(r * Math.cos(a), u, r * Math.sin(a));
    }
    pos[i * 3] = v.x * 1800; pos[i * 3 + 1] = v.y * 1800; pos[i * 3 + 2] = v.z * 1800;
    const b = inBand ? 0.04 + Math.pow(Math.random(), 2) * 0.16 : 0.35 + Math.pow(Math.random(), 3) * 0.9;
    const warm = Math.random();
    col[i * 3] = b * (0.85 + warm * 0.15);
    col[i * 3 + 1] = b * 0.9;
    col[i * 3 + 2] = b * (1.05 - warm * 0.2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/** A tiny environment for the visor and the metal: black sky, bright regolith below, one sun. */
function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  scene.add(sky);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0x8a8884 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  scene.add(ground);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 28, 24) }));
  sun.position.copy(SUN_DIR).multiplyScalar(40);
  scene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  sky.geometry.dispose(); (sky.material as THREE.Material).dispose();
  ground.geometry.dispose(); (ground.material as THREE.Material).dispose();
  sun.geometry.dispose(); (sun.material as THREE.Material).dispose();
  return tex;
}

const AtmosphereShader = {
  uniforms: { uSun: { value: new THREE.Vector3() } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vV;
    void main() { float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.2); float lit = clamp(dot(vN, uSun) * 1.4 + 0.35, 0.0, 1.0);
      gl_FragColor = vec4(vec3(0.42, 0.66, 1.0) * rim * lit * 1.6, rim * lit); }`,
};

export function makeMoonSurface(mount: HTMLElement, opts: SurfaceOptions = {}): MoonSurfaceHandle {
  const buildStart = performance.now();
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const lite = isMobile;
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  const maxRatio = Math.min(window.devicePixelRatio, lite ? 1.5 : 2);
  renderer.setPixelRatio(maxRatio);
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 1);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.45;
  const baseFov = isMobile ? 62 : 52;
  const camera = new THREE.PerspectiveCamera(baseFov, mount.clientWidth / mount.clientHeight, 0.05, 4000);

  // ── Light: one hard sun; a faint bounce off the regolith from below; earthshine. ──
  const sun = new THREE.DirectionalLight(0xfff8ee, 3.6);
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
  // No sky to scatter light, but the sunlit ground bounces a warm grey up
  // into every shadow: that is what keeps a shaded suit readable.
  scene.add(new THREE.HemisphereLight(0x11141b, 0x6f6b65, 0.55));
  const earthFill = new THREE.DirectionalLight(0xa9bde0, 0.16);
  earthFill.position.copy(EARTH_DIR);
  scene.add(earthFill);
  const lightPool = makeLightPool(2);
  for (const l of lightPool.lights) scene.add(l);
  const shadowU = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize();
  const shadowV = new THREE.Vector3().crossVectors(SUN_DIR, shadowU);
  const shadowTexel = (sr * 2) / sun.shadow.mapSize.x;

  const stars = starfield(lite ? 2200 : 4200, lite ? 4000 : 9000);
  scene.add(stars);
  const glowTex = softSpriteTexture();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(6, 5.7, 5.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunSprite.position.copy(SUN_DIR).multiplyScalar(1700);
  sunSprite.scale.setScalar(90);
  scene.add(sunSprite);
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d6, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunHalo.position.copy(sunSprite.position);
  sunHalo.scale.setScalar(420);
  scene.add(sunHalo);

  const earthGeom = new THREE.SphereGeometry(52, 64, 40);
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x8fb7ff, roughness: 0.9, metalness: 0 });
  const earth = new THREE.Mesh(earthGeom, earthMat);
  earth.position.copy(EARTH_DIR).multiplyScalar(1250);
  earth.rotation.z = 0.41;
  scene.add(earth);
  const cloudGeom = new THREE.SphereGeometry(52.7, 64, 40);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const clouds = new THREE.Mesh(cloudGeom, cloudMat);
  earth.add(clouds);
  const atmoGeom = new THREE.SphereGeometry(54.5, 64, 40);
  const atmoMat = new THREE.ShaderMaterial({ ...AtmosphereShader, uniforms: { uSun: { value: new THREE.Vector3() } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  earth.add(new THREE.Mesh(atmoGeom, atmoMat));
  let earthTexCancelled = false;
  const loader = new THREE.TextureLoader();
  loader.load('/solar-system/planets/earth.jpg', (tex) => {
    if (earthTexCancelled) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    earthMat.map = tex;
    earthMat.color.set(0xffffff);
    earthMat.needsUpdate = true;
  });
  loader.load('/solar-system/planets/earth-clouds.jpg', (tex) => {
    if (earthTexCancelled) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    cloudMat.map = tex;
    cloudMat.alphaMap = tex;
    cloudMat.opacity = 0.9;
    cloudMat.needsUpdate = true;
  });

  const terrain = makeMoonTerrain(lite);
  scene.add(terrain.mesh);
  scene.add(terrain.rocks);
  const dust = makeMoonDust(lite ? 900 : 1600);
  scene.add(dust.points);
  const prints = makePrints(lite ? 400 : 900);
  scene.add(prints.mesh);
  const kit = makeKit(lite);
  const base = makeMoonBase(terrain.heightAt, lite, kit, SUN_DIR, lightPool);
  scene.add(base.group);
  // The ground the crew uses every day: compacted where people walk and
  // park, scoured where the landers set down; boot prints and tracks already
  // in it from the crews before.
  for (const g of base.zones.groundMarks) terrain.tint(g.x, g.z, g.r, g.k);
  for (const p of base.zones.paths) terrain.tintPath(p, 1.1, -0.07);
  for (const tr of base.zones.tracks) terrain.tintPath(tr, 1.9, -0.035);
  const history = makePrints(lite ? 500 : 1200);
  scene.add(history.mesh);
  {
    let side = 1;
    for (const path of base.zones.paths) {
      for (let s = 0; s < path.length - 1; s++) {
        const [ax, az] = path[s]; const [bx, bz] = path[s + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        for (let d = 0; d < len; d += 0.8) {
          const wob = Math.sin(d * 1.7 + s) * 0.35;
          const x = ax + (bx - ax) * (d / len) + Math.cos(yaw) * wob;
          const z = az + (bz - az) * (d / len) - Math.sin(yaw) * wob;
          history.stamp(x, terrain.heightAt(x, z), z, yaw + (side > 0 ? 0 : Math.PI) * (d % 3.2 < 1.6 ? 0 : 1), side);
          side = -side;
        }
      }
    }
    for (const tr of base.zones.tracks) {
      for (let s = 0; s < tr.length - 1; s++) {
        const [ax, az] = tr[s]; const [bx, bz] = tr[s + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        for (let d = 0; d < len; d += 0.9) {
          for (const off of [-1.35, 1.35]) {
            const x = ax + (bx - ax) * (d / len) + Math.cos(yaw) * off;
            const z = az + (bz - az) * (d / len) - Math.sin(yaw) * off;
            history.track(x, terrain.heightAt(x, z), z, yaw, 0.36);
          }
        }
      }
    }
  }
  const horizon = makeMoonHorizon(terrain, lite);
  scene.add(horizon);

  const cosmonaut = makeCosmonaut(dust, lite);
  cosmonaut.position.copy(base.spawn);
  cosmonaut.yaw = Math.PI;
  cosmonaut.settle();
  scene.add(cosmonaut.group);
  const audio = makeSuitAudio();
  cosmonaut.onStep = (e) => {
    if (!base.inside) prints.stamp(e.x, e.y, e.z, e.yaw, e.side);
    audio.step(e.hard);
  };
  const gears: RoverGear[] = missionComplete() ? ['creep', 'cruise', 'sprint', 'ion'] : ['creep', 'cruise', 'sprint'];
  const rover = makeRover(base.rover, base.roverCollider, base.roverParts, terrain, dust, prints, gears);
  const lander = makeLander(PAD_CENTER.x, PAD_CENTER.y + 26, terrain.heightAt, dust, lite, lightPool);
  scene.add(lander.group);
  const mission = makeMission(terrain.heightAt, terrain.stampCrater, dust, lite, lightPool, base.zones.anchors.scienceTerminal);
  scene.add(mission.group);
  base.colliders.push(...mission.colliders);
  base.walkColliders.push(...mission.colliders);
  const meteors = makeMeteors({
    heightAt: terrain.heightAt, stampCrater: terrain.stampCrater, dust, colliders: base.colliders,
    walkRadius: TERRAIN_WALK_RADIUS, first: 24, every: 58, lights: lightPool,
  });
  scene.add(meteors.group);
  let roverFault = false;
  const jobs = makeJobs({
    anchors: base.zones.anchors, heightAt: terrain.heightAt,
    arrayFault: base.zones.arrayFault, dishFault: base.zones.dishFault, setStatus: base.zones.setStatus,
    rover: () => ({ x: rover.position.x, z: rover.position.z, yaw: rover.yaw }),
    setRoverFault: (on) => { roverFault = on; },
    briefed: () => mission.telemetry.briefed,
  });
  scene.add(jobs.group);

  const post = makeMoonPost(renderer, scene, camera, lite);
  const pinned = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('fixedpx');
  const perf = makeMoonPerf(renderer, mount, {
    minRatio: pinned ? maxRatio : Math.min(1, maxRatio),
    maxRatio,
    onPixelRatio: (r) => { renderer.setPixelRatio(r); post.setSize(mount.clientWidth, mount.clientHeight); },
  });

  /** The ground under the crew: the base's own floors where it has them. */
  const floorHeight = (x: number, z: number) => {
    const ground = terrain.heightAt(x, z);
    const floor = base.floorAt(x, z);
    return floor === null ? ground : Math.max(floor, ground);
  };
  const cam = makeCameraRig(camera, floorHeight, () => base.colliders, baseFov);
  cam.distance = isMobile ? 5.6 : 5.2;

  const input: SurfaceInput = {
    moveX: 0, moveY: 0, jump: false, run: false, crouch: false, orbitDX: 0, orbitDY: 0, zoom: 0,
    interact: false, use: false, viewToggle: false, throttle: 0, gearRequest: null,
  };
  const interactions = makeInteractions();
  const telemetry: SurfaceTelemetry = {
    ready: false, phase: 'descent', touchdownIn: 0, landing: lander.telemetry, grade: '',
    view: 'chase', driving: false, poiId: '', poiDist: 0, impactDist: 0, impactHold: 0,
    airborne: false, altitude: 0, speed: 0, hint: 'walk', craters: 0,
    o2: 97.4, heartRate: 64, suitTemp: 21.5, evaSeconds: 0, distanceM: 0,
    roverSpeed: 0, gear: rover.gear, gears: rover.gears, roverTop: rover.top, battery: 1, charging: false, roverFault: false,
    crouched: false, stumbling: false, sliding: false, anim: 'idle', heading: 0,
    mission: mission.telemetry, jobs: jobs.telemetry, prompt: interactions.prompt,
    airlock: { near: false, state: 'closed', cycle: 0 }, readout: '', readoutHold: 0, inside: '',
  };

  // ── Everything the one key can do. ──
  let view: SurfaceView = 'chase';
  let mountT = 0;
  const driving = () => ROVER_VIEWS.includes(view);
  const setView = (next: SurfaceView) => {
    view = next;
    telemetry.view = next;
    const onFoot = FOOT_VIEWS.includes(next);
    cosmonaut.setHelmetView(next === 'helmet');
    cosmonaut.group.visible = onFoot;
    post.setHelmet(next === 'helmet' || next === 'cockpit' ? 1 : 0);
    if (next === 'helmet') { cam.yaw = cosmonaut.yaw + Math.PI; cam.lookPitch = 0; }
    if (next === 'cockpit' || next === 'mast') { cam.yaw = rover.yaw + Math.PI; cam.lookPitch = next === 'mast' ? -0.08 : -0.05; }
    if (next === 'rover') { cam.yaw = rover.yaw + Math.PI; cam.pitch = 0.3; }
    if (next === 'chase') cam.pitch = 0.3;
    if (next === 'wide') cam.pitch = 0.5;
    cam.snap();
  };
  const cycleView = () => {
    const set = driving() ? ROVER_VIEWS : FOOT_VIEWS;
    setView(set[(set.indexOf(view) + 1) % set.length]);
  };
  const readout = (key: string) => { telemetry.readout = key; telemetry.readoutHold = 6; audio.bleep(); };
  for (const i of mission.interactables) interactions.add(i);
  for (const i of jobs.interactables) interactions.add(i);
  base.airlocks.forEach((a, k) => interactions.add({
    id: `airlock${k}`, priority: 2,
    where: () => (a.state === 'cycling' ? null : { x: a.x, z: a.z, r: 3.0 }),
    kind: () => 'tap',
    label: () => (a.state === 'open' ? 'closeAirlock' : 'cycleAirlock'),
    use: () => { base.cycleAirlock(a); audio.bleep(); },
  }));
  interactions.add({
    id: 'roverEnter', priority: 1,
    where: () => (mountT > 0 ? null : { x: base.roverCollider.x, z: base.roverCollider.z, r: base.roverCollider.r + 2.8 }),
    kind: () => 'tap', label: () => 'drive',
    use: () => { mountT = 0.45; cosmonaut.play('enterRover', 0.45); audio.bleep(); },
  });
  interactions.add({
    id: 'roverExit', mode: 'rover',
    where: () => ({ x: rover.position.x, z: rover.position.z, r: 1e6 }),
    kind: () => 'tap', label: () => (Math.abs(rover.speed) < 1.2 ? 'dismount' : 'stopToExit'),
    use: () => {
      if (Math.abs(rover.speed) >= 1.2) return;
      rover.driving = false;
      // Step off on whichever side is clear.
      const c = Math.cos(rover.yaw); const s = Math.sin(rover.yaw);
      for (const side of [-1, 1]) {
        const x = rover.position.x + c * side * 3.2; const z = rover.position.z - s * side * 3.2;
        const blocked = base.walkColliders.some((col) => col !== base.roverCollider && Math.hypot(x - col.x, z - col.z) < col.r + 0.6);
        cosmonaut.position.set(x, floorHeight(x, z), z);
        if (!blocked) break;
      }
      cosmonaut.velocity.set(0, 0, 0);
      cosmonaut.yaw = rover.yaw;
      cosmonaut.settle();
      cosmonaut.play('exitRover', 0.5);
      setView('chase');
      audio.bleep();
    },
  });
  const anchors = base.zones.anchors;
  for (const [id, anchor, key] of [['isru', anchors.isruPanel, 'isru'], ['power', anchors.powerCabinet, 'power'], ['comms', anchors.commsControl, 'comms'], ['charger', anchors.charger, 'charger']] as const) {
    interactions.add({
      id: `readout-${id}`, priority: 0,
      where: () => ({ x: anchor.x, z: anchor.z, r: 2.4 }),
      kind: () => 'tap', label: () => `read.${key}`,
      use: () => readout(key),
    });
  }
  mission.onEvent = (kind, x, z) => {
    if (kind === 'bite') audio.step(0.45);
    else if (kind === 'rumble') { audio.thump(25); cam.shake(0.4); }
    else if (kind === 'meteor' && x !== undefined && z !== undefined) meteors.strike(x, z);
    else audio.bleep();
    if (kind === 'reward' && mission.telemetry.stage === 'done') rover.unlock('ion');
  };
  jobs.onEvent = () => audio.bleep();

  // ── Frame state. ──
  let t = 0;
  let acc = 0;
  let jumped = false;
  let walked = false;
  let lastPoi = '';
  let exertion = 0;
  let egressHold = 0;
  let jumpLatch = false;
  let jumpEdge = false;
  let autoHelmet = false;
  const walk: WalkInput = { moveX: 0, moveZ: 0, jump: false, run: false, crouch: false, work: false };
  const tmp = new THREE.Vector3();
  const roverVel = new THREE.Vector3();
  const descentFocus = new THREE.Vector3();
  const descentPos = new THREE.Vector3();
  const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const room = { x: 0, z: 0, y: 0, r: 4.4 };

  const simStep = (h: number, firstStep: boolean) => {
    if (driving()) {
      rover.update(h, input.moveY, input.moveX, base.colliders, TERRAIN_WALK_RADIUS);
      cosmonaut.position.copy(rover.position);
      cosmonaut.settle();
      return;
    }
    rover.update(h, 0, 0, base.colliders, TERRAIN_WALK_RADIUS);
    const fx = -Math.sin(cam.yaw); const fz = -Math.cos(cam.yaw);
    const rx = -fz; const rz = fx;
    walk.moveX = fx * input.moveY + rx * input.moveX;
    walk.moveZ = fz * input.moveY + rz * input.moveX;
    walk.run = input.run && !input.crouch;
    walk.crouch = input.crouch;
    walk.jump = firstStep && jumpEdge;
    walk.work = interactions.prompt.holding;
    cosmonaut.update(h, walk, floorHeight, base.walkColliders, TERRAIN_WALK_RADIUS);
    base.confine(cosmonaut.position);
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
    cam.orbit(input.orbitDX, input.orbitDY, view === 'helmet' || view === 'cockpit' || view === 'mast');
    input.orbitDX = input.orbitDY = 0;
    cam.zoom(input.zoom);
    input.zoom = 0;
    const crew = cosmonaut.position;

    if (telemetry.phase !== 'surface') {
      // ── The landing. The vehicle is flown; the camera rides low on its
      // quarter, so it looms, and it sways with the engine. ──
      const lt = lander.telemetry;
      if (!lt.landed) {
        lander.update(dt, { throttle: input.throttle, moveX: input.moveX, moveY: input.moveY }, terrain.heightAt);
        if (lt.landed) {
          telemetry.phase = 'touchdown';
          telemetry.grade = lt.touchdown < 0.9 ? 'feather' : lt.touchdown < 1.9 ? 'good' : lt.touchdown < 3.2 ? 'firm' : 'hard';
          egressHold = EGRESS_HOLD;
          audio.thump(lt.touchdown < 1.5 ? 40 : 6);
          cam.shake(Math.min(1, 0.25 + lt.touchdown * 0.2));
          base.pois.push({ id: 'ourLander', x: lander.position.x, z: lander.position.z, r: 8 });
          const hull = { x: lander.position.x, z: lander.position.z, r: 3.4 };
          base.colliders.push(hull);
          base.walkColliders.push(hull);
        }
      } else {
        lander.update(dt, { throttle: 0, moveX: 0, moveY: 0 }, terrain.heightAt);
      }
      input.interact = false;
      telemetry.touchdownIn = lt.descent > 0.2 ? lt.altitude / lt.descent : 0;
      const close = THREE.MathUtils.clamp(1 - lt.altitude / 80, 0, 1);
      tmp.copy(lander.position).y += 3.0;
      descentFocus.lerp(tmp, t < dt * 2 ? 1 : 1 - Math.exp(-dt * 3.5));
      const dist = 17 + close * 4;
      const pitch = cam.pitch - 0.26 + close * 0.34;
      const sway = lt.throttle * 0.18;
      descentPos.set(
        descentFocus.x + Math.sin(cam.yaw) * dist * Math.cos(pitch) + Math.sin(t * 0.9) * sway,
        descentFocus.y + Math.sin(pitch) * dist + Math.sin(t * 1.3) * sway * 0.5,
        descentFocus.z + Math.cos(cam.yaw) * dist * Math.cos(pitch),
      );
      const floor = terrain.heightAt(descentPos.x, descentPos.z) + 2.2;
      if (descentPos.y < floor) descentPos.y = floor;
      if (t < dt * 2) camera.position.copy(descentPos);
      else camera.position.lerp(descentPos, 1 - Math.exp(-dt * 4.5));
      if (lt.throttle > 0.05 && lt.altitude < 40) camera.position.y += Math.sin(t * 37) * 0.02 * lt.throttle;
      camera.lookAt(descentFocus);
      const wantFov = baseFov + 6;
      if (Math.abs(camera.fov - wantFov) > 0.01) { camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix(); }
      crew.set(lt.egressX, terrain.heightAt(lt.egressX, lt.egressZ), lt.egressZ);
      cosmonaut.settle();
      cosmonaut.group.visible = false;
      rover.update(dt, 0, 0, base.colliders, TERRAIN_WALK_RADIUS);
      rover.present(1);
      if (telemetry.phase === 'touchdown') {
        egressHold -= dt;
        if (egressHold <= 0) {
          telemetry.phase = 'surface';
          cosmonaut.position.set(lt.egressX, terrain.heightAt(lt.egressX, lt.egressZ), lt.egressZ);
          cosmonaut.yaw = Math.PI;
          cosmonaut.settle();
          cam.yaw = 0;
          setView('chase');
          audio.bleep();
        }
      }
    } else {
      // ── Edges and the keys that are not movement. ──
      const press = input.interact;
      input.interact = false;
      jumpEdge = input.jump && !jumpLatch;
      jumpLatch = input.jump;
      if (input.viewToggle) {
        input.viewToggle = false;
        autoHelmet = false;
        cycleView();
      }
      if (input.gearRequest !== null) {
        const want = input.gearRequest;
        input.gearRequest = null;
        const was = rover.gear;
        rover.select(want);
        if (roverFault && (rover.gear === 'sprint' || rover.gear === 'ion')) rover.select(1);
        if (rover.gear !== was) audio.bleep();
      }

      // ── The simulation, at its own fixed rate. ──
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS) {
        simStep(STEP, steps === 0);
        acc -= STEP;
        steps += 1;
      }
      if (steps === MAX_STEPS) acc = 0;
      const alpha = acc / STEP;
      cosmonaut.present(alpha);
      rover.present(alpha);

      // Getting on: a moment's climb, then the seat.
      if (mountT > 0) {
        mountT -= dt;
        if (mountT <= 0) {
          rover.driving = true;
          setView('rover');
        }
      }
      if (!driving()) {
        cosmonaut.indoors = !!base.inside;
        if (base.inside && view !== 'helmet') { setView('helmet'); autoHelmet = true; }
        else if (!base.inside && autoHelmet) { autoHelmet = false; if (view === 'helmet') setView('chase'); }
      }

      // ── The one key. ──
      interactions.update(dt, { x: crew.x, z: crew.z, yaw: driving() ? rover.yaw : cosmonaut.yaw, driving: driving(), press, held: input.use || press });
      mission.update(dt, t, { crewX: crew.x, crewZ: crew.z, driving: driving() });
      jobs.update(dt, { crewX: crew.x, crewZ: crew.z, driving: driving() });

      // ── The camera. ──
      if (driving()) {
        roverVel.set(Math.sin(rover.yaw) * rover.speed, 0, Math.cos(rover.yaw) * rover.speed);
        if (view === 'rover') {
          cam.chase(dt, {
            position: base.rover.position, velocity: roverVel, yaw: rover.yaw + rover.yawRate * 0.35,
            height: 1.9, distance: Math.max(cam.distance, 6.2), speedFrac: Math.min(1, Math.abs(rover.speed) / 26),
          }, { follow: 3.5, lead: 0.2, leadMax: 3, fovKick: 9, horizontal: 11, vertical: 4.5 });
        } else {
          (view === 'mast' ? base.roverParts.mast : base.roverParts.seat).getWorldPosition(tmp);
          if (view === 'mast') tmp.y += 0.12;
          cam.firstPerson(dt, tmp, view === 'mast' ? 20 : 28);
        }
        cam.shake(rover.bump * 0.5);
      } else if (view === 'helmet') {
        const rel = wrap(cam.yaw + Math.PI - cosmonaut.yaw);
        if (cosmonaut.state.speed < 0.3 && Math.abs(rel) > 0.9) cosmonaut.yaw += rel * (1 - Math.exp(-dt * 4));
        cosmonaut.look(wrap(cam.yaw + Math.PI - cosmonaut.yaw), cam.lookPitch);
        cosmonaut.eye(tmp);
        cam.firstPerson(dt, tmp, 0);
      } else {
        const inside = base.inside;
        if (inside) { room.x = inside.x; room.z = inside.z; room.y = inside.y + 1.35; }
        const wide = view === 'wide' && !inside;
        cam.chase(dt, {
          position: cosmonaut.group.position, velocity: cosmonaut.velocity, yaw: cosmonaut.yaw,
          height: wide ? 2.2 : 1.35,
          distance: wide ? cam.distance * 4.2 + 14 : inside ? Math.min(cam.distance, 2.6) : cam.distance,
          speedFrac: Math.min(1, cosmonaut.state.speed / RUN),
        }, wide
          ? { follow: 1, lead: 0, leadMax: 0, fovKick: 0, horizontal: 4, vertical: 3 }
          : { follow: 2.6, lead: 0.16, leadMax: 0.8, fovKick: 4, horizontal: 14, vertical: 6.5, room: inside ? room : null });
      }
      if (!walked && cosmonaut.state.speed > 0.5) walked = true;
      if (!jumped && cosmonaut.state.airborne && cosmonaut.state.altitude > 0.3) jumped = true;
      telemetry.hint = !walked ? 'walk' : !jumped ? 'jump' : '';
    }
    cam.shake(meteors.shake * 0.8);

    // ── The glass. ──
    const onRover = driving();
    telemetry.driving = onRover;
    telemetry.airborne = cosmonaut.state.airborne;
    telemetry.altitude = cosmonaut.state.altitude;
    telemetry.speed = onRover ? Math.abs(rover.speed) : cosmonaut.state.speed;
    telemetry.roverSpeed = rover.speed;
    telemetry.gear = rover.gear;
    telemetry.roverTop = rover.top;
    telemetry.battery = rover.battery;
    telemetry.roverFault = roverFault;
    const charger = anchors.charger;
    telemetry.charging = Math.hypot(rover.position.x - charger.x, rover.position.z - charger.z) < 4 && Math.abs(rover.speed) < 0.3 && rover.battery < 0.995;
    if (telemetry.charging) rover.charge(dt);
    base.zones.setStatus('charger', telemetry.charging ? 'warn' : 'ok');
    telemetry.crouched = cosmonaut.state.crouched;
    telemetry.stumbling = cosmonaut.state.stumble > 0;
    telemetry.sliding = cosmonaut.state.sliding;
    telemetry.anim = cosmonaut.state.anim;
    telemetry.heading = (THREE.MathUtils.radToDeg(Math.atan2(-Math.sin(cam.yaw), -Math.cos(cam.yaw))) + 360) % 360;

    const work = onRover ? 0.1 : Math.min(1, cosmonaut.state.speed / 4.6) + (cosmonaut.state.airborne ? 0.3 : 0) + (interactions.prompt.holding ? 0.35 : 0);
    exertion += (work - exertion) * (1 - Math.exp(-dt * 0.35));
    if (telemetry.phase === 'surface') {
      telemetry.evaSeconds += dt;
      telemetry.distanceM += telemetry.speed * dt;
      telemetry.o2 = Math.max(0, telemetry.o2 - dt * 0.0011 * (1 + exertion * 2.2));
      telemetry.heartRate += ((64 + exertion * 68 + (cosmonaut.state.landed ? 6 : 0)) - telemetry.heartRate) * (1 - Math.exp(-dt * 0.6));
      telemetry.suitTemp += ((21.5 + exertion * 1.8) - telemetry.suitTemp) * (1 - Math.exp(-dt * 0.2));
    }
    audio.update(dt, exertion, view === 'helmet' || view === 'cockpit');
    const dr = mission.telemetry.drill;
    audio.drill(dr.load, mission.telemetry.stage === 'drill' && dr.engaged && !dr.stalled && !dr.ready);

    let best = ''; let bestD = 1e9;
    for (const poi of base.pois) {
      const d = Math.hypot(poi.x - crew.x, poi.z - crew.z);
      if (d < poi.r && d < bestD) { bestD = d; best = poi.id; }
    }
    if (best && best !== lastPoi && telemetry.phase === 'surface') audio.bleep();
    lastPoi = best;
    telemetry.poiId = best;
    telemetry.poiDist = best ? bestD : 0;
    let nearLock: Airlock | null = null;
    for (const a of base.airlocks) if (Math.hypot(a.x - crew.x, a.z - crew.z) < 8) nearLock = a;
    telemetry.airlock.near = !!nearLock && !onRover;
    if (nearLock) { telemetry.airlock.state = nearLock.state; telemetry.airlock.cycle = nearLock.cycle; }
    telemetry.inside = base.inside?.id ?? '';
    telemetry.readoutHold = Math.max(0, telemetry.readoutHold - dt);
    if (telemetry.readoutHold <= 0) telemetry.readout = '';

    const impact = telemetry.phase === 'surface' ? meteors.update(dt, crew.x, crew.z) : null;
    if (impact) {
      telemetry.impactDist = impact.distance;
      telemetry.impactHold = 6;
      telemetry.craters += 1;
      audio.thump(impact.distance);
    }
    telemetry.impactHold = Math.max(0, telemetry.impactHold - dt);

    dust.update(dt, terrain.heightAt);
    base.update(dt, t, EARTH_DIR, crew.x, crew.z);
    earth.rotation.y += dt * 0.004;
    clouds.rotation.y += dt * 0.0015;
    atmoMat.uniforms.uSun.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
    terrain.setSunView(tmp.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse));
    const su = Math.round(crew.dot(shadowU) / shadowTexel) * shadowTexel;
    const sv = Math.round(crew.dot(shadowV) / shadowTexel) * shadowTexel;
    sun.target.position.copy(shadowU).multiplyScalar(su).addScaledVector(shadowV, sv).addScaledVector(SUN_DIR, crew.dot(SUN_DIR));
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 220);
    lightPool.flush(crew.x, crew.y, crew.z);
    stars.position.copy(camera.position);
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
  // Compile every program before the first frame — in parallel where the
  // driver allows it — so the descent does not open on a long stall. Hidden
  // props are shown for the compile so they cannot stall later either.
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
    mission.dispose();
    jobs.dispose();
    meteors.dispose();
    cosmonaut.dispose();
    base.dispose();
    kit.dispose();
    prints.dispose();
    history.dispose();
    dust.dispose();
    terrain.dispose();
    horizon.geometry.dispose();
    earthGeom.dispose(); cloudGeom.dispose(); atmoGeom.dispose();
    earthMat.map?.dispose(); cloudMat.map?.dispose();
    earthMat.dispose(); cloudMat.dispose(); atmoMat.dispose();
    sunSprite.material.dispose();
    sunHalo.material.dispose();
    stars.geometry.dispose();
    (stars.material as THREE.Material).dispose();
    scene.environment?.dispose();
    post.dispose();
    renderer.dispose();
  };

  const handle: MoonSurfaceHandle = {
    input,
    telemetry,
    startAudio: audio.start,
    nudgeMeteor: meteors.nudge,
    teleport(x, z) {
      cosmonaut.position.set(x, floorHeight(x, z), z);
      cosmonaut.velocity.set(0, 0, 0);
      cosmonaut.settle();
      cam.snap();
    },
    where: () => ({ x: cosmonaut.position.x, y: cosmonaut.position.y, z: cosmonaut.position.z }),
    advanceMission: mission.advance,
    startJob: (id) => { jobs.start(id); },
    skipDescent() {
      if (telemetry.phase === 'surface') return;
      lander.position.set(PAD_CENTER.x, terrain.heightAt(PAD_CENTER.x, PAD_CENTER.y + 26) + 0.35, PAD_CENTER.y + 26);
      lander.telemetry.landed = true;
      lander.telemetry.touchdown = 0.6;
      lander.telemetry.egressX = lander.position.x;
      lander.telemetry.egressZ = lander.position.z + 4.2;
      telemetry.phase = 'touchdown';
      telemetry.grade = 'feather';
      egressHold = 0.2;
    },
    perf: perf.sample,
    roverAt: () => ({ x: base.roverCollider.x, z: base.roverCollider.z }),
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      perf.dispose();
      if (window.__stellarMoon === handle) delete window.__stellarMoon;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      earthTexCancelled = true;
      audio.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      // The GPU side goes once the async compile has settled: three keeps
      // polling the programs it is compiling, and they must still exist.
      compiling.then(release, release);
    },
  };
  if (opts.startOnSurface) handle.skipDescent();
  if (process.env.NODE_ENV !== 'production') window.__stellarMoon = handle;
  return handle;
}
