// Moon Mode: the surface scene that takes over when the ship lands. One
// renderer, one hard sun with a shadow map that follows the cosmonaut, Earth
// hanging over the base, the terrain, the outpost, the dust, the meteors,
// and a chase camera on a slow leash. The React overlay owns the DOM and
// feeds `input`; this file owns the frame.

import * as THREE from 'three';
import { makePostFx } from '@/lib/solar-system/post-processing';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import { makeMoonTerrain, makeMoonHorizon, TERRAIN_WALK_RADIUS } from '@/lib/solar-system/moon-terrain';
import { makeMoonDust } from '@/lib/solar-system/moon-fx';
import { makeCosmonaut, type WalkInput } from '@/lib/solar-system/moon-cosmonaut';
import { makeMoonBase } from '@/lib/solar-system/moon-base';
import { makeMeteors } from '@/lib/solar-system/moon-meteors';

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
}

export interface SurfaceTelemetry {
  phase: 'descent' | 'surface';
  /** Seconds to touchdown during descent. */
  touchdownIn: number;
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
}

export interface MoonSurfaceHandle {
  input: SurfaceInput;
  telemetry: SurfaceTelemetry;
  /** Development only: fire the next meteoroid now. */
  nudgeMeteor: () => void;
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

function starfield(count: number): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1; const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = r * Math.cos(a) * 1800;
    pos[i * 3 + 1] = u * 1800;
    pos[i * 3 + 2] = r * Math.sin(a) * 1800;
    const b = 0.35 + Math.pow(Math.random(), 3) * 0.9;
    const warm = Math.random();
    col[i * 3] = b * (0.85 + warm * 0.15);
    col[i * 3 + 1] = b * 0.9;
    col[i * 3 + 2] = b * (1.05 - warm * 0.2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
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
  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 52, mount.clientWidth / mount.clientHeight, 0.08, 4000);

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

  const stars = starfield(lite ? 2200 : 4200);
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

  // Earth: lit by the same sun, a thin blue limb, turning slowly.
  const earthGeom = new THREE.SphereGeometry(52, 48, 32);
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x8fb7ff, roughness: 0.9, metalness: 0 });
  const earth = new THREE.Mesh(earthGeom, earthMat);
  earth.position.copy(EARTH_DIR).multiplyScalar(1250);
  earth.rotation.z = 0.41;
  scene.add(earth);
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6fa8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  earthGlow.position.copy(earth.position);
  earthGlow.scale.setScalar(150);
  scene.add(earthGlow);
  let earthTexCancelled = false;
  new THREE.TextureLoader().load('/solar-system/planets/earth.jpg', (tex) => {
    if (earthTexCancelled) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    earthMat.map = tex;
    earthMat.color.set(0xffffff);
    earthMat.needsUpdate = true;
  });

  const terrain = makeMoonTerrain(lite);
  scene.add(terrain.mesh);
  scene.add(terrain.rocks);
  const horizon = makeMoonHorizon(terrain, lite);
  scene.add(horizon);
  const dust = makeMoonDust(lite ? 900 : 1600);
  scene.add(dust.points);
  const base = makeMoonBase(terrain.heightAt, lite);
  scene.add(base.group);
  const cosmonaut = makeCosmonaut(dust);
  cosmonaut.position.copy(base.spawn);
  cosmonaut.yaw = Math.PI;
  scene.add(cosmonaut.group);
  const meteors = makeMeteors({
    heightAt: terrain.heightAt, stampCrater: terrain.stampCrater, dust, colliders: base.colliders,
    walkRadius: TERRAIN_WALK_RADIUS, first: 24, every: 58,
  });
  scene.add(meteors.group);

  const postFx = makePostFx(renderer, scene, camera, lite);

  const input: SurfaceInput = { moveX: 0, moveY: 0, jump: false, run: false, orbitDX: 0, orbitDY: 0, zoom: 0 };
  const telemetry: SurfaceTelemetry = {
    phase: 'descent', touchdownIn: DESCENT, poiId: '', poiDist: 0, impactDist: 0, impactHold: 0,
    airborne: false, altitude: 0, speed: 0, hint: 'walk', craters: 0,
  };

  // ── Camera. ──
  let camYaw = Math.PI;
  let camPitch = 0.34;
  let camDist = isMobile ? 5.6 : 5.2;
  let dragHold = 0;
  let t = 0;
  let jumped = false;
  let walked = false;
  const target = new THREE.Vector3().copy(cosmonaut.position).add(new THREE.Vector3(0, 1.35, 0));
  const camPos = new THREE.Vector3();
  const descentFrom = new THREE.Vector3().copy(base.spawn).add(new THREE.Vector3(10, 110, 70));
  const walk: WalkInput = { moveX: 0, moveZ: 0, jump: false, run: false };
  const tmp = new THREE.Vector3();
  let jumpLatch = false;

  const placeCamera = (dt: number) => {
    // Orbit from the drag; when the pilot moves and has let go, ease round
    // behind them so the stick keeps meaning "forward".
    if (input.orbitDX !== 0 || input.orbitDY !== 0) {
      camYaw -= input.orbitDX * 0.0052;
      camPitch = THREE.MathUtils.clamp(camPitch + input.orbitDY * 0.004, -0.15, 1.15);
      input.orbitDX = input.orbitDY = 0;
      dragHold = 1.5;
    }
    dragHold -= dt;
    if (input.zoom !== 0) {
      camDist = THREE.MathUtils.clamp(camDist * Math.pow(1.12, input.zoom), CAM_MIN, CAM_MAX);
      input.zoom = 0;
    }
    if (dragHold <= 0 && cosmonaut.state.speed > 1) {
      let d = cosmonaut.yaw + Math.PI - camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      camYaw += d * (1 - Math.exp(-dt * 0.9));
    }
    tmp.copy(cosmonaut.position).y += 1.35;
    target.lerp(tmp, 1 - Math.exp(-dt * 9));
    const cp = Math.cos(camPitch);
    camPos.set(target.x + Math.sin(camYaw) * camDist * cp, target.y + Math.sin(camPitch) * camDist, target.z + Math.cos(camYaw) * camDist * cp);
    const floor = terrain.heightAt(camPos.x, camPos.z) + 0.55;
    if (camPos.y < floor) camPos.y = floor;
    const shake = meteors.shake * 0.22;
    if (shake > 0.001) camPos.add(tmp.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
    camera.position.copy(camPos);
    camera.lookAt(target);
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

    if (telemetry.phase === 'descent') {
      const k = Math.min(1, t / DESCENT);
      telemetry.touchdownIn = Math.max(0, DESCENT - t);
      const e = k * k * (3 - 2 * k);
      placeCamera(dt);
      camPos.copy(descentFrom).lerp(camera.position, e);
      camera.position.copy(camPos);
      camera.lookAt(target);
      walk.moveX = walk.moveZ = 0; walk.jump = false; walk.run = false;
      cosmonaut.update(dt, walk, terrain.heightAt, base.colliders, TERRAIN_WALK_RADIUS);
      if (k >= 1) telemetry.phase = 'surface';
    } else {
      // Stick → world, in the camera's frame.
      const fx = -Math.sin(camYaw); const fz = -Math.cos(camYaw);
      const rx = -fz; const rz = fx;
      walk.moveX = fx * input.moveY + rx * input.moveX;
      walk.moveZ = fz * input.moveY + rz * input.moveX;
      walk.run = input.run;
      // One jump per press.
      walk.jump = input.jump && !jumpLatch;
      jumpLatch = input.jump;
      cosmonaut.update(dt, walk, terrain.heightAt, base.colliders, TERRAIN_WALK_RADIUS);
      if (!walked && cosmonaut.state.speed > 0.5) walked = true;
      if (!jumped && cosmonaut.state.airborne && cosmonaut.state.altitude > 0.3) jumped = true;
      telemetry.hint = !walked ? 'walk' : !jumped ? 'jump' : '';
      placeCamera(dt);
    }
    telemetry.airborne = cosmonaut.state.airborne;
    telemetry.altitude = cosmonaut.state.altitude;
    telemetry.speed = cosmonaut.state.speed;

    // Nearest point of interest.
    let best = ''; let bestD = 1e9;
    for (const poi of base.pois) {
      const d = Math.hypot(poi.x - cosmonaut.position.x, poi.z - cosmonaut.position.z);
      if (d < poi.r && d < bestD) { bestD = d; best = poi.id; }
    }
    telemetry.poiId = best;
    telemetry.poiDist = best ? bestD : 0;

    const impact = telemetry.phase === 'surface' ? meteors.update(dt, cosmonaut.position.x, cosmonaut.position.z) : null;
    if (impact) {
      telemetry.impactDist = impact.distance;
      telemetry.impactHold = 6;
      telemetry.craters += 1;
    }
    telemetry.impactHold = Math.max(0, telemetry.impactHold - dt);

    dust.update(dt, terrain.heightAt);
    base.update(t, EARTH_DIR);
    earth.rotation.y += dt * 0.004;
    // The shadow frustum rides with the cosmonaut so the base and the ground
    // nearby are always sharp.
    sun.target.position.copy(cosmonaut.position);
    sun.position.copy(cosmonaut.position).addScaledVector(SUN_DIR, 220);
    stars.position.copy(camera.position);
    postFx.render(dt);
  };

  const onResize = () => {
    const w = mount.clientWidth; const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    postFx.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(loop);

  const handle: MoonSurfaceHandle = {
    input,
    telemetry,
    nudgeMeteor: meteors.nudge,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (window.__stellarMoon === handle) delete window.__stellarMoon;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      earthTexCancelled = true;
      meteors.dispose();
      cosmonaut.dispose();
      base.dispose();
      dust.dispose();
      terrain.dispose();
      horizon.geometry.dispose();
      earthGeom.dispose();
      earthMat.map?.dispose();
      earthMat.dispose();
      earthGlow.material.dispose();
      sunSprite.material.dispose();
      sunHalo.material.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      scene.environment?.dispose();
      postFx.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
  if (process.env.NODE_ENV !== 'production') window.__stellarMoon = handle;
  return handle;
}
