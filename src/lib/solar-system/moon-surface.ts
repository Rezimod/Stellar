// Moon Mode: the surface scene that takes over when the ship lands. One
// renderer, one hard sun with a shadow map that follows the crew, Earth
// with its clouds over the base, the Milky Way, the terrain, the outpost,
// the dust, the prints, the meteors, the rover — and a camera that is
// either on a slow leash behind the cosmonaut, inside the helmet, or
// behind the rover. The React overlay owns the DOM and feeds `input`; this
// file owns the frame.

import * as THREE from 'three';
import { makeMoonPost } from '@/lib/solar-system/moon-post';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import { makeMoonTerrain, makeMoonHorizon, TERRAIN_WALK_RADIUS } from '@/lib/solar-system/moon-terrain';
import { makeMoonDust } from '@/lib/solar-system/moon-fx';
import { makeCosmonaut, type WalkInput } from '@/lib/solar-system/moon-cosmonaut';
import { makeMoonBase } from '@/lib/solar-system/moon-base';
import { makeMeteors } from '@/lib/solar-system/moon-meteors';
import { makePrints } from '@/lib/solar-system/moon-prints';
import { makeSuitAudio } from '@/lib/solar-system/moon-audio';
import { makeRover } from '@/lib/solar-system/moon-rover';

export type SurfaceView = 'chase' | 'helmet' | 'rover';

export interface SurfaceInput {
  /** Stick, camera frame: x right, y forward, each in [-1, 1]. */
  moveX: number;
  moveY: number;
  jump: boolean;
  run: boolean;
  /** Pointer drag since last frame, CSS px; consumed by the camera. */
  orbitDX: number;
  orbitDY: number;
  /** Wheel / pinch steps since last frame; consumed. */
  zoom: number;
  /** Edge-triggered: E / the action key, and C / the view key. Consumed. */
  interact: boolean;
  viewToggle: boolean;
}

export interface SurfaceTelemetry {
  phase: 'descent' | 'surface';
  /** Seconds to touchdown during descent. */
  touchdownIn: number;
  view: SurfaceView;
  poiId: string;
  poiDist: number;
  /** Last meteoroid impact: distance in m, and how long to keep it on the glass. */
  impactDist: number;
  impactHold: number;
  airborne: boolean;
  altitude: number;
  speed: number;
  /** Progressive hint: what to try next. '' once both are done. */
  hint: 'walk' | 'jump' | '';
  craters: number;
  /** Life support. */
  o2: number;
  heartRate: number;
  suitTemp: number;
  evaSeconds: number;
  distanceM: number;
  /** Standing by the rover; the action key mounts it. */
  canDrive: boolean;
  roverSpeed: number;
  /** An airlock within reach is open. */
  airlockOpen: boolean;
  /** The habitat the crew is standing in, or ''. */
  inside: string;
}

export interface MoonSurfaceHandle {
  input: SurfaceInput;
  telemetry: SurfaceTelemetry;
  /** Call from a user gesture to let the suit be heard. */
  startAudio: () => void;
  /** Development only: fire the next meteoroid now; put the crew somewhere. */
  nudgeMeteor: () => void;
  teleport: (x: number, z: number) => void;
  dispose: () => void;
}

declare global {
  interface Window {
    __stellarMoon?: MoonSurfaceHandle;
  }
}

const DESCENT = 6;
const CAM_MIN = 2.8;
const CAM_MAX = 9.5;
const SUN_DIR = new THREE.Vector3(-0.62, 0.46, 0.64).normalize();
const EARTH_DIR = new THREE.Vector3(0.28, 0.6, -0.75).normalize();

function starfield(count: number, band: number): THREE.Points {
  const total = count + band;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0.4, 0.3));
  const v = new THREE.Vector3();
  for (let i = 0; i < total; i++) {
    const inBand = i >= count;
    if (inBand) {
      // The Milky Way: a great circle, gaussian spread, denser toward the core.
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

export function makeMoonSurface(mount: HTMLElement): MoonSurfaceHandle {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const lite = isMobile;
  const renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.5 : 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 1);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 52, mount.clientWidth / mount.clientHeight, 0.05, 4000);

  // ── Light: one sun, hard shadows; a whisper of ground bounce and earthshine. ──
  const sun = new THREE.DirectionalLight(0xfff8ee, 3.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  const sr = lite ? 42 : 60;
  sun.shadow.camera.left = -sr; sun.shadow.camera.right = sr; sun.shadow.camera.top = sr; sun.shadow.camera.bottom = -sr;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.35;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0x243252, 0x6a6764, 0.42));

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

  // Earth: lit by the same sun, clouds above it, a blue rim of air, turning slowly.
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
  const atmo = new THREE.Mesh(atmoGeom, atmoMat);
  earth.add(atmo);
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
  const horizon = makeMoonHorizon(terrain, lite);
  scene.add(horizon);
  const dust = makeMoonDust(lite ? 900 : 1600);
  scene.add(dust.points);
  const prints = makePrints(lite ? 400 : 900);
  scene.add(prints.mesh);
  const base = makeMoonBase(terrain.heightAt, lite);
  scene.add(base.group);
  const cosmonaut = makeCosmonaut(dust);
  cosmonaut.position.copy(base.spawn);
  cosmonaut.yaw = Math.PI;
  scene.add(cosmonaut.group);
  const audio = makeSuitAudio();
  cosmonaut.onStep = (e) => {
    prints.stamp(e.x, e.y, e.z, e.yaw, e.side);
    audio.step(e.hard);
  };
  const rover = makeRover(base.rover, base.roverCollider, base.roverParts, terrain, dust, prints);
  const meteors = makeMeteors({
    heightAt: terrain.heightAt, stampCrater: terrain.stampCrater, dust, colliders: base.colliders,
    walkRadius: TERRAIN_WALK_RADIUS, first: 24, every: 58,
  });
  scene.add(meteors.group);

  const post = makeMoonPost(renderer, scene, camera, lite);

  const input: SurfaceInput = { moveX: 0, moveY: 0, jump: false, run: false, orbitDX: 0, orbitDY: 0, zoom: 0, interact: false, viewToggle: false };
  const telemetry: SurfaceTelemetry = {
    phase: 'descent', touchdownIn: DESCENT, view: 'chase', poiId: '', poiDist: 0, impactDist: 0, impactHold: 0,
    airborne: false, altitude: 0, speed: 0, hint: 'walk', craters: 0,
    o2: 97.4, heartRate: 64, suitTemp: 21.5, evaSeconds: 0, distanceM: 0,
    canDrive: false, roverSpeed: 0, airlockOpen: false, inside: '',
  };
  /** The ground under the crew: the base's own floors where it has them. */
  const floorHeight = (x: number, z: number) => base.floorAt(x, z) ?? terrain.heightAt(x, z);

  // ── Camera. ──
  let view: SurfaceView = 'chase';
  let camYaw = Math.PI;
  let camPitch = 0.34;
  let helmetPitch = 0;
  let camDist = isMobile ? 5.6 : 5.2;
  let dragHold = 0;
  let t = 0;
  let jumped = false;
  let walked = false;
  let lastPoi = '';
  let exertion = 0;
  const target = new THREE.Vector3().copy(cosmonaut.position).add(new THREE.Vector3(0, 1.35, 0));
  const camPos = new THREE.Vector3();
  const descentFrom = new THREE.Vector3().copy(base.spawn).add(new THREE.Vector3(10, 110, 70));
  const walk: WalkInput = { moveX: 0, moveZ: 0, jump: false, run: false };
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let jumpLatch = false;
  /** Indoors the crew is seen from inside the helmet — a chase camera has
   *  no room in a habitat — and the chase view comes back at the door. */
  let autoHelmet = false;
  const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  const consumeOrbit = (dt: number) => {
    if (input.orbitDX !== 0 || input.orbitDY !== 0) {
      camYaw -= input.orbitDX * (view === 'helmet' ? 0.0036 : 0.0052);
      if (view === 'helmet') helmetPitch = THREE.MathUtils.clamp(helmetPitch - input.orbitDY * 0.0032, -1.2, 1.1);
      else camPitch = THREE.MathUtils.clamp(camPitch + input.orbitDY * 0.004, -0.15, 1.15);
      input.orbitDX = input.orbitDY = 0;
      dragHold = 1.5;
    }
    dragHold -= dt;
    if (input.zoom !== 0) {
      camDist = THREE.MathUtils.clamp(camDist * Math.pow(1.12, input.zoom), CAM_MIN, CAM_MAX);
      input.zoom = 0;
    }
  };
  const shakeCam = () => {
    const shake = meteors.shake * 0.22;
    if (shake > 0.001) camera.position.add(tmp.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
  };
  const placeChase = (dt: number, anchor: THREE.Vector3, anchorYaw: number, height: number, dist: number, moving: boolean) => {
    // When the pilot moves and has let go, ease round behind them so the
    // stick keeps meaning "forward".
    if (dragHold <= 0 && moving) camYaw += wrap(anchorYaw + Math.PI - camYaw) * (1 - Math.exp(-dt * 0.9));
    tmp.copy(anchor).y += height;
    target.lerp(tmp, 1 - Math.exp(-dt * 9));
    const cp = Math.cos(camPitch);
    camPos.set(target.x + Math.sin(camYaw) * dist * cp, target.y + Math.sin(camPitch) * dist, target.z + Math.cos(camYaw) * dist * cp);
    const floor = floorHeight(camPos.x, camPos.z) + 0.55;
    if (camPos.y < floor) camPos.y = floor;
    // Indoors the camera stays under the dome with the crew.
    const room = base.inside;
    if (room) {
      const dx = camPos.x - room.x; const dz = camPos.z - room.z;
      const r = Math.hypot(dx, dz);
      if (r > 4.4) { camPos.x = room.x + dx / r * 4.4; camPos.z = room.z + dz / r * 4.4; }
      if (camPos.y > room.y + 3.3) camPos.y = room.y + 3.3;
    }
    camera.position.copy(camPos);
    shakeCam();
    camera.lookAt(target);
  };
  const placeHelmet = () => {
    cosmonaut.eye(camera.position);
    shakeCam();
    const fx = -Math.sin(camYaw) * Math.cos(helmetPitch); const fz = -Math.cos(camYaw) * Math.cos(helmetPitch);
    tmp.copy(camera.position).add(tmp2.set(fx, Math.sin(helmetPitch), fz));
    camera.lookAt(tmp);
  };
  const setView = (next: SurfaceView) => {
    view = next;
    telemetry.view = next;
    cosmonaut.setHelmetView(next === 'helmet');
    cosmonaut.group.visible = next !== 'rover';
    post.setHelmet(next === 'helmet' ? 1 : 0);
    if (next === 'helmet') { camYaw = cosmonaut.yaw + Math.PI; helmetPitch = 0; }
    if (next === 'rover') { camYaw = rover.yaw + Math.PI; camPitch = 0.3; }
    if (next === 'chase') camPitch = 0.34;
  };

  let raf = 0;
  let last = performance.now();
  let docVisible = !document.hidden;
  const onVis = () => {
    docVisible = !document.hidden;
    last = performance.now();
    if (docVisible && !raf) raf = requestAnimationFrame(loop);
  };
  const loop = () => {
    raf = 0;
    if (!docVisible) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const crew = cosmonaut.position;

    if (telemetry.phase === 'descent') {
      const k = Math.min(1, t / DESCENT);
      telemetry.touchdownIn = Math.max(0, DESCENT - t);
      const e = k * k * (3 - 2 * k);
      consumeOrbit(dt);
      placeChase(dt, crew, cosmonaut.yaw, 1.35, camDist, false);
      camPos.copy(descentFrom).lerp(camera.position, e);
      camera.position.copy(camPos);
      camera.lookAt(target);
      walk.moveX = walk.moveZ = 0; walk.jump = false; walk.run = false;
      cosmonaut.update(dt, walk, floorHeight, base.walkColliders, TERRAIN_WALK_RADIUS);
      base.confine(crew);
      rover.update(dt, 0, 0, base.colliders, TERRAIN_WALK_RADIUS);
      if (k >= 1) telemetry.phase = 'surface';
    } else {
      consumeOrbit(dt);
      // Action key: mount or leave the rover.
      const nearRover = Math.hypot(crew.x - base.roverCollider.x, crew.z - base.roverCollider.z) < base.roverCollider.r + 2.2;
      telemetry.canDrive = view !== 'rover' && nearRover;
      if (input.interact) {
        input.interact = false;
        if (view === 'rover' && Math.abs(rover.speed) < 1.2) {
          rover.driving = false;
          const side = base.rover.position;
          crew.set(side.x + Math.cos(rover.yaw) * 3.2, 0, side.z - Math.sin(rover.yaw) * 3.2);
          crew.y = terrain.heightAt(crew.x, crew.z);
          cosmonaut.yaw = rover.yaw;
          setView('chase');
          audio.bleep();
        } else if (view !== 'rover' && nearRover) {
          rover.driving = true;
          setView('rover');
          audio.bleep();
        }
      }
      if (input.viewToggle) {
        input.viewToggle = false;
        autoHelmet = false;
        if (view !== 'rover') setView(view === 'chase' ? 'helmet' : 'chase');
      }

      if (view === 'rover') {
        rover.update(dt, input.moveY, input.moveX, base.colliders, TERRAIN_WALK_RADIUS);
        // The crew rides along, for the meteors, the labels and the shadow frustum.
        crew.copy(base.rover.position);
        placeChase(dt, base.rover.position, rover.yaw, 1.9, Math.max(camDist, 6.2), Math.abs(rover.speed) > 0.5);
        walk.moveX = walk.moveZ = 0; walk.jump = false;
      } else {
        rover.update(dt, 0, 0, base.colliders, TERRAIN_WALK_RADIUS);
        // Stick → world, in the camera's frame.
        const fx = -Math.sin(camYaw); const fz = -Math.cos(camYaw);
        const rx = -fz; const rz = fx;
        walk.moveX = fx * input.moveY + rx * input.moveX;
        walk.moveZ = fz * input.moveY + rz * input.moveX;
        walk.run = input.run;
        walk.jump = input.jump && !jumpLatch;
        jumpLatch = input.jump;
        cosmonaut.update(dt, walk, floorHeight, base.walkColliders, TERRAIN_WALK_RADIUS);
        base.confine(crew);
        cosmonaut.indoors = !!base.inside;
        if (base.inside && view === 'chase') { setView('helmet'); autoHelmet = true; }
        else if (!base.inside && autoHelmet) { autoHelmet = false; if (view === 'helmet') setView('chase'); }
        if (view === 'helmet') {
          // Standing still, the body follows the eyes once they turn far enough.
          const rel = wrap(camYaw + Math.PI - cosmonaut.yaw);
          if (cosmonaut.state.speed < 0.3 && Math.abs(rel) > 0.9) cosmonaut.yaw += rel * (1 - Math.exp(-dt * 4));
          cosmonaut.look(wrap(camYaw + Math.PI - cosmonaut.yaw), helmetPitch);
          placeHelmet();
        } else {
          placeChase(dt, crew, cosmonaut.yaw, 1.35, base.inside ? Math.min(camDist, 2.6) : camDist, cosmonaut.state.speed > 1);
        }
        if (!walked && cosmonaut.state.speed > 0.5) walked = true;
        if (!jumped && cosmonaut.state.airborne && cosmonaut.state.altitude > 0.3) jumped = true;
      }
      telemetry.hint = !walked ? 'walk' : !jumped ? 'jump' : '';
    }
    telemetry.airborne = cosmonaut.state.airborne;
    telemetry.altitude = cosmonaut.state.altitude;
    telemetry.speed = view === 'rover' ? Math.abs(rover.speed) : cosmonaut.state.speed;
    telemetry.roverSpeed = rover.speed;

    // ── Life support: the suit works harder when you do. ──
    const work = view === 'rover' ? 0.1 : Math.min(1, cosmonaut.state.speed / 4.6) + (cosmonaut.state.airborne ? 0.3 : 0);
    exertion += (work - exertion) * (1 - Math.exp(-dt * 0.35));
    if (telemetry.phase === 'surface') {
      telemetry.evaSeconds += dt;
      telemetry.distanceM += telemetry.speed * dt;
      telemetry.o2 = Math.max(0, telemetry.o2 - dt * 0.0011 * (1 + exertion * 2.2));
      telemetry.heartRate += ((64 + exertion * 68 + (cosmonaut.state.landed ? 6 : 0)) - telemetry.heartRate) * (1 - Math.exp(-dt * 0.6));
      telemetry.suitTemp += ((21.5 + exertion * 1.8) - telemetry.suitTemp) * (1 - Math.exp(-dt * 0.2));
    }
    audio.update(dt, exertion, view === 'helmet');

    // Nearest point of interest; a bleep when a new one comes up.
    let best = ''; let bestD = 1e9;
    for (const poi of base.pois) {
      const d = Math.hypot(poi.x - crew.x, poi.z - crew.z);
      if (d < poi.r && d < bestD) { bestD = d; best = poi.id; }
    }
    if (best && best !== lastPoi && telemetry.phase === 'surface') audio.bleep();
    lastPoi = best;
    telemetry.poiId = best;
    telemetry.poiDist = best ? bestD : 0;
    telemetry.airlockOpen = base.airlocks.some((a) => a.open > 0.6 && Math.hypot(a.x - crew.x, a.z - crew.z) < 7) && !base.inside;
    telemetry.inside = base.inside?.id ?? '';

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
    // The shadow frustum rides with the crew so the base and the ground
    // nearby are always sharp.
    sun.target.position.copy(crew);
    sun.position.copy(crew).addScaledVector(SUN_DIR, 220);
    stars.position.copy(camera.position);
    post.render(dt);
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
  raf = requestAnimationFrame(loop);

  const handle: MoonSurfaceHandle = {
    input,
    telemetry,
    startAudio: audio.start,
    nudgeMeteor: meteors.nudge,
    teleport(x, z) { cosmonaut.position.set(x, terrain.heightAt(x, z), z); },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (window.__stellarMoon === handle) delete window.__stellarMoon;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      earthTexCancelled = true;
      audio.dispose();
      meteors.dispose();
      cosmonaut.dispose();
      base.dispose();
      prints.dispose();
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
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
  if (process.env.NODE_ENV !== 'production') window.__stellarMoon = handle;
  return handle;
}
