'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  bodyColor,
  sampleSolarSystem,
  worldRadiusForBody,
  type ScaleMode,
  type SolarBodyId,
} from '@/lib/solar-system/ephemeris';
import { siderealSpinY } from '@/lib/solar-system/planet-spin';
import { NASA_PLANET_TEXTURE_URL, NASA_TEXTURE_IDS } from '@/lib/solar-system/planet-texture-urls';
import { createPlanetMaterial, disposePlanetMaterial } from '@/lib/solar-system/planet-textures';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import {
  makeOrbitRings,
  disposeOrbitRings,
  makeAsteroidBelt,
  makeKuiperBelt,
  makeEarthExtras,
  makeEarthOrbitals,
  makeAtmosphereShell,
  disposeAtmosphereShell,
  makeSunExtras,
  makeMilkyWayBand,
  disposeMilkyWayBand,
  makeSaturnParticleRings,
  makePlanetMoons,
  makeComet,
  type BeltHandle,
  type EarthExtrasHandle,
  type EarthOrbitalHandle,
  type SunExtrasHandle,
  type SaturnRingsHandle,
  type PlanetMoonsHandle,
  type CometHandle,
} from '@/lib/solar-system/scene-extras';
import {
  makeNearbyStars,
  makeMilkyWayDisk,
  makeOtherGalaxies,
  tierBlendFromRadius,
} from '@/lib/solar-system/galactic-scene';

export interface CosmicView {
  /** 0..1 — how zoomed into the solar system the camera is (1 = close). */
  solar: number;
  /** 0..1 — stellar neighbourhood layer presence. */
  stellar: number;
  /** 0..1 — Milky Way disk layer presence. */
  galactic: number;
  /** 0..1 — other-galaxy backdrop presence. */
  universe: number;
  /** Sun projected to screen-space CSS pixels (null = off-screen / behind camera). */
  sunScreen: { x: number; y: number; depth: number } | null;
  /** Milky Way label projected to screen (null when galactic tier hidden). */
  milkyWayScreen: { x: number; y: number; depth: number } | null;
}

export interface SolarSystemCanvasProps {
  epochMs: number;
  scaleMode: ScaleMode;
  includePluto: boolean;
  selectedId: SolarBodyId | null;
  /** When set, camera orbits this body at low altitude (system view when null). */
  focusBodyId: SolarBodyId | null;
  onSelect: (id: SolarBodyId | null) => void;
  /** Streams the cosmic tier blend + projected anchor screen positions every frame. */
  onCosmicView?: (view: CosmicView) => void;
  /** Fired when the user clicks the Milky Way disk at the galactic tier —
   *  the page then animates the camera back into the solar system. */
  onZoomToSun?: () => void;
  /** Imperative zoom target: if non-null, the canvas eases `sysRadius` toward this value. */
  zoomTo?: number | null;
  onZoomToConsumed?: () => void;
}

/** Project a world-space point onto CSS pixel coords. Returns null when the
 *  point is behind the camera so the overlay can hide its anchor. */
function projectToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  cssWidth: number,
  cssHeight: number,
): { x: number; y: number; depth: number } | null {
  const v = worldPos.clone().project(camera);
  if (v.z > 1 || v.z < -1) return null;
  return {
    x: (v.x * 0.5 + 0.5) * cssWidth,
    y: (-v.y * 0.5 + 0.5) * cssHeight,
    depth: v.z,
  };
}

function localToScreen(
  local: THREE.Vector3,
  parent: THREE.Object3D,
  camera: THREE.Camera,
  cssWidth: number,
  cssHeight: number,
): { x: number; y: number; depth: number } | null {
  const world = local.clone();
  parent.updateMatrixWorld();
  world.applyMatrix4(parent.matrixWorld);
  return projectToScreen(world, camera, cssWidth, cssHeight);
}

function disposeMat(m: THREE.Material) {
  if (m instanceof THREE.MeshStandardMaterial) disposePlanetMaterial(m);
  else m.dispose();
}

function disposeMeshTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach(disposeMat);
      else disposeMat(m);
    } else if (obj instanceof THREE.Points) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material).dispose();
    } else if (obj instanceof THREE.Sprite) {
      const m = obj.material as THREE.SpriteMaterial;
      m.map?.dispose();
      m.dispose();
    }
  });
}

/**
 * Three.js solar system: ephemeris, pinch zoom, invisible pick spheres,
 * low-orbit camera around `focusBodyId`, hero equirectangular textures when available.
 */
export function SolarSystemCanvas({
  epochMs,
  scaleMode,
  includePluto,
  selectedId,
  focusBodyId,
  onSelect,
  onCosmicView,
  onZoomToSun,
  zoomTo,
  onZoomToConsumed,
}: SolarSystemCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(epochMs);
  const scaleRef = useRef(scaleMode);
  const plutoRef = useRef(includePluto);
  const selectedRef = useRef(selectedId);
  const focusRef = useRef(focusBodyId);
  const onSelectRef = useRef(onSelect);
  const onCosmicViewRef = useRef(onCosmicView);
  const onZoomToSunRef = useRef(onZoomToSun);
  const zoomToRef = useRef(zoomTo);
  const onZoomToConsumedRef = useRef(onZoomToConsumed);

  epochRef.current = epochMs;
  scaleRef.current = scaleMode;
  plutoRef.current = includePluto;
  selectedRef.current = selectedId;
  focusRef.current = focusBodyId;
  onSelectRef.current = onSelect;
  onCosmicViewRef.current = onCosmicView;
  onZoomToSunRef.current = onZoomToSun;
  zoomToRef.current = zoomTo;
  onZoomToConsumedRef.current = onZoomToConsumed;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    type NavWithConn = Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    const conn = (navigator as NavWithConn).connection;
    const lowData = !!conn && (conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
    const lite = isMobile || lowData;

    const renderer = new THREE.WebGLRenderer({
      antialias: !lite,
      alpha: false,
      // 'default' avoids pinning the discrete GPU on for the tab's lifetime on
      // dual-GPU laptops (macOS), which keeps the machine hot/slow.
      powerPreference: 'default',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.5 : 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x01030a, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    // Far plane is large enough to keep distant galaxies in view at the
    // intergalactic tier (~10k units out).
    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.02,
      24000,
    );

    let sysTheta = 0.72;
    let sysPhi = 1.02;
    let sysRadius = isMobile ? 20 : 26;

    let orbTheta = 0.5;
    let orbPhi = 0.95;
    let orbDist = 2.4;

    const vTarget = new THREE.Vector3();
    const vOffset = new THREE.Vector3();
    const vZero = new THREE.Vector3();

    const updateSystemCamera = () => {
      const st = Math.sin(sysPhi);
      camera.position.set(
        sysRadius * st * Math.cos(sysTheta),
        sysRadius * Math.cos(sysPhi),
        sysRadius * st * Math.sin(sysTheta),
      );
      camera.lookAt(0, 0, 0);
    };

    const updateOrbitCamera = (target: THREE.Vector3, pr: number) => {
      const minD = Math.max(pr * 1.05, 0.06);
      const maxD = Math.max(pr * 110, 8);
      orbDist = THREE.MathUtils.clamp(orbDist, minD, maxD);
      const st = Math.sin(orbPhi);
      vOffset.set(
        orbDist * st * Math.cos(orbTheta),
        orbDist * Math.cos(orbPhi),
        orbDist * st * Math.sin(orbTheta),
      );
      camera.position.copy(target).add(vOffset);
      camera.lookAt(target);
    };

    updateSystemCamera();

    // Space lighting: the sun is the only real source. The ambient + fill
    // are dialled way down so the night side of each planet reads truly
    // dark and the terminator stays sharp.
    scene.add(new THREE.AmbientLight(0x0a0e1c, 0.08));
    const key = new THREE.DirectionalLight(0xfff0dd, 0.06);
    key.position.set(12, 8, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a8cc8, 0.04);
    fill.position.set(-18, -6, -10);
    scene.add(fill);
    const sunLight = new THREE.PointLight(0xfff4e0, 5.4, 380, 1.1);
    sunLight.name = 'sunLight';
    scene.add(sunLight);

    const starSprite = softSpriteTexture();

    const STAR_N = lite ? 1200 : 4800;
    const starPos = new Float32Array(STAR_N * 3);
    const starCol = new Float32Array(STAR_N * 3);
    // Spectral classes — rough population mix: most stars are cool M/K (red/orange),
    // fewer are hot O/B (blue). Gives the sky a real, varied tint.
    const SPECTRAL = [
      { weight: 0.04, r: 0.66, g: 0.78, b: 1.00 }, // O/B — blue
      { weight: 0.10, r: 0.84, g: 0.90, b: 1.00 }, // A — blue-white
      { weight: 0.18, r: 0.98, g: 0.98, b: 1.00 }, // F — white
      { weight: 0.18, r: 1.00, g: 0.96, b: 0.84 }, // G — sun yellow
      { weight: 0.25, r: 1.00, g: 0.86, b: 0.66 }, // K — warm orange
      { weight: 0.25, r: 1.00, g: 0.70, b: 0.52 }, // M — red
    ];
    const pickSpectral = () => {
      let r = Math.random();
      for (const s of SPECTRAL) {
        if (r < s.weight) return s;
        r -= s.weight;
      }
      return SPECTRAL[SPECTRAL.length - 1];
    };
    for (let i = 0; i < STAR_N; i++) {
      const u = Math.random();
      const v = Math.random();
      const t = 2 * Math.PI * u;
      const p = Math.acos(2 * v - 1);
      const r = 120 + Math.random() * 180;
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
      const sp = pickSpectral();
      const c = 0.45 + Math.random() * 0.55;
      starCol[i * 3] = sp.r * c;
      starCol[i * 3 + 1] = sp.g * c;
      starCol[i * 3 + 2] = sp.b * c;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        map: starSprite,
        size: lite ? 0.14 : 0.11,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.02,
      }),
    );
    scene.add(stars);

    const milkyWay = makeMilkyWayBand(lite);
    scene.add(milkyWay);

    // Galactic-tier layers — start fully faded; the per-frame loop dials
    // them up as the camera radius grows past the solar-system tier.
    const nearbyStars = makeNearbyStars(lite);
    nearbyStars.setFade(0);
    scene.add(nearbyStars.group);

    const galaxyDisk = makeMilkyWayDisk();
    galaxyDisk.setFade(0);
    scene.add(galaxyDisk.group);

    const otherGalaxies = makeOtherGalaxies();
    otherGalaxies.setFade(0);
    scene.add(otherGalaxies.group);

    const orbitRings = makeOrbitRings(scaleRef.current, plutoRef.current);
    scene.add(orbitRings);

    const asteroidBelt: BeltHandle = makeAsteroidBelt(scaleRef.current, lite);
    scene.add(asteroidBelt.group);

    const kuiperBelt: BeltHandle = makeKuiperBelt(scaleRef.current, lite);
    scene.add(kuiperBelt.group);

    const comet: CometHandle = makeComet(scaleRef.current, lite);
    scene.add(comet.group);

    const sunExtras: SunExtrasHandle = makeSunExtras(worldRadiusForBody('sun'));
    scene.add(sunExtras.group);

    let earthExtras: EarthExtrasHandle | null = null;
    let earthOrbitals: EarthOrbitalHandle | null = null;
    let saturnRings: SaturnRingsHandle | null = null;
    const atmosphereShells = new Map<SolarBodyId, THREE.Mesh>();

    const bodies = new THREE.Group();
    scene.add(bodies);

    const planetMoons: PlanetMoonsHandle = makePlanetMoons(lite);
    bodies.add(planetMoons.group);

    const meshById = new Map<SolarBodyId, THREE.Mesh>();
    const hitById = new Map<SolarBodyId, THREE.Mesh>();

    const textureById = new Map<SolarBodyId, THREE.Texture>();
    let textureLoadsCancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const applyLoadedTexture = (id: SolarBodyId, tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(16, maxAniso);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textureById.set(id, tex);
      const mesh = meshById.get(id);
      if (mesh) {
        disposeMat(mesh.material as THREE.Material);
        mesh.material = createPlanetMaterial(id, lite, tex);
      }
    };

    for (const id of NASA_TEXTURE_IDS) {
      const url = NASA_PLANET_TEXTURE_URL[id];
      loader.load(
        url,
        (tex) => {
          if (textureLoadsCancelled) {
            tex.dispose();
            return;
          }
          applyLoadedTexture(id, tex);
        },
        undefined,
        () => {
          if (textureLoadsCancelled) return;
          const mesh = meshById.get(id);
          if (mesh) {
            disposeMat(mesh.material as THREE.Material);
            mesh.material = createPlanetMaterial(id, lite, null);
          }
        },
      );
    }

    const hitPickRadiusMul = 4.2;

    let lastFocus: SolarBodyId | null = null;

    const makeBodyMesh = (id: SolarBodyId): THREE.Mesh => {
      const r = worldRadiusForBody(id);
      const segs =
        id === 'saturn' ? (lite ? 80 : 128) :
        lite ? 64 : 96;
      const geom = new THREE.SphereGeometry(r, segs, segs);
      const mat = createPlanetMaterial(id, lite, textureById.get(id) ?? null);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.bodyId = id;
      return mesh;
    };

    const syncMeshes = () => {
      const samples = sampleSolarSystem(
        new Date(epochRef.current),
        scaleRef.current,
        plutoRef.current,
      );
      const ids = new Set(samples.map((s) => s.id));

      for (const id of Array.from(meshById.keys())) {
        if (!ids.has(id)) {
          const m = meshById.get(id);
          const h = hitById.get(id);
          if (m) {
            bodies.remove(m);
            disposeMeshTree(m);
            meshById.delete(id);
          }
          if (h) {
            bodies.remove(h);
            h.geometry.dispose();
            (h.material as THREE.Material).dispose();
            hitById.delete(id);
          }
          atmosphereShells.delete(id);
          if (id === 'earth' && earthExtras) {
            bodies.remove(earthExtras.moonGroup);
            earthExtras.dispose();
            earthExtras = null;
            if (earthOrbitals) {
              bodies.remove(earthOrbitals.group);
              earthOrbitals.dispose();
              earthOrbitals = null;
            }
          }
          if (id === 'saturn' && saturnRings) {
            bodies.remove(saturnRings.group);
            saturnRings.dispose();
            saturnRings = null;
          }
        }
      }

      for (const s of samples) {
        let mesh = meshById.get(s.id);
        let hit = hitById.get(s.id);
        if (!mesh) {
          mesh = makeBodyMesh(s.id);
          meshById.set(s.id, mesh);
          bodies.add(mesh);

          const hRad = Math.max(worldRadiusForBody(s.id) * hitPickRadiusMul, 0.22);
          const hGeom = new THREE.SphereGeometry(hRad, 20, 20);
          const hMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          hit = new THREE.Mesh(hGeom, hMat);
          hit.userData.bodyId = s.id;
          hitById.set(s.id, hit);
          bodies.add(hit);

          if (s.id === 'sun') {
            const sunR = worldRadiusForBody('sun');
            const glowLayers = [
              { scale: 1.22, opacity: 0.18, color: 0xffb347 },
              { scale: 1.5, opacity: 0.08, color: 0xffa040 },
              { scale: 2.1, opacity: 0.03, color: 0xff8030 },
            ];
            for (const layer of glowLayers) {
              const shell = new THREE.Mesh(
                new THREE.SphereGeometry(sunR * layer.scale, 32, 32),
                new THREE.MeshBasicMaterial({
                  color: layer.color,
                  transparent: true,
                  opacity: layer.opacity,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending,
                }),
              );
              shell.name = 'sunGlow';
              mesh.add(shell);
            }
          }

          if (s.id === 'earth' && !earthExtras) {
            const er = worldRadiusForBody('earth');
            earthExtras = makeEarthExtras(er, lite);
            mesh.add(earthExtras.cloudMesh);
            mesh.add(earthExtras.atmosphereMesh);
            // Moon group attached at scene level so it doesn't inherit Earth's spin.
            bodies.add(earthExtras.moonGroup);
            // Satellites + debris orbiting Earth in an inertial frame.
            earthOrbitals = makeEarthOrbitals(er, lite);
            bodies.add(earthOrbitals.group);
          }

          if ((s.id === 'venus' || s.id === 'mars') && !atmosphereShells.has(s.id)) {
            const pr = worldRadiusForBody(s.id);
            const color = s.id === 'venus' ? 0xffd9a0 : 0xff8c5a;
            const intensity = s.id === 'venus' ? 1.3 : 0.85;
            const shell = makeAtmosphereShell(pr, color, 1.05, intensity, 2.6);
            atmosphereShells.set(s.id, shell);
            mesh.add(shell);
          }

          if ((s.id === 'uranus' || s.id === 'neptune') && !atmosphereShells.has(s.id)) {
            const pr = worldRadiusForBody(s.id);
            const color = s.id === 'uranus' ? 0x9fe6ec : 0x6f93ff;
            const shell = makeAtmosphereShell(pr, color, 1.045, 1.05, 2.4);
            atmosphereShells.set(s.id, shell);
            mesh.add(shell);
          }

          if (s.id === 'jupiter' && !atmosphereShells.has('jupiter')) {
            const pr = worldRadiusForBody('jupiter');
            const shell = makeAtmosphereShell(pr, 0xffd9a8, 1.035, 0.85, 2.8);
            atmosphereShells.set('jupiter', shell);
            mesh.add(shell);
          }

          if (s.id === 'saturn' && !saturnRings) {
            const sr = worldRadiusForBody('saturn');
            const tilt = THREE.MathUtils.degToRad(26.7);
            mesh.rotation.z = tilt;
            saturnRings = makeSaturnParticleRings(sr, lite);
            saturnRings.group.rotation.z = tilt;
            // Rings sit at scene level so they don't inherit Saturn's spin.
            bodies.add(saturnRings.group);
          }
        }
        mesh.position.copy(s.position);
        hit!.position.copy(s.position);
      }

      const sel = selectedRef.current;
      meshById.forEach((mesh, id) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = bodyColor(id);
        const isSel = sel === id;
        if (id === 'sun') {
          mat.emissive.setHex(base);
          mat.emissiveIntensity = isSel ? 1.55 : 1.25;
        } else {
          mat.emissive.setHex(isSel ? base : 0x000000);
          mat.emissiveIntensity = isSel ? 0.2 : 0;
        }
        mesh.scale.setScalar(isSel ? 1.08 : 1);
      });

      const focus = focusRef.current;
      if (focus && focus !== lastFocus) {
        lastFocus = focus;
        const pr = worldRadiusForBody(focus);
        orbDist = Math.max(pr * 5.5, 1.1);
        orbTheta = 0.65;
        orbPhi = 1.05;
      }
      if (!focus) lastFocus = null;
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    // Cosmic tier blend, updated each frame from the camera's sysRadius.
    // Used both for fading the galactic layers and for gating picking.
    let currentTier = tierBlendFromRadius(sysRadius);

    const pick = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      // At the galactic tier the Milky Way disk is the only selectable
      // object — tapping it kicks the camera back into the solar system.
      // We use the live tier blend so the disk isn't pickable when it's
      // still mostly faded out.
      if (galaxyDisk.group.visible && currentTier.galactic > 0.5) {
        const galaxyHit = raycaster.intersectObject(galaxyDisk.pickTarget, false);
        if (galaxyHit.length > 0) {
          onZoomToSunRef.current?.();
          return;
        }
      }
      const hits = raycaster.intersectObjects([...hitById.values()], false);
      const first = hits[0]?.object as THREE.Mesh | undefined;
      const id = (first?.userData.bodyId as SolarBodyId | undefined) ?? null;
      onSelectRef.current(id);
    };

    let drag = false;
    let downOk = false;
    let lx = 0;
    let ly = 0;
    let downX = 0;
    let downY = 0;

    let pinchActive = false;
    let lastPinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      downOk = true;
      drag = true;
      downX = lx = e.clientX;
      downY = ly = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (!drag) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      const focus = focusRef.current;
      if (focus) {
        orbTheta += dx * 0.006;
        orbPhi = THREE.MathUtils.clamp(orbPhi - dy * 0.005, 0.12, Math.PI - 0.08);
      } else {
        sysTheta += dx * 0.0055;
        sysPhi = THREE.MathUtils.clamp(sysPhi - dy * 0.0045, 0.18, Math.PI - 0.12);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (downOk && drag) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 8) pick(e.clientX, e.clientY);
      }
      downOk = false;
      drag = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(e.deltaY * 0.0011);
      if (focusRef.current) {
        orbDist *= f;
      } else {
        sysRadius *= f;
        // Extended clamp — the upper bound passes through the stellar
        // neighbourhood, the Milky Way disk, and out into the
        // intergalactic backdrop.
        sysRadius = THREE.MathUtils.clamp(sysRadius, 5.2, 11000);
      }
    };

    const touchDist = (t: TouchList) => {
      if (t.length < 2) return 0;
      const a = t[0];
      const b = t[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchActive = true;
        lastPinchDist = touchDist(e.touches);
        drag = false;
        downOk = false;
      } else if (e.touches.length === 1) {
        pinchActive = false;
        lastPinchDist = 0;
        downOk = true;
        drag = true;
        const t = e.touches[0];
        downX = lx = t.clientX;
        downY = ly = t.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const d = touchDist(e.touches);
        if (lastPinchDist > 4 && d > 4) {
          const factor = d / lastPinchDist;
          if (focusRef.current) orbDist = THREE.MathUtils.clamp(orbDist / factor, 0.04, 420);
          else sysRadius = THREE.MathUtils.clamp(sysRadius / factor, 5.2, 11000);
        }
        lastPinchDist = d;
        pinchActive = true;
        e.preventDefault();
        return;
      }
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - lx;
      const dy = t.clientY - ly;
      lx = t.clientX;
      ly = t.clientY;
      const focus = focusRef.current;
      if (focus) {
        orbTheta += dx * 0.0065;
        orbPhi = THREE.MathUtils.clamp(orbPhi - dy * 0.0055, 0.12, Math.PI - 0.08);
      } else {
        sysTheta += dx * 0.0065;
        sysPhi = THREE.MathUtils.clamp(sysPhi - dy * 0.005, 0.18, Math.PI - 0.12);
      }
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchActive = false;
        lastPinchDist = 0;
      }
      if (e.changedTouches.length === 1 && !pinchActive) {
        const t = e.changedTouches[0];
        const moved = Math.hypot(t.clientX - downX, t.clientY - downY);
        if (moved < 10) pick(t.clientX, t.clientY);
      }
      if (e.touches.length === 0) {
        drag = false;
        downOk = false;
      }
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    let lastFrame = performance.now();
    let docVisible = !document.hidden;

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const startLoop = () => {
      if (raf || !docVisible) return;
      lastFrame = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const onVis = () => {
      docVisible = !document.hidden;
      if (docVisible) startLoop();
      else stopLoop();
    };
    document.addEventListener('visibilitychange', onVis);

    const loop = () => {
      if (!docVisible) {
        stopLoop();
        return;
      }
      const now = performance.now();
      const dtSec = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;

      syncMeshes();
      if (!reduceMotion) {
        meshById.forEach((mesh, id) => {
          mesh.rotation.y = siderealSpinY(id, epochRef.current);
        });
      }

      const sunMesh = meshById.get('sun');
      if (sunMesh) sunLight.position.copy(sunMesh.position);

      const focus = focusRef.current;
      if (focus && meshById.has(focus)) {
        vTarget.copy(meshById.get(focus)!.position);
        const pr = worldRadiusForBody(focus);
        updateOrbitCamera(vTarget, pr);
      } else {
        updateSystemCamera();
      }
      if (!reduceMotion) {
        stars.rotation.y += 0.000055;
        milkyWay.rotation.y += 0.000022;
        asteroidBelt.update(dtSec);
        kuiperBelt.update(dtSec);
        earthExtras?.update(epochRef.current);
        earthOrbitals?.update(dtSec);
        saturnRings?.update(dtSec);
      }
      if (earthExtras) {
        const earthMesh = meshById.get('earth');
        if (earthMesh) {
          earthExtras.moonGroup.position.copy(earthMesh.position);
          if (earthOrbitals) earthOrbitals.group.position.copy(earthMesh.position);
        }
      }
      if (saturnRings) {
        const saturnMesh = meshById.get('saturn');
        if (saturnMesh) saturnRings.group.position.copy(saturnMesh.position);
      }
      sunExtras.update(camera.position, sunMesh?.position ?? vZero, dtSec);

      // Moons + comet are positioned every frame (so they sit on their planets
      // / orbit even when paused) but only advance when motion is allowed.
      const motionDt = reduceMotion ? 0 : dtSec;
      planetMoons.update(motionDt, (id) => meshById.get(id)?.position ?? null);
      comet.update(motionDt, sunMesh?.position ?? vZero);

      // Imperative zoom (e.g. "zoom into Sun" from the galactic tier) —
      // ease sysRadius toward the requested target, then clear the request.
      const zoomReq = zoomToRef.current;
      if (zoomReq != null && !focusRef.current) {
        const diff = zoomReq - sysRadius;
        if (Math.abs(diff) < Math.max(0.5, zoomReq * 0.01)) {
          sysRadius = zoomReq;
          zoomToRef.current = null;
          onZoomToConsumedRef.current?.();
        } else {
          // Logarithmic easing — handles huge ratio gaps cleanly.
          sysRadius = sysRadius * Math.pow(zoomReq / sysRadius, Math.min(1, dtSec * 2.4));
        }
      }

      // Cosmic tier blend + galactic-layer fades.
      currentTier = tierBlendFromRadius(sysRadius);
      nearbyStars.setFade(currentTier.stellar);
      galaxyDisk.setFade(currentTier.galactic);
      otherGalaxies.setFade(currentTier.universe);
      // The dense particle Milky Way ribbon at the solar tier overlaps
      // visually with the new disk — fade it out once the disk takes over.
      const milkyMat = milkyWay.material as THREE.PointsMaterial;
      milkyMat.opacity = 0.55 * (1 - currentTier.galactic);

      // Stream the view + projected anchor positions to the parent so it
      // can place the Sun pin / Milky Way tap label as HTML overlays.
      const onView = onCosmicViewRef.current;
      if (onView) {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        const sunWorld = sunMesh ? sunMesh.position : new THREE.Vector3();
        const sunScreen = projectToScreen(sunWorld, camera, width, height);
        // Milky-way label sits near the Sun on the disk — when zoomed out
        // it visually points to "our solar system in the Milky Way".
        const mwAnchor = galaxyDisk.group.visible
          ? localToScreen(new THREE.Vector3(0, 0, 0), galaxyDisk.group, camera, width, height)
          : null;
        onView({
          ...currentTier,
          sunScreen,
          milkyWayScreen: mwAnchor,
        });
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    startLoop();

    return () => {
      stopLoop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);

      textureLoadsCancelled = true;
      textureById.forEach((tex) => tex.dispose());
      textureById.clear();

      if (earthExtras) {
        bodies.remove(earthExtras.moonGroup);
        earthExtras.dispose();
        earthExtras = null;
      }
      if (earthOrbitals) {
        bodies.remove(earthOrbitals.group);
        earthOrbitals.dispose();
        earthOrbitals = null;
      }
      if (saturnRings) {
        bodies.remove(saturnRings.group);
        saturnRings.dispose();
        saturnRings = null;
      }
      atmosphereShells.forEach((shell) => disposeAtmosphereShell(shell));
      atmosphereShells.clear();
      asteroidBelt.dispose();
      kuiperBelt.dispose();
      bodies.remove(planetMoons.group);
      planetMoons.dispose();
      scene.remove(comet.group);
      comet.dispose();
      sunExtras.dispose();
      disposeOrbitRings(orbitRings);
      disposeMilkyWayBand(milkyWay);
      scene.remove(nearbyStars.group);
      scene.remove(galaxyDisk.group);
      scene.remove(otherGalaxies.group);
      nearbyStars.dispose();
      galaxyDisk.dispose();
      otherGalaxies.dispose();

      meshById.forEach((mesh) => disposeMeshTree(mesh));
      meshById.clear();
      hitById.forEach((h) => {
        h.geometry.dispose();
        (h.material as THREE.Material).dispose();
      });
      hitById.clear();
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [scaleMode, includePluto]);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    focusRef.current = focusBodyId;
  }, [focusBodyId]);

  return <div ref={mountRef} className="solar-system__canvas" />;
}
