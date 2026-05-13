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

export interface SolarSystemCanvasProps {
  epochMs: number;
  scaleMode: ScaleMode;
  includePluto: boolean;
  selectedId: SolarBodyId | null;
  onSelect: (id: SolarBodyId | null) => void;
}

/**
 * Full-screen Three.js solar system: real ephemeris (astronomy-engine),
 * orrery-style radial compression, orbit camera, pick targets.
 */
export function SolarSystemCanvas({
  epochMs,
  scaleMode,
  includePluto,
  selectedId,
  onSelect,
}: SolarSystemCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(epochMs);
  const scaleRef = useRef(scaleMode);
  const plutoRef = useRef(includePluto);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);

  epochRef.current = epochMs;
  scaleRef.current = scaleMode;
  plutoRef.current = includePluto;
  selectedRef.current = selectedId;
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
      0.08,
      500,
    );

    let theta = 0.72;
    let phi = 1.02;
    let radius = isMobile ? 20 : 26;

    const updateCamera = () => {
      const st = Math.sin(phi);
      camera.position.set(
        radius * st * Math.cos(theta),
        radius * Math.cos(phi),
        radius * st * Math.sin(theta),
      );
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    scene.add(new THREE.AmbientLight(0x1a2240, 0.35));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.25);
    key.position.set(12, 8, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a8cc8, 0.22);
    fill.position.set(-18, -6, -10);
    scene.add(fill);

    const STAR_N = lite ? 1400 : 5200;
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

    const disposeMeshTree = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    };

    const makeBodyMesh = (id: SolarBodyId): THREE.Mesh => {
      const r = worldRadiusForBody(id);
      const segs = lite ? 28 : 48;
      const geom = new THREE.SphereGeometry(r, segs, segs);
      const color = bodyColor(id);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: id === 'sun' ? 0.88 : 0.78,
        metalness: id === 'sun' ? 0 : 0.06,
        emissive: new THREE.Color(id === 'sun' ? color : 0x000000),
        emissiveIntensity: id === 'sun' ? 1.35 : 0,
      });
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
          if (m) {
            bodies.remove(m);
            disposeMeshTree(m);
            meshById.delete(id);
          }
        }
      }

      for (const s of samples) {
        let mesh = meshById.get(s.id);
        if (!mesh) {
          mesh = makeBodyMesh(s.id);
          meshById.set(s.id, mesh);
          bodies.add(mesh);

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
      }

      const sel = selectedRef.current;
      meshById.forEach((mesh, id) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = bodyColor(id);
        const isSel = sel === id;
        if (id === 'sun') {
          mat.emissive.setHex(base);
          mat.emissiveIntensity = isSel ? 1.65 : 1.35;
        } else {
          mat.emissive.setHex(isSel ? base : 0x000000);
          mat.emissiveIntensity = isSel ? 0.22 : 0;
        }
        mesh.scale.setScalar(isSel ? 1.12 : 1);
      });
    };

    syncMeshes();

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const pick = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const objs = [...meshById.values()].sort((a, b) => {
        const da = a.position.distanceToSquared(camera.position);
        const db = b.position.distanceToSquared(camera.position);
        return da - db;
      });
      const hits = raycaster.intersectObjects(objs, false);
      const first = hits[0]?.object as THREE.Mesh | undefined;
      const id = (first?.userData.bodyId as SolarBodyId | undefined) ?? null;
      onSelectRef.current(id);
    };

    let dragging = false;
    let downOk = false;
    let lx = 0;
    let ly = 0;

    let downX = 0;
    let downY = 0;

    const onDown = (e: PointerEvent) => {
      downOk = true;
      dragging = true;
      downX = lx = e.clientX;
      downY = ly = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      theta -= dx * 0.0055;
      phi = THREE.MathUtils.clamp(phi - dy * 0.0045, 0.18, Math.PI - 0.12);
      updateCamera();
    };

    const onUp = (e: PointerEvent) => {
      if (downOk && dragging) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 7) pick(e.clientX, e.clientY);
      }
      downOk = false;
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(e.deltaY * 0.0012);
      radius = THREE.MathUtils.clamp(radius * f, 5.5, 140);
      updateCamera();
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

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
      if (!reduceMotion) {
        stars.rotation.y += 0.00006;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointercancel', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);

      meshById.forEach((mesh) => {
        disposeMeshTree(mesh);
      });
      meshById.clear();
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

  return <div ref={mountRef} className="solar-system__canvas" />;
}
