// The whole planet under a surface scene, drawn behind it: what the crew see
// of the world from orbit, from inside the air on the way down, and past the
// edge of the walkable ground once they are on it.
//
// The globe lives in its own scene, in kilometres, planet at the origin,
// body-fixed (planet-frame.ts). It never shares a depth buffer with the
// surface scene: the post chain draws the sky, then the globe, then the
// surface scene over both with the depth cleared in between (moon-post
// `setLayers`), so a sphere thousands of kilometres across and a bootprint
// a centimetre deep are each drawn at their own precision.
//
// This first version is one lit, textured sphere. The level-of-detail globe
// (planet-globe-tiles.ts) replaces what is inside `makePlanetGlobe` and keeps
// this interface.

import * as THREE from 'three';
import type { QualityProfile } from '@/game/quality';
import { makePlanetTextureLoader, disposePlanetTexture } from '@/lib/solar-system/texture-load';
import {
  PLANET_BODIES, siteBasis, localDirToGlobe, type GlobeWorld, type PlanetBody, type SiteBasis,
} from '@/lib/solar-system/planet-frame';

export interface GlobeOptions {
  quality: QualityProfile;
  lite: boolean;
  /** Unit vector toward the sun in the surface scene's local frame. */
  sunDir: THREE.Vector3;
  /** Local ground colour near the site (linear RGB), blended into the globe's
   *  own colour close in so the edge of the walkable ground does not show. */
  siteColor?: [number, number, number];
}

export interface PlanetGlobe {
  readonly world: GlobeWorld;
  readonly body: PlanetBody;
  readonly basis: SiteBasis;
  /** Kilometres, planet at the origin. */
  readonly scene: THREE.Scene;
  /** Follows the surface camera through `sync`. */
  readonly camera: THREE.PerspectiveCamera;
  /** Put the globe camera where the surface camera is: same view, in km,
   *  with near and far fitted to the altitude. Call once per frame, after the
   *  surface camera has moved and before the frame is drawn. */
  sync: (local: THREE.PerspectiveCamera) => void;
  /** Where the surface scene's own ground ends, m from the site: inside it
   *  the globe's ground is never seen, and the globe may skip it. */
  setPatch: (radiusM: number) => void;
  /** The sun moved (local frame, unit). */
  setSun: (localDir: THREE.Vector3) => void;
  /** Detail and streaming; cloud drift. */
  update: (dt: number) => void;
  /** Height of the globe's ground above the reference sphere at a local
   *  point's latitude and longitude, m (what the globe draws there). */
  groundHeightAt: (localX: number, localZ: number) => number;
  /** Development: draw calls, tiles, streamed tiles. */
  stats: () => Record<string, number>;
  dispose: () => void;
}

const MAPS: Record<GlobeWorld, string> = {
  moon: '/solar-system/planets/moon-4k.jpg',
  mars: '/solar-system/planets/mars-4k.jpg',
  earth: '/solar-system/planets/earth-4k.jpg',
};

export function makePlanetGlobe(world: GlobeWorld, opts: GlobeOptions): PlanetGlobe {
  const body = PLANET_BODIES[world];
  const basis = siteBasis(body);
  const scene = new THREE.Scene();
  scene.name = `globe-${world}`;
  const camera = new THREE.PerspectiveCamera(60, 1, 1, 1e5);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.02));
  const setSun = (localDir: THREE.Vector3) => {
    localDirToGlobe(basis, localDir, sun.position).multiplyScalar(body.radiusKm * 10);
  };
  setSun(opts.sunDir);

  // Equirectangular maps wrap longitude round +Z (three's sphere puts the
  // seam at −X and the poles on ±Y), so the mesh is turned to the body frame.
  const geom = new THREE.SphereGeometry(body.radiusKm, opts.lite ? 96 : 192, opts.lite ? 48 : 96);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = -Math.PI / 2;
  mesh.frustumCulled = false;
  scene.add(mesh);
  let disposed = false;
  makePlanetTextureLoader().load(MAPS[world], (tex) => {
    if (disposed) { disposePlanetTexture(tex); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mat.map = tex;
    mat.needsUpdate = true;
  }, () => { /* the plain sphere stays */ });

  const localPos = new THREE.Vector3();
  const sync = (local: THREE.PerspectiveCamera) => {
    local.getWorldPosition(localPos);
    camera.position.copy(localPos).applyMatrix4(basis.localToGlobe);
    local.getWorldQuaternion(camera.quaternion);
    camera.quaternion.premultiply(basis.rotation);
    camera.fov = local.fov;
    camera.aspect = local.aspect;
    const alt = Math.max(0.001, camera.position.length() - body.radiusKm);
    camera.near = Math.max(0.005, alt * 0.25);
    camera.far = Math.sqrt(alt * (2 * body.radiusKm + alt)) + body.radiusKm * 1.2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };

  return {
    world, body, basis, scene, camera, sync,
    setPatch() { /* the plain sphere draws everything */ },
    setSun,
    update() { /* nothing streams yet */ },
    groundHeightAt: () => 0,
    stats: () => ({ tiles: 1, calls: 1, streamed: 0 }),
    dispose() {
      disposed = true;
      geom.dispose();
      disposePlanetTexture(mat.map);
      mat.dispose();
    },
  };
}
