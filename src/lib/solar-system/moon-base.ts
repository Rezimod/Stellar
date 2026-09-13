// The outpost: three inflatable habitats on raised skirts with airlocks and
// ramps, greenhouse tunnels between them, a row of blue gas tanks, a solar
// field, a comms dish aimed at Earth, a cargo rover, the descent stage that
// brought the first crew, a flag, a seismometer, a sign, two mast lights.
// Everything sits on the terrain's own height, and every footprint is also a
// collider so the cosmonaut walks around it rather than through it.

import * as THREE from 'three';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import { PAD_CENTER } from '@/lib/solar-system/moon-terrain';

export interface PointOfInterest {
  id: string;
  x: number;
  z: number;
  /** Approach radius that names it on the HUD. */
  r: number;
}

export interface BaseHandle {
  group: THREE.Group;
  colliders: Collider[];
  pois: PointOfInterest[];
  /** Where the crew steps out. */
  spawn: THREE.Vector3;
  /** Blink the beacons and turn the dish. */
  update: (t: number, earthDir: THREE.Vector3) => void;
  dispose: () => void;
}

/** A canvas plaque: white board, dark mono lettering. */
function plaque(lines: string[], w: number, h: number, bg: string, fg: string, px: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${px}px "JetBrains Mono", ui-monospace, monospace`;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.35));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Georgia's five-cross flag, drawn — it is the founder's, and Astroman's. */
function georgianFlag(): THREE.CanvasTexture {
  const w = 300; const h = 200;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f4f4f2';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d0202a';
  ctx.fillRect(w / 2 - 20, 0, 40, h);
  ctx.fillRect(0, h / 2 - 20, w, 40);
  const bolnisi = (cx: number, cy: number, s: number) => {
    // Each arm flares a little — the Bolnisi cross.
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(k * Math.PI / 2);
      ctx.moveTo(-s * 0.18, -s * 0.18);
      ctx.lineTo(-s * 0.3, -s);
      ctx.lineTo(s * 0.3, -s);
      ctx.lineTo(s * 0.18, -s * 0.18);
      ctx.restore();
    }
    ctx.fill();
  };
  for (const [qx, qy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) bolnisi(w * qx, h * qy, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeMoonBase(heightAt: (x: number, z: number) => number, lite: boolean): BaseHandle {
  const group = new THREE.Group();
  group.name = 'moon-base';
  const colliders: Collider[] = [];
  const pois: PointOfInterest[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const white = new THREE.MeshStandardMaterial({ color: 0xcfcfca, roughness: 0.68, metalness: 0.02 });
  const skirt = new THREE.MeshStandardMaterial({ color: 0xa9aaa6, roughness: 0.5, metalness: 0.45 });
  const alu = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.35, metalness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6e737b, roughness: 0.45, metalness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.55, metalness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.32, metalness: 0.95 });
  const tankBlue = new THREE.MeshStandardMaterial({ color: 0x1946b8, roughness: 0.3, metalness: 0.55 });
  const tankNavy = new THREE.MeshStandardMaterial({ color: 0x0e1f60, roughness: 0.3, metalness: 0.55 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x0f1c3a, roughness: 0.18, metalness: 0.6 });
  const greenhouse = new THREE.MeshPhysicalMaterial({ color: 0xd9ecf5, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3e8a35, roughness: 0.8 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb6c8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55, clearcoat: 1 });
  const beacon = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffb347), emissiveIntensity: 2 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff2d0), emissiveIntensity: 1.6 });
  const airlockLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0x4db2ff), emissiveIntensity: 1.5 });
  const owned: THREE.Material[] = [white, skirt, alu, steel, dark, gold, tankBlue, tankNavy, panel, greenhouse, leaf, soil, glass, beacon, lamp, airlockLight];
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const place = (x: number, z: number, yaw = 0): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = yaw;
    group.add(g);
    return g;
  };
  const seg = lite ? 24 : 40;

  // ── Habitats. ──
  const habitat = (x: number, z: number, yaw: number, id: string) => {
    const g = place(x, z, yaw);
    // Four legs and a ring skirt, then the dome on top.
    for (const [lx, lz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) {
      mesh(g, new THREE.CylinderGeometry(0.16, 0.2, 1.1, 10), steel, lx, 0.55, lz);
      mesh(g, new THREE.CylinderGeometry(0.6, 0.6, 0.08, 12), steel, lx, 0.04, lz);
    }
    mesh(g, new THREE.CylinderGeometry(5.4, 5.6, 0.9, seg), skirt, 0, 1.5, 0);
    const dome = mesh(g, new THREE.SphereGeometry(5.4, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI * 0.62), white, 0, 1.95, 0);
    dome.scale.set(1, 0.86, 1);
    // Seams: the inflatable's restraint layer.
    for (let i = 0; i < 6; i++) {
      const ring = mesh(g, new THREE.TorusGeometry(5.42, 0.05, 6, seg, Math.PI), skirt, 0, 1.95, 0);
      ring.rotation.y = (i / 6) * Math.PI;
      ring.scale.set(1, 0.86, 1);
    }
    for (const yh of [3.4, 4.8]) {
      const r = Math.sqrt(Math.max(0.1, 1 - Math.pow((yh - 1.95) / (5.4 * 0.86), 2))) * 5.4;
      mesh(g, new THREE.TorusGeometry(r, 0.05, 6, seg), skirt, 0, yh, 0).rotation.x = Math.PI / 2;
    }
    // Airlock: a hard module on the front with the door and a stair-ramp.
    mesh(g, new THREE.BoxGeometry(2.4, 2.6, 2.2), white, 0, 2.7, 5.6);
    mesh(g, new THREE.BoxGeometry(1.1, 1.9, 0.1), skirt, 0, 2.55, 6.72);
    mesh(g, new THREE.BoxGeometry(0.28, 0.28, 0.06), glass, 0.0, 3.0, 6.78);
    mesh(g, new THREE.BoxGeometry(0.5, 0.06, 0.06), airlockLight, 0, 3.85, 6.74);
    const ramp = mesh(g, new THREE.BoxGeometry(1.6, 0.12, 5.2), alu, 0, 0.9, 9.3);
    ramp.rotation.x = Math.atan2(1.5, 5);
    for (const s of [-1, 1]) {
      const rail = mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 5.3, 6), steel, s * 0.8, 1.75, 9.3);
      rail.rotation.x = Math.PI / 2 + Math.atan2(1.5, 5);
    }
    mesh(g, new THREE.BoxGeometry(1.6, 0.12, 1.2), alu, 0, 1.68, 6.9);
    const rampX = x + Math.sin(yaw) * 9.3; const rampZ = z + Math.cos(yaw) * 9.3;
    colliders.push({ x: rampX, z: rampZ, r: 2.2 });
    // Beacon on top.
    mesh(g, new THREE.SphereGeometry(0.16, 10, 8), beacon, 0, 6.75, 0);
    colliders.push({ x: x, z: z, r: 5.9 });
    const doorX = x + Math.sin(yaw) * 6.5; const doorZ = z + Math.cos(yaw) * 6.5;
    colliders.push({ x: doorX, z: doorZ, r: 1.5 });
    pois.push({ id, x: x + Math.sin(yaw) * 9, z: z + Math.cos(yaw) * 9, r: 6 });
  };
  const px = PAD_CENTER.x; const pz = PAD_CENTER.y;
  habitat(px - 21, pz - 12, 0.28, 'habitatA');
  habitat(px, pz - 20, 0, 'habitatB');
  habitat(px + 21, pz - 12, -0.28, 'habitatC');

  // ── Greenhouse tunnels between the domes. ──
  const tunnel = (x: number, z: number, yaw: number, len: number) => {
    const g = place(x, z, yaw);
    const shell = mesh(g, new THREE.CylinderGeometry(2.3, 2.3, len, seg, 1, true, 0, Math.PI), greenhouse, 0, 0.7, 0);
    shell.rotation.z = Math.PI / 2;
    shell.castShadow = false;
    for (let i = -1; i <= 1; i++) {
      const rib = mesh(g, new THREE.TorusGeometry(2.32, 0.05, 6, seg, Math.PI), alu, i * len * 0.4, 0.7, 0);
      rib.rotation.y = Math.PI / 2;
    }
    mesh(g, new THREE.BoxGeometry(len, 0.5, 4.8), skirt, 0, 0.45, 0);
    for (const s of [-1, 1]) {
      mesh(g, new THREE.BoxGeometry(len - 0.6, 0.5, 1.4), soil, 0, 0.95, s * 1.3);
      for (let k = 0; k < Math.floor(len / 1.1); k++) {
        const leafy = mesh(g, new THREE.SphereGeometry(0.42, 8, 6), leaf, -len / 2 + 0.8 + k * 1.1, 1.45, s * 1.3);
        leafy.scale.set(1, 0.7, 1);
        leafy.castShadow = false;
      }
      mesh(g, new THREE.BoxGeometry(len - 0.6, 0.04, 0.06), lamp, 0, 2.6, s * 1.3);
    }
    colliders.push({ x, z, r: len / 2 });
  };
  tunnel(px - 10.5, pz - 15.5, 0.36, 9);
  tunnel(px + 10.5, pz - 15.5, -0.36, 9);
  pois.push({ id: 'greenhouse', x: px - 10.5, z: pz - 10, r: 5 });
  pois.push({ id: 'greenhouse', x: px + 10.5, z: pz - 10, r: 5 });

  // ── Gas farm: four tanks on cradles, labelled. ──
  {
    const g = place(px - 36, pz + 2, 0.15);
    const labels = ['O2', 'N2', 'H2O', 'CH4'];
    labels.forEach((label, i) => {
      const zc = (i - 1.5) * 3.2;
      const tank = mesh(g, new THREE.CapsuleGeometry(1.05, 3.6, 6, seg / 2), i % 2 ? tankNavy : tankBlue, 0, 1.55, zc);
      tank.rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.6, 0.9, 2.5), steel, s * 1.4, 0.45, zc);
      mesh(g, new THREE.TorusGeometry(1.08, 0.04, 6, seg / 2), alu, 0, 1.55, zc).rotation.y = Math.PI / 2;
      const tex = plaque([label], 128, 64, '#f2f2ee', '#101418', 34);
      textures.push(tex);
      const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      owned.push(m);
      mesh(g, new THREE.PlaneGeometry(1.0, 0.5), m, 1.12, 1.7, zc).rotation.y = Math.PI / 2;
    });
    mesh(g, new THREE.CylinderGeometry(0.08, 0.08, 12, 8), steel, 0, 0.2, 0).rotation.x = Math.PI / 2;
    colliders.push({ x: px - 36, z: pz + 2, r: 7 });
    pois.push({ id: 'tanks', x: px - 33, z: pz + 2, r: 6 });
  }

  // ── Solar field. ──
  {
    const g = place(px + 36, pz + 6, -0.2);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = (c - 1.5) * 3.2; const z = (r - 0.5) * 5.5;
        mesh(g, new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), steel, x, 0.7, z);
        const p = mesh(g, new THREE.BoxGeometry(3, 0.06, 2.2), panel, x, 1.7, z);
        p.rotation.x = -0.55;
        const frame = mesh(g, new THREE.BoxGeometry(3.06, 0.02, 2.26), alu, x, 1.69, z);
        frame.rotation.x = -0.55;
      }
    }
    mesh(g, new THREE.BoxGeometry(1.2, 1, 0.8), dark, 0, 0.5, 5.4);
    colliders.push({ x: px + 36, z: pz + 6, r: 7.5 });
    pois.push({ id: 'solar', x: px + 32, z: pz + 6, r: 6 });
  }

  // ── Comms dish. ──
  const dishG = place(px + 22, pz - 30, 0);
  const dishHead = new THREE.Group();
  {
    mesh(dishG, new THREE.CylinderGeometry(0.16, 0.24, 7, 10), steel, 0, 3.5, 0);
    for (let i = 0; i < 3; i++) {
      const brace = mesh(dishG, new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), steel, Math.sin(i * 2.09) * 1.2, 1.6, Math.cos(i * 2.09) * 1.2);
      brace.rotation.z = Math.sin(i * 2.09) * 0.36;
      brace.rotation.x = -Math.cos(i * 2.09) * 0.36;
    }
    dishHead.position.set(0, 7.2, 0);
    dishG.add(dishHead);
    // Bowl opens toward +Z, which lookAt points at Earth.
    const dish = mesh(dishHead, new THREE.SphereGeometry(2.4, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI * 0.32), alu, 0, 0, 2.4);
    dish.rotation.x = -Math.PI / 2;
    dish.material = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide });
    owned.push(dish.material);
    mesh(dishHead, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), steel, 0, 0, 0.8).rotation.x = Math.PI / 2;
    mesh(dishHead, new THREE.ConeGeometry(0.12, 0.3, 8), dark, 0, 0, 1.7).rotation.x = Math.PI / 2;
    mesh(dishG, new THREE.SphereGeometry(0.12, 8, 6), beacon, 0, 7.3, 0);
    colliders.push({ x: px + 22, z: pz - 30, r: 1.2 });
    pois.push({ id: 'dish', x: px + 22, z: pz - 27, r: 5 });
  }

  // ── Cargo rover: cabin, flatbed, six wheels. ──
  {
    const g = place(px + 12, pz + 10, 0.9);
    mesh(g, new THREE.BoxGeometry(2.2, 0.5, 4.6), steel, 0, 1.05, 0);
    mesh(g, new THREE.BoxGeometry(2.1, 1.5, 1.8), white, 0, 2.05, 1.3);
    mesh(g, new THREE.BoxGeometry(1.9, 0.9, 0.1), glass, 0, 2.2, 2.22);
    mesh(g, new THREE.BoxGeometry(2, 0.3, 2.2), white, 0, 1.45, -1.1);
    mesh(g, new THREE.BoxGeometry(1.2, 0.8, 1.2), dark, 0.3, 1.9, -1.2);
    mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), steel, -0.8, 3.4, 0.9);
    mesh(g, new THREE.BoxGeometry(0.16, 0.08, 0.08), lamp, -0.7, 2.4, 2.24);
    mesh(g, new THREE.BoxGeometry(0.16, 0.08, 0.08), lamp, 0.7, 2.4, 2.24);
    for (const s of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        const w = mesh(g, new THREE.CylinderGeometry(0.55, 0.55, 0.36, 18), dark, s * 1.35, 0.55, k * 1.55);
        w.rotation.z = Math.PI / 2;
        mesh(g, new THREE.TorusGeometry(0.5, 0.09, 6, 18), steel, s * 1.35, 0.55, k * 1.55).rotation.y = Math.PI / 2;
        mesh(g, new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), steel, s * 0.9, 0.7, k * 1.55).rotation.z = Math.PI / 2;
      }
    }
    colliders.push({ x: px + 12, z: pz + 10, r: 2.8 });
    pois.push({ id: 'rover', x: px + 12, z: pz + 10, r: 5.5 });
  }

  // ── Descent stage: the ride down, left where it landed. ──
  {
    const g = place(px - 12, pz + 24, 0.4);
    mesh(g, new THREE.CylinderGeometry(2.4, 2.6, 1.7, 8), gold, 0, 1.9, 0);
    mesh(g, new THREE.CylinderGeometry(1.1, 1.6, 1.1, 12), dark, 0, 0.5, 0);
    mesh(g, new THREE.CylinderGeometry(0.9, 0.9, 0.5, 12), steel, 0, 2.95, 0);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const lx = Math.sin(a) * 3.6; const lz = Math.cos(a) * 3.6;
      const leg = mesh(g, new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), gold, lx * 0.65, 1.3, lz * 0.65);
      leg.rotation.z = -Math.sin(a) * 0.6;
      leg.rotation.x = Math.cos(a) * 0.6;
      mesh(g, new THREE.CylinderGeometry(0.7, 0.55, 0.14, 12), gold, lx, 0.07, lz);
    }
    for (let i = 0; i < 6; i++) mesh(g, new THREE.BoxGeometry(0.5, 0.05, 0.05), steel, 0, 0.5 + i * 0.45, 2.55);
    for (const s of [-1, 1]) mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), steel, s * 0.25, 1.75, 2.55);
    mesh(g, new THREE.SphereGeometry(0.1, 8, 6), beacon, 0, 3.3, 0);
    colliders.push({ x: px - 12, z: pz + 24, r: 3.8 });
    pois.push({ id: 'lander', x: px - 12, z: pz + 24, r: 7 });
  }

  // ── Flag. ──
  {
    const g = place(px + 3, pz + 18, 0);
    mesh(g, new THREE.CylinderGeometry(0.02, 0.025, 2.6, 8), alu, 0, 1.3, 0);
    mesh(g, new THREE.CylinderGeometry(0.015, 0.015, 1.25, 6), alu, 0.62, 2.55, 0).rotation.z = Math.PI / 2;
    const tex = georgianFlag();
    textures.push(tex);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide });
    owned.push(m);
    const flag = mesh(g, new THREE.PlaneGeometry(1.2, 0.8, 12, 4), m, 0.62, 2.14, 0);
    // A stiff flag: the cloth hangs in the ripples it was packed with.
    const fp = flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 7) * 0.03 * (fp.getX(i) + 0.6));
    flag.geometry.computeVertexNormals();
    pois.push({ id: 'flag', x: px + 3, z: pz + 18, r: 3.5 });
  }

  // ── Seismometer and a sample crate. ──
  {
    const g = place(px + 26, pz - 2, 0.5);
    for (let i = 0; i < 3; i++) {
      const leg = mesh(g, new THREE.CylinderGeometry(0.02, 0.02, 1, 6), steel, Math.sin(i * 2.09) * 0.4, 0.45, Math.cos(i * 2.09) * 0.4);
      leg.rotation.z = -Math.sin(i * 2.09) * 0.45;
      leg.rotation.x = Math.cos(i * 2.09) * 0.45;
    }
    mesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), dark, 0, 0.9, 0);
    mesh(g, new THREE.SphereGeometry(0.05, 8, 6), beacon, 0, 1.05, 0);
    mesh(g, new THREE.BoxGeometry(0.9, 0.5, 0.6), skirt, 1.4, 0.25, 0.4);
    pois.push({ id: 'seismometer', x: px + 26, z: pz - 2, r: 3.5 });
  }

  // ── The base sign. ──
  {
    const g = place(px, pz + 12, 0);
    for (const s of [-1, 1]) mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), steel, s * 1.3, 1.1, 0);
    const tex = plaque(['STELLAR BASE', 'ASTROMAN · TBILISI', '41.71 N · 44.83 E'], 512, 256, '#f2f2ee', '#101418', 38);
    textures.push(tex);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide });
    owned.push(m);
    mesh(g, new THREE.PlaneGeometry(2.8, 1.4), m, 0, 1.75, -0.03).rotation.y = Math.PI;
    mesh(g, new THREE.BoxGeometry(2.9, 1.5, 0.04), dark, 0, 1.75, 0);
    colliders.push({ x: px - 1.3, z: pz + 12, r: 0.2 });
    colliders.push({ x: px + 1.3, z: pz + 12, r: 0.2 });
    pois.push({ id: 'sign', x: px, z: pz + 13, r: 3 });
  }

  // ── Mast lights at the pad's edge. ──
  const lamps: THREE.Object3D[] = [];
  for (const [lx, lz] of [[px - 28, pz + 16], [px + 28, pz + 18]]) {
    const g = place(lx, lz, 0);
    mesh(g, new THREE.CylinderGeometry(0.08, 0.12, 8, 8), steel, 0, 4, 0);
    const head = mesh(g, new THREE.BoxGeometry(0.9, 0.2, 0.5), lamp, 0, 8, 0);
    lamps.push(head);
    colliders.push({ x: lx, z: lz, r: 0.3 });
  }

  // ── Cable runs along the ground between the domes and the tanks. ──
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7 });
  owned.push(cableMat);
  const runs: [number, number][][] = [
    [[px - 33, pz + 2], [px - 26, pz - 4], [px - 21, pz - 5]],
    [[px + 30, pz + 6], [px + 24, pz - 2], [px + 21, pz - 5]],
    [[px + 22, pz - 28], [px + 12, pz - 24], [px + 4, pz - 15]],
  ];
  for (const run of runs) {
    const pts = run.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.06, z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 24, 0.06, 6, false);
    geoms.push(g);
    const c = new THREE.Mesh(g, cableMat);
    c.receiveShadow = true;
    group.add(c);
  }

  const beaconMats = [beacon];
  const spawn = new THREE.Vector3(px, heightAt(px, pz + 4), pz + 4);
  const tmp = new THREE.Vector3();
  return {
    group, colliders, pois, spawn,
    update(t, earthDir) {
      const blink = (Math.sin(t * 2.2) > 0.6 ? 1 : 0.15) * 2;
      for (const m of beaconMats) m.emissiveIntensity = blink;
      // The dish tracks Earth.
      dishHead.getWorldPosition(tmp).add(earthDir);
      dishHead.lookAt(tmp);
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
