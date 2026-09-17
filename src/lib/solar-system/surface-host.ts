// What every surface scene (the Moon, Mars, Proxima b, Earth) shares: the
// renderer and its context, the camera, the one hard sun and its shadow box,
// the light pool, the post chain, the frame accounting and its governor, the
// quality preset (applied live when the player changes it), the frame loop
// with its visibility, pause and context-loss handling, the pre-compile, and
// the teardown that gives the GPU everything back. The scenes build what is
// in the world; this owns how it is drawn.

import * as THREE from 'three';
import { makeMoonPost, type MoonPostHandle } from '@/lib/solar-system/moon-post';
import { makeMoonPerf, probeCalls, type MoonPerf } from '@/lib/solar-system/moon-perf';
import { makeLightPool, type LightPool } from '@/lib/solar-system/moon-lights';
import { getSettings } from '@/game/settings';
import { currentQuality, onQualityChange, type QualityProfile } from '@/game/quality';

export interface SurfaceHostOptions {
  clearColor: THREE.ColorRepresentation;
  exposure: number;
  sun: { color: THREE.ColorRepresentation; intensity: number };
  near: number;
  far: number;
  /** The GPU took the context away; the owner should rebuild the scene. */
  onContextLost?: () => void;
}

export interface SurfaceHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly lightPool: LightPool;
  readonly post: MoonPostHandle;
  readonly perf: MoonPerf;
  readonly mount: HTMLElement;
  /** The preset the scene was built on; `lite` is what the builders read. */
  readonly quality: QualityProfile;
  readonly lite: boolean;
  /** Programs are compiled and frames are being drawn. */
  readonly ready: boolean;
  readonly paused: boolean;
  /** Keep the shadow box on the crew, one texel at a time, so its edges never crawl. */
  followShadow: (crew: THREE.Vector3, sunDir: THREE.Vector3) => void;
  /** Compile every program, then run `frame` once per drawn frame. */
  start: (frame: (dt: number) => void, onReady: () => void) => void;
  /** Draw through the post chain, inside the frame accounting. */
  render: (dt: number) => void;
  setPaused: (on: boolean) => void;
  /** Development: draw calls per scene layer. */
  probe: (within?: string) => Record<string, number>;
  /** Stop, unhook, remove the canvas; `release` runs once the compile has settled, before the renderer goes. */
  dispose: (release: () => void) => void;
}

const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.22;

export function makeSurfaceHost(mount: HTMLElement, opts: SurfaceHostOptions): SurfaceHost {
  const buildStart = performance.now();
  const quality = currentQuality();
  const lite = quality.lite;
  // MSAA lives on the composer's target (moon-post); the default framebuffer
  // only ever receives the final quad, so it needs none of its own.
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  const ratioFor = (q: QualityProfile) => Math.min(window.devicePixelRatio, q.maxPixelRatio);
  let maxRatio = ratioFor(quality);
  renderer.setPixelRatio(maxRatio);
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure;
  renderer.shadowMap.enabled = quality.shadowMapSize > 0;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(opts.clearColor, 1);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(getSettings().fov, mount.clientWidth / mount.clientHeight, opts.near, opts.far);

  const sun = new THREE.DirectionalLight(opts.sun.color, opts.sun.intensity);
  sun.castShadow = true;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = SHADOW_BIAS;
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  let shadowTexel = 1;
  const fitShadow = (q: QualityProfile) => {
    const size = Math.max(1, q.shadowMapSize);
    sun.shadow.mapSize.set(size, size);
    const sr = q.shadowRadius;
    sun.shadow.camera.left = -sr; sun.shadow.camera.right = sr; sun.shadow.camera.top = sr; sun.shadow.camera.bottom = -sr;
    sun.shadow.camera.updateProjectionMatrix();
    shadowTexel = (sr * 2) / size;
  };
  fitShadow(quality);
  scene.add(sun);
  scene.add(sun.target);
  const lightPool = makeLightPool(2);
  for (const l of lightPool.lights) scene.add(l);
  const shadowU = new THREE.Vector3();
  const shadowV = new THREE.Vector3();

  const post = makeMoonPost(renderer, scene, camera, quality);
  const pinned = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('fixedpx');
  const perf = makeMoonPerf(renderer, mount, {
    minRatio: pinned ? maxRatio : Math.min(1, maxRatio),
    maxRatio,
    onPixelRatio: (r) => { renderer.setPixelRatio(r); post.setSize(mount.clientWidth, mount.clientHeight); },
  });

  // ── A new preset, live: the pixel ratio, the shadow map, the post chain. ──
  const unsubQuality = onQualityChange((q) => {
    maxRatio = ratioFor(q);
    perf.setRatioBounds(pinned ? maxRatio : Math.min(1, maxRatio), maxRatio);
    renderer.setPixelRatio(maxRatio);
    fitShadow(q);
    // The old map is the old size: drop it and three allocates the new one.
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    renderer.shadowMap.enabled = q.shadowMapSize > 0;
    post.setQuality(q);
    post.setSize(mount.clientWidth, mount.clientHeight);
  });

  let raf = 0;
  let last = performance.now();
  let docVisible = !document.hidden;
  let contextLost = false;
  let paused = false;
  let ready = false;
  let disposed = false;
  let frameFn: ((dt: number) => void) | null = null;
  const resume = () => {
    last = performance.now();
    perf.resume();
    if (docVisible && !paused && !raf && ready && !contextLost && frameFn) raf = requestAnimationFrame(loop);
  };
  const onVis = () => {
    docVisible = !document.hidden;
    if (docVisible) resume();
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
    if (!docVisible || paused || !frameFn) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    perf.begin(now);
    frameFn(dt);
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

  let compiling: Promise<unknown> = Promise.resolve();
  const host: SurfaceHost = {
    renderer, scene, camera, sun, lightPool, post, perf, mount, quality, lite,
    get ready() { return ready; },
    get paused() { return paused; },
    followShadow(crew, sunDir) {
      shadowU.crossVectors(THREE.Object3D.DEFAULT_UP, sunDir).normalize();
      shadowV.crossVectors(sunDir, shadowU);
      const su = Math.round(crew.dot(shadowU) / shadowTexel) * shadowTexel;
      const sv = Math.round(crew.dot(shadowV) / shadowTexel) * shadowTexel;
      sun.target.position.copy(shadowU).multiplyScalar(su).addScaledVector(shadowV, sv).addScaledVector(sunDir, crew.dot(sunDir));
      sun.position.copy(sun.target.position).addScaledVector(sunDir, 220);
    },
    start(frame, onReady) {
      frameFn = frame;
      // Compile every program before the first frame — in parallel where the
      // driver allows it — so the descent does not open on a long stall.
      // Hidden props are shown for the compile so they cannot stall later.
      const hiddenForCompile: THREE.Object3D[] = [];
      scene.traverse((o) => { if (!o.visible) { hiddenForCompile.push(o); o.visible = true; } });
      const begin = () => {
        for (const o of hiddenForCompile) o.visible = false;
        perf.setBuildMs(performance.now() - buildStart);
        if (disposed || raf || contextLost) return;
        ready = true;
        onReady();
        resume();
      };
      compiling = renderer.compileAsync(scene, camera);
      compiling.then(begin, begin);
    },
    render(dt) {
      perf.mark();
      post.render(dt);
      perf.end();
    },
    setPaused(on) {
      if (paused === on) return;
      paused = on;
      if (on && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!on) resume();
    },
    probe: (within) => probeCalls(renderer, post.scene(), () => post.render(0), within),
    dispose(release) {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      perf.dispose();
      unsubQuality();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      // The GPU side goes once the async compile has settled: three keeps
      // polling the programs it is compiling, and they must still exist.
      const finish = () => {
        release();
        sun.shadow.dispose();
        for (const l of lightPool.lights) l.dispose();
        post.dispose();
        scene.environment?.dispose();
        renderer.dispose();
        // Give the context back now rather than when the canvas is collected:
        // the next surface and the orrery each want one of their own.
        renderer.forceContextLoss();
      };
      compiling.then(finish, finish);
    },
  };
  return host;
}
