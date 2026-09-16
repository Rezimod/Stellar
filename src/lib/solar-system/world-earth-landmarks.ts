// The Tbilisi you would know from one photograph, modelled by hand but put
// where OpenStreetMap has them and at the heights on record: Narikala's
// walls along the ridge (every mapped wall, raised on the ground under it)
// and its towers; Kartlis Deda, twenty metres of aluminium with the bowl
// and the sword; Sameba on Elia hill, eighty-seven metres to the cross with
// the gold dome; the TV tower on Mtatsminda, 274.5 m; the 65 m wheel beside
// it; the Bridge of Peace's wave of a glass roof; Fuksas's two tubes in Rike
// Park; the brick domes of the Abanotubani baths; and carved wooden
// balconies on the Old Town's houses.
//
// Everything that moves (the wheel, its cabins) is a pivot before the merge.

import * as THREE from 'three';
import { keep, mergeStatic, pivot } from '@/lib/solar-system/moon-batch';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import type { PointOfInterest } from '@/lib/solar-system/moon-base';
import {
  KIND, ROAD, centroid, insideRing, ringArea, type EarthData, type Pt,
} from '@/lib/solar-system/world-earth-data';
import { withHaze } from '@/lib/solar-system/world-earth-haze';

export interface Landmarks {
  group: THREE.Group;
  colliders: Collider[];
  pois: PointOfInterest[];
  /** Where each landmark stands, for bearings and tests: base height is the ground under it. */
  sites: Record<string, { x: number; z: number; base: number; top: number }>;
  update: (dt: number, night: number) => void;
  dispose: () => void;
}

const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export function makeLandmarks(data: EarthData, heightAt: (x: number, z: number) => number, lite: boolean): Landmarks {
  const L = data.manifest.landmarks;
  const group = new THREE.Group();
  group.name = 'earth-landmarks';
  const colliders: Collider[] = [];
  const pois: PointOfInterest[] = [];
  const sites: Landmarks['sites'] = {};
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const seg = lite ? 16 : 28;
  const glow = { value: 0 };

  const mat = (key: string, p: THREE.MeshStandardMaterialParameters, lit = 0) => {
    const m = withHaze(new THREE.MeshStandardMaterial(p), `lm-${key}`, false, lit > 0 ? (shader) => {
      shader.uniforms.uGlowNight = glow;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlowNight;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.86, 0.66) * uGlowNight * ${lit.toFixed(3)};`);
    } : undefined);
    materials.push(m);
    return m;
  };
  const stone = mat('stone', { color: srgb(0.6, 0.53, 0.43), roughness: 0.95 }, 0.35);
  const stoneWall = mat('stoneWall', { color: srgb(0.6, 0.53, 0.43), roughness: 0.95, side: THREE.DoubleSide }, 0.35);
  const brick = mat('brick', { color: srgb(0.58, 0.38, 0.28), roughness: 0.9 }, 0.2);
  const sandstone = mat('sandstone', { color: srgb(0.8, 0.72, 0.58), roughness: 0.85 }, 0.55);
  const gold = mat('gold', { color: srgb(0.95, 0.74, 0.34), roughness: 0.28, metalness: 1 }, 0.6);
  const alu = mat('alu', { color: srgb(0.8, 0.81, 0.82), roughness: 0.35, metalness: 0.9 }, 0.9);
  const steelWhite = mat('steelWhite', { color: srgb(0.9, 0.9, 0.88), roughness: 0.45, metalness: 0.4 });
  const steelGrey = mat('steelGrey', { color: srgb(0.55, 0.56, 0.58), roughness: 0.5, metalness: 0.7 });
  const redWhite = mat('tvPaint', { color: srgb(0.78, 0.76, 0.74), roughness: 0.6, metalness: 0.3 });
  // Clear glass: almost no body colour of its own, mostly the sky it reflects.
  const glass = mat('glass', { color: srgb(0.16, 0.2, 0.22), roughness: 0.04, metalness: 0.6, envMapIntensity: 1.4, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const tubeSkin = mat('tube', { color: srgb(0.74, 0.76, 0.78), roughness: 0.3, metalness: 0.75 });
  const blueTile = mat('blueTile', { color: srgb(0.2, 0.42, 0.62), roughness: 0.4 }, 0.3);
  const wood = mat('wood', { color: srgb(0.44, 0.3, 0.2), roughness: 0.85 });
  const woodLight = mat('woodLight', { color: srgb(0.62, 0.5, 0.36), roughness: 0.8 });
  const cabinRed = mat('cabinRed', { color: srgb(0.75, 0.2, 0.18), roughness: 0.5 });
  const redLamp = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  materials.push(redLamp);
  const textures: THREE.Texture[] = [];
  let ledLine: THREE.Line | null = null;

  const add = <G extends THREE.BufferGeometry>(parent: THREE.Object3D, g: G, m: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  /** A bar from a to b with a square section. */
  const bar = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, w: number, m: THREE.Material) => {
    const len = a.distanceTo(b);
    if (len < 1e-3) return null;
    const o = add(parent, new THREE.BoxGeometry(w, len, w), m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return o;
  };
  const faceToward = (from: Pt, to: Pt) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  const oldTown: Pt = [0, 350];

  // ── Narikala: every mapped wall on the ground under it. ──
  if (L.narikalaWalls.length) {
    const walls = new THREE.Group();
    walls.name = 'narikala';
    const pos: number[] = []; const idx: number[] = [];
    const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
      const s = pos.length / 3;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    const v = () => new THREE.Vector3();
    const [a0, a1, b0, b1, c0, c1, d0, d1] = [v(), v(), v(), v(), v(), v(), v(), v()];
    let wx = 0; let wz = 0; let wn = 0;
    for (const w of L.narikalaWalls) {
      const pts = w.pts;
      const H = 9; const T = 1.1;
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, az] = pts[k]; const [bx, bz] = pts[k + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 0.3) continue;
        const nx = -(bz - az) / len * T; const nz = (bx - ax) / len * T;
        const ya = heightAt(ax, az); const yb = heightAt(bx, bz);
        a0.set(ax + nx, ya - 3, az + nz); a1.set(ax + nx, ya + H, az + nz);
        b0.set(bx + nx, yb - 3, bz + nz); b1.set(bx + nx, yb + H, bz + nz);
        c0.set(ax - nx, ya - 3, az - nz); c1.set(ax - nx, ya + H, az - nz);
        d0.set(bx - nx, yb - 3, bz - nz); d1.set(bx - nx, yb + H, bz - nz);
        quad(a0, b0, b1, a1); quad(c0, d0, d1, c1); quad(a1, b1, d1, c1);
        // Merlons along the top.
        for (let s = 1.2; s < len - 0.6; s += 2.6) {
          const t = s / len;
          const x = ax + (bx - ax) * t; const z = az + (bz - az) * t;
          const merlon = add(walls, new THREE.BoxGeometry(1.3, 1.4, T * 2), stone, x, ya + (yb - ya) * t + H + 0.7, z);
          merlon.rotation.y = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
          merlon.castShadow = false;
        }
        if (k % 3 === 0) colliders.push({ x: (ax + bx) / 2, z: (az + bz) / 2, r: Math.min(3, len / 2) });
        wx += ax; wz += az; wn += 1;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(walls, g, stoneWall);
    for (const [x, z] of L.narikalaTowers) {
      const y = heightAt(x, z);
      add(walls, new THREE.CylinderGeometry(4.6, 5.4, 16, seg), stone, x, y + 6, z);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        add(walls, new THREE.BoxGeometry(1.4, 1.5, 1.2), stone, x + Math.cos(a) * 4.4, y + 14.7, z + Math.sin(a) * 4.4).rotation.y = -a;
      }
      colliders.push({ x, z, r: 5.4 });
    }
    group.add(walls);
    if (wn) {
      const cx = wx / wn; const cz = wz / wn;
      sites.narikala = { x: cx, z: cz, base: heightAt(cx, cz), top: heightAt(cx, cz) + 9 };
      pois.push({ id: 'narikala', x: cx, z: cz, r: 90 });
    }
  }

  // ── Kartlis Deda. ──
  if (L.kartlisDeda) {
    const [x, z] = L.kartlisDeda.at;
    let y = Infinity;
    for (const [px, pz] of L.kartlisDeda.outline) y = Math.min(y, heightAt(px, pz));
    const H = L.kartlisDeda.height;
    const kd = new THREE.Group();
    kd.position.set(x, y, z);
    // She looks out over the Old Town and the river.
    kd.rotation.y = faceToward([x, z], oldTown);
    add(kd, new THREE.BoxGeometry(6.4, 1.2, 5.2), stone, 0, 0.6, 0);
    add(kd, new THREE.BoxGeometry(4.2, 1.4, 3.6), stone, 0, 1.9, 0);
    const s = (H - 2.6) / 17.4;
    const body = new THREE.Group();
    body.position.y = 2.6;
    body.scale.setScalar(s);
    kd.add(body);
    add(body, new THREE.LatheGeometry([[0, 0], [1.55, 0], [1.4, 3], [1.05, 7], [0.78, 9.6], [0.72, 10.6], [0.9, 12.2], [0.88, 13.2], [0.5, 14], [0, 14.1]].map(([r, h]) => new THREE.Vector2(r, h)), seg), alu);
    add(body, new THREE.SphereGeometry(0.62, seg, seg / 2), alu, 0, 14.75, 0.05);
    add(body, new THREE.CylinderGeometry(0.28, 0.34, 0.6, 10), alu, 0, 14.05, 0);
    // Left arm forward with the bowl of wine for friends.
    const la = new THREE.Group(); la.position.set(0.95, 12.6, 0); body.add(la);
    bar(la, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, -1.3, 1.0), 0.42, alu);
    bar(la, new THREE.Vector3(0.5, -1.3, 1.0), new THREE.Vector3(0.6, -0.9, 2.5), 0.36, alu);
    add(la, new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), alu, 0.62, -0.62, 2.75);
    // Right arm down with the sword for enemies.
    const ra = new THREE.Group(); ra.position.set(-0.95, 12.6, 0); body.add(ra);
    bar(ra, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.45, -2.2, 0.35), 0.42, alu);
    bar(ra, new THREE.Vector3(-0.45, -2.2, 0.35), new THREE.Vector3(-0.55, -4.2, 0.9), 0.36, alu);
    bar(ra, new THREE.Vector3(-0.6, -4.3, 0.95), new THREE.Vector3(-0.72, -9.3, 2.3), 0.16, alu);
    bar(ra, new THREE.Vector3(-1.1, -4.4, 0.85), new THREE.Vector3(-0.05, -4.2, 1.05), 0.14, alu);
    group.add(kd);
    colliders.push({ x, z, r: 3.6 });
    sites.kartlisDeda = { x, z, base: y, top: y + H };
    pois.push({ id: 'kartlisDeda', x, z, r: 30 });
  }

  // ── Sameba. ──
  if (L.sameba.outline) {
    const out = L.sameba.outline;
    const [cx, cz] = centroid(out);
    let y = Infinity;
    for (const [px, pz] of out) y = Math.min(y, heightAt(px, pz));
    const H = L.sameba.height;
    const g = new THREE.Group();
    g.position.set(cx, y, cz);
    // The long axis of the plan orients the church.
    let lx = 1; let lz = 0; let best = 0;
    for (let k = 0; k < out.length; k++) {
      const [ax, az] = out[k]; const [bx, bz] = out[(k + 1) % out.length];
      const len = Math.hypot(bx - ax, bz - az);
      if (len > best) { best = len; lx = (bx - ax) / len; lz = (bz - az) / len; }
    }
    g.rotation.y = Math.atan2(lx, lz);
    let span = 0;
    for (const [px, pz] of out) span = Math.max(span, Math.hypot(px - cx, pz - cz));
    const half = span * 0.62;
    const body = H * 0.3;
    add(g, new THREE.BoxGeometry(half * 1.3, body, half * 1.3), sandstone, 0, body / 2, 0);
    add(g, new THREE.BoxGeometry(half * 0.9, body * 0.85, half * 1.75), sandstone, 0, body * 0.425, 0);
    add(g, new THREE.BoxGeometry(half * 1.75, body * 0.85, half * 0.9), sandstone, 0, body * 0.425, 0);
    const roofGeo = new THREE.CylinderGeometry(0.01, half * 0.9, H * 0.08, 4, 1);
    add(g, roofGeo, steelGrey, 0, body + H * 0.04, 0).rotation.y = Math.PI / 4;
    const drumR = half * 0.36;
    add(g, new THREE.CylinderGeometry(drumR, drumR * 1.08, H * 0.34, seg), sandstone, 0, body + H * 0.17, 0);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      add(g, new THREE.BoxGeometry(0.9, H * 0.12, 0.4), steelGrey, Math.sin(a) * drumR * 1.01, body + H * 0.2, Math.cos(a) * drumR * 1.01).rotation.y = a;
    }
    const domeBase = body + H * 0.34;
    add(g, new THREE.LatheGeometry([[drumR * 1.08, 0], [drumR * 1.1, H * 0.04], [drumR * 0.95, H * 0.1], [drumR * 0.55, H * 0.16], [drumR * 0.12, H * 0.2], [0, H * 0.205]].map(([r, h]) => new THREE.Vector2(r, h)), seg), gold, 0, domeBase, 0);
    add(g, new THREE.CylinderGeometry(0.5, 0.7, H * 0.04, 10), gold, 0, domeBase + H * 0.225, 0);
    const crossY = domeBase + H * 0.245;
    add(g, new THREE.BoxGeometry(0.5, H - crossY, 0.5), gold, 0, crossY + (H - crossY) / 2, 0);
    add(g, new THREE.BoxGeometry(3.2, 0.45, 0.45), gold, 0, H - (H - crossY) * 0.3, 0);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const tx = sx * half * 0.5; const tz = sz * half * 0.5;
      add(g, new THREE.CylinderGeometry(drumR * 0.4, drumR * 0.42, H * 0.12, seg), sandstone, tx, body + H * 0.06, tz);
      add(g, new THREE.SphereGeometry(drumR * 0.42, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2), gold, tx, body + H * 0.12, tz);
    }
    group.add(g);
    colliders.push({ x: cx, z: cz, r: half });
    sites.sameba = { x: cx, z: cz, base: y, top: y + H };
    pois.push({ id: 'sameba', x: cx, z: cz, r: half + 40 });
  }

  // ── The TV tower on Mtatsminda: four legs, platforms, the mast. ──
  let tvLamps: THREE.Mesh | null = null;
  if (L.tvTower.at) {
    const [x, z] = L.tvTower.at;
    const y = heightAt(x, z);
    const H = L.tvTower.height;
    const tw = new THREE.Group();
    tw.position.set(x, y, z);
    const lattice = H * 0.72;
    const width = (h: number) => 16 * (1 - h / lattice) + 2.6 * (h / lattice);
    const leg = (k: number, h: number) => { const w = width(h); const a = (k / 4) * Math.PI * 2 + Math.PI / 4; return new THREE.Vector3(Math.cos(a) * w, h, Math.sin(a) * w); };
    const levels = lite ? 10 : 18;
    for (let l = 0; l < levels; l++) {
      const h0 = (l / levels) * lattice; const h1 = ((l + 1) / levels) * lattice;
      for (let k = 0; k < 4; k++) {
        bar(tw, leg(k, h0), leg(k, h1), 1.2, redWhite);
        bar(tw, leg(k, h1), leg((k + 1) % 4, h1), 0.5, redWhite);
        bar(tw, leg(k, h0), leg((k + 1) % 4, h1), 0.4, redWhite);
      }
    }
    for (const ph of [0.3, 0.52]) add(tw, new THREE.CylinderGeometry(width(lattice * ph) + 3, width(lattice * ph) + 3, 3.2, 8), steelWhite, 0, lattice * ph, 0);
    add(tw, new THREE.CylinderGeometry(0.9, 1.5, H - lattice, 10), redWhite, 0, lattice + (H - lattice) / 2, 0);
    tvLamps = keep(add(tw, new THREE.SphereGeometry(0.9, 8, 6), redLamp, 0, H + 0.4, 0));
    tvLamps.castShadow = false;
    group.add(tw);
    sites.tvTower = { x, z, base: y, top: y + H };
  }

  // ── The wheel beside it. ──
  let rotor: THREE.Group | null = null;
  const cabins: THREE.Object3D[] = [];
  if (L.ferrisWheel) {
    const [x, z] = L.ferrisWheel.at;
    const y = heightAt(x, z);
    // OSM has no height here; the park gives 65 m.
    const H = L.ferrisWheel.height ?? 65;
    const R = H / 2 - 3;
    const wh = new THREE.Group();
    wh.position.set(x, y, z);
    wh.rotation.y = faceToward([x, z], oldTown) + Math.PI / 2;
    for (const s of [-1, 1]) {
      bar(wh, new THREE.Vector3(-14, 0, s * 5), new THREE.Vector3(0, R + 3, s * 1.6), 1.1, steelWhite);
      bar(wh, new THREE.Vector3(14, 0, s * 5), new THREE.Vector3(0, R + 3, s * 1.6), 1.1, steelWhite);
    }
    rotor = pivot(new THREE.Group());
    rotor.position.y = R + 3;
    wh.add(rotor);
    for (const s of [-1, 1]) add(rotor, new THREE.TorusGeometry(R, 0.45, 6, lite ? 48 : 80), steelWhite, 0, 0, s * 1.4);
    const n = lite ? 16 : 30;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      bar(rotor, new THREE.Vector3(0, 0, 1.4), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 1.4), 0.18, steelGrey);
      bar(rotor, new THREE.Vector3(0, 0, -1.4), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -1.4), 0.18, steelGrey);
      const cab = pivot(new THREE.Group());
      cab.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      rotor.add(cab);
      add(cab, new THREE.BoxGeometry(2.2, 2.4, 2.0), k % 3 ? steelWhite : cabinRed, 0, -1.6, 0).castShadow = false;
      cabins.push(cab);
    }
    add(rotor, new THREE.CylinderGeometry(1.4, 1.4, 4, 12), steelGrey, 0, 0, 0).rotation.x = Math.PI / 2;
    group.add(wh);
    sites.ferrisWheel = { x, z, base: y, top: y + H };
  }

  // ── The Bridge of Peace's roof: ribs and a wave of glass along the deck. ──
  const deck = L.bridgeOfPeace.deck;
  if (deck && deck.length >= 2) {
    const br = new THREE.Group();
    br.name = 'bridge-of-peace';
    const line: THREE.Vector3[] = [];
    let total = 0;
    for (let k = 0; k + 1 < deck.length; k++) total += Math.hypot(deck[k + 1][0] - deck[k][0], deck[k + 1][1] - deck[k][1]);
    const y0 = heightAt(deck[0][0], deck[0][1]) + 0.2; const y1 = heightAt(deck[deck.length - 1][0], deck[deck.length - 1][1]) + 0.2;
    const at = (s: number) => {
      let run = 0;
      for (let k = 0; k + 1 < deck.length; k++) {
        const l = Math.hypot(deck[k + 1][0] - deck[k][0], deck[k + 1][1] - deck[k][1]);
        if (run + l >= s || k === deck.length - 2) {
          const t = Math.min(1, (s - run) / (l || 1));
          return new THREE.Vector3(deck[k][0] + (deck[k + 1][0] - deck[k][0]) * t, 0, deck[k][1] + (deck[k + 1][1] - deck[k][1]) * t);
        }
        run += l;
      }
      return new THREE.Vector3(deck[0][0], 0, deck[0][1]);
    };
    const steps = Math.max(8, Math.round(total / 3));
    const glassPos: number[] = []; const glassIdx: number[] = [];
    const ribs = 9;
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * total;
      const p = at(s);
      const q = at(Math.min(total, s + 1));
      const dir = q.clone().sub(at(Math.max(0, s - 1))).setY(0).normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const base = y0 + ((y1 - y0) * s) / total + 1.2;
      // The roof rises and falls twice along the span, higher at the ends.
      const rise = 3.2 + 2.6 * Math.abs(Math.sin((s / total) * Math.PI * 2)) + 1.2 * Math.sin((s / total) * Math.PI);
      const start = glassPos.length / 3;
      for (let r = 0; r <= ribs; r++) {
        const a = (r / ribs) * Math.PI;
        const w = 4.2 * Math.cos(a); const h = rise * Math.sin(a) + 0.4;
        glassPos.push(p.x + side.x * w, base + h, p.z + side.z * w);
      }
      if (i > 0) for (let r = 0; r < ribs; r++) {
        const a = start - (ribs + 1) + r; const b = start + r;
        glassIdx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      if (i % 4 === 0) {
        const prev = new THREE.Vector3(); const cur = new THREE.Vector3();
        for (let r = 0; r <= ribs; r++) {
          const a = (r / ribs) * Math.PI;
          cur.set(p.x + side.x * 4.2 * Math.cos(a), base + rise * Math.sin(a) + 0.4, p.z + side.z * 4.2 * Math.cos(a));
          if (r > 0) bar(br, prev, cur, 0.22, steelWhite);
          prev.copy(cur);
        }
        for (const sgn of [-1, 1]) bar(br, new THREE.Vector3(p.x + side.x * 4.2 * sgn, base - 1.2, p.z + side.z * 4.2 * sgn), new THREE.Vector3(p.x + side.x * 4.2 * sgn, base + 0.4, p.z + side.z * 4.2 * sgn), 0.2, steelWhite);
      }
      line.push(p);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(glassPos, 3));
    gg.setIndex(glassIdx);
    gg.computeVertexNormals();
    const glassMesh = add(br, gg, glass);
    glassMesh.castShadow = false;
    keep(glassMesh);
    // The deck's LED strip, which Tbilisi knows it by at night.
    const ledGeom = new THREE.BufferGeometry().setFromPoints(line.map((p, i) => new THREE.Vector3(p.x, y0 + ((y1 - y0) * i) / Math.max(1, line.length - 1) + 1.25, p.z)));
    geometries.push(ledGeom);
    ledLine = new THREE.Line(ledGeom, new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0 }));
    materials.push(ledLine.material as THREE.Material);
    br.add(keep(ledLine));
    group.add(br);
    const mid = at(total / 2);
    sites.bridgeOfPeace = { x: mid.x, z: mid.z, base: (y0 + y1) / 2, top: (y0 + y1) / 2 + 8 };
    sites.bridgeWest = deck[0][0] < deck[deck.length - 1][0] ? { x: deck[0][0], z: deck[0][1], base: y0, top: y0 } : { x: deck[deck.length - 1][0], z: deck[deck.length - 1][1], base: y1, top: y1 };
    pois.push({ id: 'bridgeOfPeace', x: mid.x, z: mid.z, r: 80 });
  }

  // ── Rike Park's two tubes, along the long axis of their footprint. ──
  if (L.rikeTubes) {
    const out = L.rikeTubes.outline;
    const [cx, cz] = centroid(out);
    let sxx = 0; let szz = 0; let sxz = 0;
    for (const [x, z] of out) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
    const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    const ux = Math.cos(ang); const uz = Math.sin(ang);
    let minU = Infinity; let maxU = -Infinity; let minV = Infinity; let maxV = -Infinity;
    for (const [x, z] of out) {
      const u = (x - cx) * ux + (z - cz) * uz; const v = -(x - cx) * uz + (z - cz) * ux;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const len = maxU - minU; const wid = maxV - minV;
    const tubes = new THREE.Group();
    for (const [side, scale, lift] of [[-0.25, 0.9, 0], [0.25, 1, 5]] as const) {
      const r = (wid / 4) * scale;
      const along = (s: number) => [cx + ux * (minU + len * s) - uz * (minV + wid * (0.5 + side)), cz + uz * (minU + len * s) + ux * (minV + wid * (0.5 + side))] as Pt;
      const a = along(0.04); const b = along(0.96);
      const ya = heightAt(a[0], a[1]); const yb = heightAt(b[0], b[1]);
      const p0 = new THREE.Vector3(a[0], Math.min(ya, yb) + r * 0.75, a[1]);
      const p1 = new THREE.Vector3(b[0], Math.max(ya, yb) + r * 0.75 + lift, b[1]);
      const curve = new THREE.CatmullRomCurve3([p0, p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, r * 0.2, 0)), p1]);
      const geom = new THREE.TubeGeometry(curve, lite ? 12 : 24, r, seg, false);
      // Flared ends.
      const pp = geom.attributes.position as THREE.BufferAttribute;
      const tmp = new THREE.Vector3(); const ctr = new THREE.Vector3();
      for (let k = 0; k < pp.count; k++) {
        const ring = Math.floor(k / (seg + 1)) / (lite ? 12 : 24);
        const flare = 1 + 0.35 * Math.pow(Math.abs(ring - 0.5) * 2, 3);
        curve.getPointAt(ring, ctr);
        tmp.fromBufferAttribute(pp, k).sub(ctr).multiplyScalar(flare).add(ctr);
        pp.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
      geom.computeVertexNormals();
      add(tubes, geom, tubeSkin);
      for (const [p, n] of [[p0, p0.clone().sub(p1)], [p1, p1.clone().sub(p0)]] as const) {
        const cap = add(tubes, new THREE.CircleGeometry(r * 1.3, seg), glass, p.x, p.y, p.z);
        cap.lookAt(p.clone().add(n));
        cap.castShadow = false;
        keep(cap);
      }
      colliders.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, r: r * 1.1 });
      colliders.push({ x: a[0] * 0.8 + b[0] * 0.2, z: a[1] * 0.8 + b[1] * 0.2, r });
      colliders.push({ x: a[0] * 0.2 + b[0] * 0.8, z: a[1] * 0.2 + b[1] * 0.8, r });
    }
    group.add(tubes);
    sites.rikeTubes = { x: cx, z: cz, base: heightAt(cx, cz), top: heightAt(cx, cz) + wid / 2 };
    pois.push({ id: 'rikeTubes', x: cx, z: cz, r: len / 2 + 15 });
  }

  // ── Abanotubani: the bath houses, low under their brick domes. ──
  for (const b of L.baths) {
    if (!b.outline || b.outline.length < 3) continue;
    const out = b.outline;
    const area = Math.abs(ringArea(out));
    const [cx, cz] = centroid(out);
    let y = Infinity;
    for (const [px, pz] of out) y = Math.min(y, heightAt(px, pz));
    const chreli = /Chreli/i.test(b.name);
    const wallH = chreli ? 8.5 : 1.6;
    const shape = new THREE.Shape(out.map(([x, z]) => new THREE.Vector2(x - cx, -(z - cz))));
    const body = add(group, new THREE.ExtrudeGeometry(shape, { depth: wallH + 2, bevelEnabled: false }), chreli ? blueTile : brick, cx, y - 2, cz);
    body.rotation.x = -Math.PI / 2;
    if (!chreli) {
      const n = Math.max(1, Math.min(9, Math.round(area / 70)));
      const cols = Math.ceil(Math.sqrt(n));
      let placed = 0;
      for (let i = 0; i < cols && placed < n; i++) for (let j = 0; j < cols && placed < n; j++) {
        const px = cx + (i - (cols - 1) / 2) * 6.5; const pz = cz + (j - (cols - 1) / 2) * 6.5;
        if (!insideRing(px, pz, out)) continue;
        add(group, new THREE.SphereGeometry(2.9, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2), brick, px, y + wallH, pz);
        add(group, new THREE.CylinderGeometry(0.45, 0.55, 0.9, 8), glass, px, y + wallH + 3.2, pz).castShadow = false;
        placed += 1;
      }
    }
    sites[`bath-${b.id}`] = { x: cx, z: cz, base: y, top: y + wallH };
  }
  if (L.baths.length) {
    const [bx, bz] = L.baths.reduce((s, b) => [s[0] + b.at[0] / L.baths.length, s[1] + b.at[1] / L.baths.length], [0, 0]);
    pois.push({ id: 'abanotubani', x: bx, z: bz, r: 60 });
  }

  // ── Carved wooden balconies on the Old Town's houses, facing their streets. ──
  {
    const streets = data.roads.filter((r) => r.cls >= ROAD.residential && r.cls <= ROAD.footway && r.pts.some(([x, z]) => Math.hypot(x - oldTown[0], z - oldTown[1]) < 900));
    const near = new Map<string, Pt[]>();
    for (const r of streets) for (let k = 0; k + 1 < r.pts.length; k++) {
      const [ax, az] = r.pts[k]; const [bx, bz] = r.pts[k + 1];
      const l = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s <= l; s += 4) {
        const p: Pt = [ax + ((bx - ax) * s) / (l || 1), az + ((bz - az) * s) / (l || 1)];
        const key = `${Math.floor(p[0] / 20)},${Math.floor(p[1] / 20)}`;
        if (!near.has(key)) near.set(key, []);
        near.get(key)!.push(p);
      }
    }
    const streetDist = (x: number, z: number) => {
      let best = Infinity;
      const i = Math.floor(x / 20); const j = Math.floor(z / 20);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const p of near.get(`${i + di},${j + dj}`) ?? []) best = Math.min(best, Math.hypot(p[0] - x, p[1] - z));
      return best;
    };
    const lattice = (() => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 64;
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, 128, 64);
      g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.strokeRect(2, 2, 124, 60);
      for (let k = 0; k < 8; k++) {
        const x = 8 + k * 16;
        g.beginPath(); g.moveTo(x, 6); g.lineTo(x, 58); g.stroke();
        g.beginPath(); g.arc(x + 8, 32, 6, 0, Math.PI * 2); g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      textures.push(t);
      return t;
    })();
    const latticeMat = withHaze(new THREE.MeshStandardMaterial({ color: srgb(0.5, 0.36, 0.24), alphaMap: lattice, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), 'lattice');
    materials.push(latticeMat);
    const slab = new THREE.BoxGeometry(1, 0.18, 1.4); slab.translate(0, 0, 0.7);
    const rail = new THREE.PlaneGeometry(1, 1.05); rail.translate(0, 0.62, 1.4);
    const roof = new THREE.BoxGeometry(1.08, 0.1, 1.6); roof.translate(0, 2.75, 0.75);
    const post = new THREE.BoxGeometry(0.12, 2.7, 0.12); post.translate(0, 1.35, 1.36);
    geometries.push(slab, rail, roof, post);
    const mats: THREE.Matrix4[] = []; const posts: THREE.Matrix4[] = [];
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion();
    let count = 0;
    const limit = lite ? 160 : 420;
    for (const b of data.buildings) {
      if (count >= limit) break;
      if (b.kind !== KIND.house && b.kind !== KIND.generic && b.kind !== KIND.apartments && b.kind !== KIND.historic) continue;
      if (b.height < 6 || b.height > 17) continue;
      const out = b.rings.find((r) => !r.inner)?.pts;
      if (!out || out.length < 4) continue;
      const [cx, cz] = centroid(out);
      if (Math.hypot(cx - oldTown[0], cz - oldTown[1]) > 850) continue;
      let base = Infinity;
      for (const [x, z] of out) base = Math.min(base, heightAt(x, z));
      const ccw = ringArea(out) > 0;
      let pick = -1; let pickScore = Infinity;
      for (let k = 0; k < out.length; k++) {
        const [ax, az] = out[k]; const [bx, bz] = out[(k + 1) % out.length];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 5) continue;
        const d = streetDist((ax + bx) / 2, (az + bz) / 2);
        if (d < pickScore && d < 9) { pickScore = d; pick = k; }
      }
      if (pick < 0) continue;
      const [ax, az] = out[pick]; const [bx, bz] = out[(pick + 1) % out.length];
      const len = Math.hypot(bx - ax, bz - az);
      let nx = (bz - az) / len; let nz = -(bx - ax) / len;
      if (!ccw) { nx = -nx; nz = -nz; }
      const w = Math.min(len * 0.7, 9);
      const levels = Math.max(1, Math.min(3, Math.round(b.height / 3.6) - 1));
      for (let lv = 1; lv <= levels && count < limit; lv++) {
        const y = base + lv * 3.6;
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(nx, 0, nz));
        m4.compose(new THREE.Vector3((ax + bx) / 2, y, (az + bz) / 2), q, new THREE.Vector3(w, 1, 1));
        mats.push(m4.clone());
        for (const s of [-0.5, 0, 0.5]) {
          const pxz = new THREE.Vector3((ax + bx) / 2, y, (az + bz) / 2).addScaledVector(new THREE.Vector3(bx - ax, 0, bz - az).normalize(), s * w);
          m4.compose(pxz, q, new THREE.Vector3(1, 1, 1));
          posts.push(m4.clone());
        }
        count += 1;
      }
    }
    const inst = (g: THREE.BufferGeometry, m: THREE.Material, list: THREE.Matrix4[]) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(g, m, list.length);
      list.forEach((mm, k) => im.setMatrixAt(k, mm));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = true; im.receiveShadow = true;
      group.add(keep(im));
    };
    inst(slab, wood, mats); inst(rail, latticeMat, mats); inst(roof, woodLight, mats); inst(post, wood, posts);
  }

  const merged = mergeStatic(group, { cell: 400, minCaster: 0.8 });
  let t = 0;
  return {
    group, colliders, pois, sites,
    update(dt, night) {
      t += dt;
      glow.value = night;
      if (rotor) {
        // One turn in about eleven minutes.
        rotor.rotation.z += dt * ((Math.PI * 2) / 660);
        for (const c of cabins) c.rotation.z = -rotor.rotation.z;
      }
      if (tvLamps) tvLamps.visible = night > 0.2 && Math.sin(t * 3) > 0;
      if (ledLine) (ledLine.material as THREE.LineBasicMaterial).opacity = night * (0.6 + 0.4 * Math.sin(t * 2 + 1));
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const g of merged.geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const tx of textures) tx.dispose();
    },
  };
}
