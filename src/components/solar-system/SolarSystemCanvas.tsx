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
import { createPlanetMaterial, disposePlanetMaterial } from '@/lib/solar-system/planet-textures';

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
    }
  });
}

/**
 * Three.js solar system: ephemeris, pinch zoom, invisible pick spheres,
 * low-orbit camera around `focusBodyId`, procedural planet textures.
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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
      const minD = Math.max(pr * 2.8, 0.35);
      const maxD = Math.max(pr * 48, 4.5);
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

    scene.add(new THREE.AmbientLight(0x1a2240, 0.32));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.2);
    key.position.set(12, 8, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a8cc8, 0.2);
    fill.position.set(-18, -6, -10);
    scene.add(fill);

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
        size: lite ? 0.055 : 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(stars);

    const bodies = new THREE.Group();
    scene.add(bodies);

    const meshById = new Map<SolarBodyId, THREE.Mesh>();
    const hitById = new Map<SolarBodyId, THREE.Mesh>();
    let lastFocus: SolarBodyId | null = null;

    const makeBodyMesh = (id: SolarBodyId): THREE.Mesh => {
      const r = worldRadiusForBody(id);
      const segs = lite ? 36 : 56;
      const geom = new THREE.SphereGeometry(r, segs, segs);
      const mat = createPlanetMaterial(id, lite);
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
        }
      }

      for (const s of samples) {
        let mesh = meshById.get(s.id);
        let hit = hitById.get(s.id);
        if (!mesh) {
          mesh = makeBodyMesh(s.id);
          meshById.set(s.id, mesh);
          bodies.add(mesh);

          const hGeom = new THREE.SphereGeometry(Math.max(worldRadiusForBody(s.id) * 4.2, 0.22), 20, 20);
          const hMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          hit = new THREE.Mesh(hGeom, hMat);
          hit.userData.bodyId = s.id;
          hitById.set(s.id, hit);
          bodies.add(hit);

          if (s.id === 'saturn') {
            const sr = worldRadiusForBody('saturn');
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(sr * 1.25, sr * 2.15, 64),
              new THREE.MeshBasicMaterial({
                color: 0xc8b896,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
              }),
            );
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = THREE.MathUtils.degToRad(26.7);
            mesh.add(ring);
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
        orbTheta -= dx * 0.006;
        orbPhi = THREE.MathUtils.clamp(orbPhi - dy * 0.005, 0.12, Math.PI - 0.08);
      } else {
        sysTheta -= dx * 0.0055;
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
          if (focusRef.current) orbDist = THREE.MathUtils.clamp(orbDist / factor, 0.2, 200);
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
        orbTheta -= dx * 0.0065;
        orbPhi = THREE.MathUtils.clamp(orbPhi - dy * 0.0055, 0.12, Math.PI - 0.08);
      } else {
        sysTheta -= dx * 0.0065;
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
    const loop = () => {
      syncMeshes();
      const focus = focusRef.current;
      if (focus && meshById.has(focus)) {
        vTarget.copy(meshById.get(focus)!.position);
        const pr = worldRadiusForBody(focus);
        updateOrbitCamera(vTarget, pr);
      } else {
        updateSystemCamera();
      }
      if (!reduceMotion) stars.rotation.y += 0.000055;
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
