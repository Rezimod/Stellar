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
import {
  applySaturnRingTexture,
  createSaturnRingMaterial,
  disposeSaturnRingMaterial,
  disposeSaturnRingTexture,
  getSaturnRingTexture,
  loadSaturnRingTexture,
} from '@/lib/solar-system/saturn-rings';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import {
  makeOrbitRings,
  disposeOrbitRings,
  makeAsteroidBelt,
  makeKuiperBelt,
  makeComets,
  makeEarthExtras,
  makeAtmosphereShell,
  disposeAtmosphereShell,
  makeSunExtras,
  makeMilkyWayBand,
  disposeMilkyWayBand,
  type BeltHandle,
  type CometHandle,
  type EarthExtrasHandle,
  type SunExtrasHandle,
} from '@/lib/solar-system/scene-extras';

export interface SolarSystemCanvasProps {
  epochMs: number;
  scaleMode: ScaleMode;
  includePluto: boolean;
  selectedId: SolarBodyId | null;
  /** When set, camera orbits this body at low altitude (system view when null). */
  focusBodyId: SolarBodyId | null;
  onSelect: (id: SolarBodyId | null) => void;
}

function disposeMat(m: THREE.Material) {
  if (m instanceof THREE.MeshStandardMaterial && m.map === getSaturnRingTexture()) {
    disposeSaturnRingMaterial(m);
    return;
  }
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
}: SolarSystemCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(epochMs);
  const scaleRef = useRef(scaleMode);
  const plutoRef = useRef(includePluto);
  const selectedRef = useRef(selectedId);
  const focusRef = useRef(focusBodyId);
  const onSelectRef = useRef(onSelect);

  epochRef.current = epochMs;
  scaleRef.current = scaleMode;
  plutoRef.current = includePluto;
  selectedRef.current = selectedId;
  focusRef.current = focusBodyId;
  onSelectRef.current = onSelect;

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
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.75 : 2.25));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x03060d, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.02,
      520,
    );

    let sysTheta = 0.72;
    let sysPhi = 1.02;
    let sysRadius = isMobile ? 20 : 26;

    let orbTheta = 0.5;
    let orbPhi = 0.95;
    let orbDist = 2.4;

    const vTarget = new THREE.Vector3();
    const vOffset = new THREE.Vector3();

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

    scene.add(new THREE.AmbientLight(0x1a2240, 0.38));
    const key = new THREE.DirectionalLight(0xfff0dd, 0.55);
    key.position.set(12, 8, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a8cc8, 0.15);
    fill.position.set(-18, -6, -10);
    scene.add(fill);
    const sunLight = new THREE.PointLight(0xfff4e0, 2.8, 220, 1.4);
    sunLight.name = 'sunLight';
    scene.add(sunLight);

    const starSprite = softSpriteTexture();

    const STAR_N = lite ? 1200 : 4800;
    const starPos = new Float32Array(STAR_N * 3);
    const starCol = new Float32Array(STAR_N * 3);
    for (let i = 0; i < STAR_N; i++) {
      const u = Math.random();
      const v = Math.random();
      const t = 2 * Math.PI * u;
      const p = Math.acos(2 * v - 1);
      const r = 120 + Math.random() * 180;
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
      const c = 0.55 + Math.random() * 0.45;
      starCol[i * 3] = 0.82 * c;
      starCol[i * 3 + 1] = 0.86 * c;
      starCol[i * 3 + 2] = 1.0 * c;
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

    const orbitRings = makeOrbitRings(scaleRef.current, plutoRef.current);
    scene.add(orbitRings);

    const asteroidBelt: BeltHandle = makeAsteroidBelt(scaleRef.current, lite);
    scene.add(asteroidBelt.group);

    const kuiperBelt: BeltHandle = makeKuiperBelt(scaleRef.current, lite);
    scene.add(kuiperBelt.group);

    const comets: CometHandle = makeComets(scaleRef.current, lite);
    scene.add(comets.group);

    const sunExtras: SunExtrasHandle = makeSunExtras(worldRadiusForBody('sun'));
    scene.add(sunExtras.group);

    let earthExtras: EarthExtrasHandle | null = null;
    const atmosphereShells = new Map<SolarBodyId, THREE.Mesh>();

    const bodies = new THREE.Group();
    scene.add(bodies);

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

    loadSaturnRingTexture(loader, maxAniso).then((ringTex) => {
      if (textureLoadsCancelled) return;
      const saturnMesh = meshById.get('saturn');
      if (saturnMesh) applySaturnRingTexture(saturnMesh, ringTex);
    }).catch(() => { /* rings stay transparent until retry on remount */ });

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

          if (s.id === 'saturn') {
            const sr = worldRadiusForBody('saturn');
            const tilt = THREE.MathUtils.degToRad(26.7);
            mesh.rotation.z = tilt;

            const ringSegs = lite ? 192 : 256;
            const ringLoaded = getSaturnRingTexture();
            const ringMat = ringLoaded
              ? createSaturnRingMaterial(ringLoaded)
              : new THREE.MeshStandardMaterial({
                  transparent: true,
                  opacity: 0,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                });

            const ringInner = new THREE.Mesh(
              new THREE.RingGeometry(sr * 1.235, sr * 2.352, ringSegs),
              ringMat,
            );
            ringInner.name = 'saturnRing';
            ringInner.rotation.x = Math.PI / 2;
            ringInner.renderOrder = 1;
            mesh.add(ringInner);

            const ringBack = ringInner.clone();
            ringBack.name = 'saturnRingBack';
            ringBack.material = ringMat instanceof THREE.MeshStandardMaterial
              ? ringMat.clone()
              : ringMat;
            ringBack.rotation.x = Math.PI / 2;
            ringBack.rotation.y = Math.PI;
            ringBack.renderOrder = 1;
            mesh.add(ringBack);
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

    const pick = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
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
        sysRadius = THREE.MathUtils.clamp(sysRadius, 5.2, 160);
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
          else sysRadius = THREE.MathUtils.clamp(sysRadius / factor, 5.2, 200);
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
    const loop = () => {
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
      }
      if (earthExtras) {
        const earthMesh = meshById.get('earth');
        if (earthMesh) earthExtras.moonGroup.position.copy(earthMesh.position);
      }
      comets.update(epochRef.current);
      sunExtras.update(camera.position, sunMesh?.position ?? new THREE.Vector3(), dtSec);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
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
      disposeSaturnRingTexture();

      if (earthExtras) {
        bodies.remove(earthExtras.moonGroup);
        earthExtras.dispose();
        earthExtras = null;
      }
      atmosphereShells.forEach((shell) => disposeAtmosphereShell(shell));
      atmosphereShells.clear();
      asteroidBelt.dispose();
      kuiperBelt.dispose();
      comets.dispose();
      sunExtras.dispose();
      disposeOrbitRings(orbitRings);
      disposeMilkyWayBand(milkyWay);

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
