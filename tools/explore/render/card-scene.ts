/**
 * Browser half of the card renderer. Builds one object from the Explore Mode
 * materials on a black ground, renders it once at a fixed time, and hands the
 * frame back as WebP. Driven by tools/explore/render-card.ts.
 *
 * The Explore shaders assume the Sun sits at the scene origin (ring shadow,
 * ring lighting), so the object is placed away from the origin along the
 * chosen sun direction rather than moving the light.
 */
import './seed';
import * as THREE from 'three';
import { worldRadiusForBody, type SolarBodyId } from '@/lib/solar-system/ephemeris';
import { AXIAL_TILT_DEG } from '@/lib/solar-system/planet-spin';
import { NASA_PLANET_DETAIL_URL, NASA_PLANET_TEXTURE_URL } from '@/lib/solar-system/planet-texture-urls';
import { createPlanetMaterial, tickPlanetMaterial } from '@/lib/solar-system/planet-textures';
import { makeSaturnParticleRings } from '@/lib/solar-system/scene-extras';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type CardObjectId = SolarBodyId | 'europa';

export interface CardSceneConfig {
  object: CardObjectId;
  width: number;
  height: number;
  /** Render at this multiple of the output size, then downsample. */
  supersample: number;
  seed: number;
  /** Fixed shader time (seconds) for the animated cloud bands and ring drift. */
  time: number;
  camera: {
    /** Degrees around the object's world Y axis. */
    azimuth: number;
    /** Degrees above the ecliptic plane. */
    elevation: number;
    /** Distance from the object's centre, in object radii. */
    distance: number;
    /** Vertical field of view, degrees. */
    fov: number;
    /** Vertical offset of the object in the frame, as a fraction of the frame height (+ is up). */
    offsetY: number;
  };
  lighting: {
    /** Sun azimuth relative to the camera, degrees. 0 = behind the camera (full phase). */
    azimuth: number;
    elevation: number;
    intensity: number;
    ambient: number;
    exposure: number;
  };
  /** Object spin about its own pole, degrees — chooses which face is shown. */
  spin: number;
  /** Saturn only: the additive ice-particle sparkle Explore draws over the ring plane. */
  ringParticles: boolean;
  quality: number;
}

const SUN_DISTANCE = 40;

const OBLATENESS: Partial<Record<CardObjectId, number>> = {
  jupiter: 0.935,
  saturn: 0.902,
  uranus: 0.977,
  neptune: 0.983,
};

/** Explore draws Europa as an untextured sphere (scene-extras MOON_SPECS). */
const EUROPA = { radius: worldRadiusForBody('jupiter') * 0.022, color: 0xd9cebb, roughness: 0.55 };

function dir(azDeg: number, elDeg: number): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azDeg);
  const el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}

async function loadMap(loader: THREE.TextureLoader, url: string, maxAniso: number) {
  const tex = await loader.loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(16, maxAniso);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

async function renderCard(cfg: CardSceneConfig): Promise<string> {
  const W = cfg.width * cfg.supersample;
  const H = cfg.height * cfg.supersample;

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.lighting.exposure;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();

  // Sun at the origin; the object sits opposite the sun direction.
  const camDir = dir(cfg.camera.azimuth, cfg.camera.elevation);
  const sunDir = dir(cfg.camera.azimuth + cfg.lighting.azimuth, cfg.lighting.elevation);
  const center = sunDir.clone().multiplyScalar(-SUN_DISTANCE);

  const sun = new THREE.PointLight(0xfff4e0, cfg.lighting.intensity, 0, 0);
  scene.add(sun);
  if (cfg.lighting.ambient > 0) scene.add(new THREE.AmbientLight(0x33405e, cfg.lighting.ambient));

  let radius: number;
  let mesh: THREE.Mesh;
  let material: THREE.Material;

  if (cfg.object === 'europa') {
    radius = EUROPA.radius;
    material = new THREE.MeshStandardMaterial({ color: EUROPA.color, roughness: EUROPA.roughness, metalness: 0.02 });
    mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 128), material);
  } else {
    const id = cfg.object;
    radius = worldRadiusForBody(id);
    const url = NASA_PLANET_DETAIL_URL[id] ?? NASA_PLANET_TEXTURE_URL[id];
    const tex = await loadMap(loader, url, maxAniso);
    material = createPlanetMaterial(id, false, tex);
    const geom = new THREE.SphereGeometry(radius, 256, 256);
    const oblate = OBLATENESS[id] ?? 1;
    if (oblate !== 1) geom.scale(1, oblate, 1);
    mesh = new THREE.Mesh(geom, material);
    mesh.rotation.order = 'ZYX';
    mesh.rotation.z = THREE.MathUtils.degToRad(AXIAL_TILT_DEG[id]);
  }
  mesh.rotation.y = THREE.MathUtils.degToRad(cfg.spin);
  mesh.position.copy(center);
  scene.add(mesh);

  if (cfg.object === 'saturn') {
    const rings = makeSaturnParticleRings(radius, false);
    rings.group.rotation.z = THREE.MathUtils.degToRad(AXIAL_TILT_DEG.saturn);
    rings.group.position.copy(center);
    const particles = rings.group.getObjectByName('saturnParticleRings');
    if (particles) particles.visible = cfg.ringParticles;
    rings.update(cfg.time);
    scene.add(rings.group);
  }

  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, W / H, radius * 0.1, radius * 1000);
  camera.position.copy(center).addScaledVector(camDir, radius * cfg.camera.distance);
  camera.lookAt(center);
  if (cfg.camera.offsetY) camera.setViewOffset(W, H, 0, cfg.camera.offsetY * H, W, H);
  camera.updateProjectionMatrix();

  // Explore's own chain (post-processing.ts) minus the bloom pass: render
  // linear HDR, then tone-map and encode once in OutputPass. The ring
  // ShaderMaterials write linear colour and rely on that final pass.
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  // First frame compiles the materials (and installs the shader hooks); then
  // fix the shader time and draw the frame that is kept.
  composer.render(0);
  tickPlanetMaterial(material, cfg.time);
  composer.render(0);

  const out = document.createElement('canvas');
  out.width = cfg.width;
  out.height = cfg.height;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, cfg.width, cfg.height);
  return out.toDataURL('image/webp', cfg.quality);
}

declare global {
  interface Window {
    __renderCard?: () => Promise<string>;
  }
}

window.__renderCard = () => renderCard(window.__CARD__ as CardSceneConfig);
