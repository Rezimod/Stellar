// The outpost: three inflatable habitats on raised skirts with airlocks and
// ramps, greenhouse tunnels between them, a row of blue gas tanks, a solar
// field, a comms dish aimed at Earth, a cargo rover, the descent stage that
// brought the first crew, a flag, a seismometer, a sign, two mast lights.
// Everything sits on the terrain's own height, and every footprint is also a
// collider so the cosmonaut walks around it rather than through it — except
// the habitats, which are walked into: up the ramp, through the airlock,
// onto a floor with bunks, benches and a gym under the lit restraint layer.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import { PAD_CENTER } from '@/lib/solar-system/moon-terrain';
import type { RoverParts } from '@/lib/solar-system/moon-rover';

export interface PointOfInterest {
  id: string;
  x: number;
  z: number;
  /** Approach radius that names it on the HUD. */
  r: number;
}

export interface Airlock {
  x: number; z: number; yaw: number;
  panel: THREE.Mesh;
  /** 0 shut … 1 open. */
  open: number;
}

/** A habitat the crew can stand in. */
export interface Inside { id: string; x: number; z: number; y: number }

export interface BaseHandle {
  group: THREE.Group;
  /** Every footprint — what the rover and the meteoroids keep out of. */
  colliders: Collider[];
  /** The footprints the crew keeps out of on foot: the habitats are not
   *  among them, since the crew goes inside. */
  walkColliders: Collider[];
  /** The floor under a point on the base's own structure — a ramp, an
   *  airlock, a dome — or null on open ground. */
  floorAt: (x: number, z: number) => number | null;
  /** Keep a walker on the ramps, inside the dome walls, and out of the
   *  domes from outside: only the ramp leads in. */
  confine: (p: { x: number; z: number }) => void;
  /** The habitat the crew is standing in, if any. */
  inside: Inside | null;
  pois: PointOfInterest[];
  /** Where the crew steps out. */
  spawn: THREE.Vector3;
  airlocks: Airlock[];
  /** The rover: its group (driven by moon-rover), its collider (moved with
   *  it), and the parts the drive articulates. */
  rover: THREE.Group;
  roverCollider: Collider;
  roverParts: RoverParts;
  /** Blink the beacons, turn the dish, slide the airlocks. */
  update: (dt: number, t: number, earthDir: THREE.Vector3, crewX: number, crewZ: number) => void;
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
  const airlocks: Airlock[] = [];
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
  // Inside the habitats.
  const innerWall = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.92, metalness: 0, side: THREE.BackSide });
  const deck = new THREE.MeshStandardMaterial({ color: 0x4c5158, roughness: 0.55, metalness: 0.35 });
  const locker = new THREE.MeshStandardMaterial({ color: 0xb9bdc3, roughness: 0.5, metalness: 0.3 });
  const lockerDark = new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.5, metalness: 0.4 });
  const roomLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfff3dc), emissiveIntensity: 2.2 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x06202a, emissive: new THREE.Color(0x5eead4), emissiveIntensity: 0.9, roughness: 0.3 });
  const bedding = new THREE.MeshStandardMaterial({ color: 0x1f3f8a, roughness: 0.95, metalness: 0 });
  const pillow = new THREE.MeshStandardMaterial({ color: 0xeeeee8, roughness: 0.95, metalness: 0 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.7, metalness: 0 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.98, metalness: 0 });
  const owned: THREE.Material[] = [white, skirt, alu, steel, dark, gold, tankBlue, tankNavy, panel, greenhouse, leaf, soil, glass, beacon, lamp, airlockLight,
    innerWall, deck, locker, lockerDark, roomLight, screen, bedding, pillow, wood, rubber];
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
  interface Hab { id: string; x: number; z: number; yaw: number; cy: number; lamp: THREE.PointLight }
  const habs: Hab[] = [];
  const habColliders = new Set<Collider>();
  const habCollider = (c: Collider) => { colliders.push(c); habColliders.add(c); };
  /** The floor levels of a habitat, in its own frame: the dome's deck over
   *  the skirt, the airlock landing, and the ramp running down to the
   *  ground from it. */
  const FLOOR = 1.95;
  const LANDING = 1.74;
  const DOME_R = 5.0;
  const RAMP_END = 11.9;
  const rampY = (lz: number) => LANDING - (lz - 6.7) * (1.56 / 5.2);
  /** Sphere phi runs from -X, so π/2 is straight ahead (+Z): the doorway
   *  is a gap in the lower band of the dome, centred on the airlock. */
  const DOOR_GAP = 0.26;
  const DOOR_THETA = 1.05;
  const habitat = (x: number, z: number, yaw: number, id: string) => {
    const g = place(x, z, yaw);
    // Four legs and a ring skirt, then the dome on top.
    for (const [lx, lz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) {
      mesh(g, new THREE.CylinderGeometry(0.16, 0.2, 1.1, 10), steel, lx, 0.55, lz);
      mesh(g, new THREE.CylinderGeometry(0.6, 0.6, 0.08, 12), steel, lx, 0.04, lz);
    }
    mesh(g, new THREE.CylinderGeometry(5.4, 5.6, 0.9, seg), skirt, 0, 1.5, 0);
    // The dome in two pieces — a cap, and a lower band with the doorway cut
    // out where the airlock module covers it from outside.
    const cap = mesh(g, new THREE.SphereGeometry(5.4, seg, seg / 2, 0, Math.PI * 2, 0, DOOR_THETA), white, 0, 1.95, 0);
    cap.scale.set(1, 0.86, 1);
    const dome = mesh(g, new THREE.SphereGeometry(5.4, seg, seg / 2, Math.PI / 2 + DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP, DOOR_THETA, Math.PI * 0.62 - DOOR_THETA), white, 0, 1.95, 0);
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
    // A lit chamber behind the door — it reaches back through the doorway
    // into the dome — and the door itself slides up into the frame.
    mesh(g, new THREE.BoxGeometry(1.3, 2.0, 2.5), skirt, 0, 2.95, 5.5).material = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6, side: THREE.BackSide });
    mesh(g, new THREE.BoxGeometry(1.3, 0.06, 2.5), deck, 0, FLOOR, 5.5);
    mesh(g, new THREE.BoxGeometry(0.6, 0.04, 0.6), airlockLight, 0, 3.55, 5.9);
    const door = mesh(g, new THREE.BoxGeometry(1.1, 1.9, 0.1), skirt, 0, 2.55, 6.72);
    mesh(door, new THREE.BoxGeometry(0.28, 0.28, 0.06), glass, 0.0, 0.45, 0.06);
    mesh(g, new THREE.BoxGeometry(1.3, 0.12, 0.16), dark, 0, 3.6, 6.72);
    airlocks.push({ x: x + Math.sin(yaw) * 6.9, z: z + Math.cos(yaw) * 6.9, yaw, panel: door, open: 0 });
    mesh(g, new THREE.BoxGeometry(0.5, 0.06, 0.06), airlockLight, 0, 3.85, 6.74);
    const ramp = mesh(g, new THREE.BoxGeometry(1.6, 0.12, 5.2), alu, 0, 0.9, 9.3);
    ramp.rotation.x = Math.atan2(1.5, 5);
    for (const s of [-1, 1]) {
      const rail = mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 5.3, 6), steel, s * 0.8, 1.75, 9.3);
      rail.rotation.x = Math.PI / 2 + Math.atan2(1.5, 5);
    }
    mesh(g, new THREE.BoxGeometry(1.6, 0.12, 1.2), alu, 0, 1.68, 6.9);
    const rampX = x + Math.sin(yaw) * 9.3; const rampZ = z + Math.cos(yaw) * 9.3;
    habCollider({ x: rampX, z: rampZ, r: 2.2 });
    // Beacon on top.
    mesh(g, new THREE.SphereGeometry(0.16, 10, 8), beacon, 0, 6.75, 0);
    habCollider({ x: x, z: z, r: 5.9 });
    const doorX = x + Math.sin(yaw) * 6.5; const doorZ = z + Math.cos(yaw) * 6.5;
    habCollider({ x: doorX, z: doorZ, r: 1.5 });
    pois.push({ id, x: x + Math.sin(yaw) * 9, z: z + Math.cos(yaw) * 9, r: 6 });
    pois.push({ id, x, z, r: 5.3 });

    // ── Inside: the restraint layer seen from within, a deck over the
    // skirt, a ring of lockers clear of the door, a light ring, and what
    // the module is for. ──
    const inner = mesh(g, new THREE.SphereGeometry(5.25, seg, seg / 2, Math.PI / 2 + DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP, DOOR_THETA, Math.PI * 0.62 - DOOR_THETA), innerWall, 0, 1.95, 0);
    inner.scale.set(1, 0.86, 1);
    const innerCap = mesh(g, new THREE.SphereGeometry(5.25, seg, seg / 2, 0, Math.PI * 2, 0, DOOR_THETA), innerWall, 0, 1.95, 0);
    innerCap.scale.set(1, 0.86, 1);
    inner.castShadow = innerCap.castShadow = false;
    const floor = mesh(g, new THREE.CylinderGeometry(DOME_R + 0.1, DOME_R + 0.1, 0.06, seg), deck, 0, FLOOR, 0);
    floor.castShadow = false;
    // Deck plate seams.
    for (let i = 0; i < 4; i++) {
      const seam = mesh(g, new THREE.BoxGeometry(0.03, 0.005, DOME_R * 2), lockerDark, 0, FLOOR + 0.035, 0);
      seam.rotation.y = (i / 4) * Math.PI;
      seam.castShadow = false;
    }
    mesh(g, new THREE.TorusGeometry(2.7, 0.06, 8, seg), roomLight, 0, 5.5, 0).rotation.x = Math.PI / 2;
    mesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), roomLight, 0, 6.0, 0);
    const habLamp = new THREE.PointLight(0xfff1dc, 0, 18, 1.6);
    habLamp.position.set(0, 4.9, 0);
    g.add(habLamp);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      // Lockers and consoles face the room; none where the door is.
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.6) continue;
      const unit = mesh(g, new THREE.BoxGeometry(0.95, 1.9, 0.42), i % 3 === 0 ? lockerDark : locker, Math.sin(a) * 4.35, FLOOR + 0.98, Math.cos(a) * 4.35);
      unit.rotation.y = a + Math.PI;
      unit.castShadow = false;
      if (i % 3 === 1) mesh(unit, new THREE.PlaneGeometry(0.62, 0.36), screen, 0, 0.4, 0.215);
      else mesh(unit, new THREE.BoxGeometry(0.06, 0.4, 0.03), lockerDark, 0.3, 0, 0.22);
    }
    /** A piece of furniture at a bearing and range from the centre, turned
     *  to face it. */
    const at = (a: number, r: number, geometry: THREE.BufferGeometry, m: THREE.Material, dy: number, dx = 0) => {
      const o = mesh(g, geometry, m, Math.sin(a) * r + Math.cos(a) * dx, FLOOR + dy, Math.cos(a) * r - Math.sin(a) * dx);
      o.rotation.y = a;
      o.castShadow = false;
      return o;
    };
    if (id === 'habitatA') {
      // Crew quarters: four bunks along the wall and a table in the middle.
      for (const a of [1.7, 2.6, -1.7, -2.6]) {
        at(a, 3.5, new THREE.BoxGeometry(2.0, 0.34, 0.9), locker, 0.45);
        at(a, 3.5, new THREE.BoxGeometry(1.94, 0.1, 0.84), bedding, 0.67);
        at(a, 3.5, new THREE.BoxGeometry(0.5, 0.1, 0.5), pillow, 0.75, -0.7);
        at(a, 3.9, new THREE.BoxGeometry(2.0, 0.34, 0.9), locker, 1.55);
        at(a, 3.9, new THREE.BoxGeometry(1.94, 0.1, 0.84), bedding, 1.77);
      }
      at(0, 0, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 24), wood, 0.78);
      at(0, 0, new THREE.CylinderGeometry(0.08, 0.12, 0.76, 10), steel, 0.38);
      for (const a of [0.6, 2.7, 4.8]) at(a, 1.35, new THREE.CylinderGeometry(0.2, 0.2, 0.46, 12), lockerDark, 0.23);
    } else if (id === 'habitatB') {
      // Lab and galley: two benches under screens, a counter across the back.
      for (const a of [2.1, -2.1]) {
        at(a, 3.3, new THREE.BoxGeometry(2.4, 0.9, 0.75), locker, 0.45);
        at(a, 3.3, new THREE.BoxGeometry(2.36, 0.04, 0.72), lockerDark, 0.92);
        at(a, 3.3, new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), steel, 1.17, 0.6);
        at(a, 3.3, new THREE.BoxGeometry(0.4, 0.3, 0.3), lockerDark, 1.1, -0.5);
        for (const dx of [-0.75, 0, 0.75]) at(a, 4.0, new THREE.PlaneGeometry(0.6, 0.38), screen, 1.75, dx).rotation.y = a + Math.PI;
      }
      at(Math.PI, 3.6, new THREE.BoxGeometry(2.6, 0.9, 0.7), locker, 0.45);
      at(Math.PI, 3.6, new THREE.BoxGeometry(2.56, 0.04, 0.66), lockerDark, 0.92);
      at(Math.PI, 3.6, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), steel, 0.95, 0.7);
      at(Math.PI, 3.6, new THREE.BoxGeometry(0.34, 0.42, 0.34), lockerDark, 1.15, -0.8);
      at(Math.PI, 3.6, new THREE.BoxGeometry(0.12, 0.12, 0.02), screen, 1.25, -0.8);
    } else {
      // Medical bay and gym: a bed under its monitor, a treadmill, a cabinet.
      at(2.3, 3.4, new THREE.BoxGeometry(2.0, 0.55, 0.85), pillow, 0.5);
      at(2.3, 3.4, new THREE.BoxGeometry(2.0, 0.08, 0.85), locker, 0.2);
      at(2.3, 3.4, new THREE.BoxGeometry(0.45, 0.1, 0.5), bedding, 0.82, -0.7);
      at(2.3, 4.1, new THREE.PlaneGeometry(0.7, 0.42), screen, 1.85).rotation.y = 2.3 + Math.PI;
      at(-2.3, 3.2, new THREE.BoxGeometry(0.85, 0.22, 1.9), rubber, 0.11);
      at(-2.3, 3.2, new THREE.BoxGeometry(0.3, 0.9, 0.06), steel, 0.6, 0.55);
      at(-2.3, 3.2, new THREE.BoxGeometry(0.3, 0.9, 0.06), steel, 0.6, -0.55);
      at(-2.3, 3.2, new THREE.BoxGeometry(1.3, 0.06, 0.06), steel, 1.03);
      at(Math.PI, 3.8, new THREE.BoxGeometry(1.8, 1.9, 0.5), locker, 0.95);
      at(Math.PI, 3.8, new THREE.PlaneGeometry(1.6, 1.2), glass, 1.05);
      at(Math.PI + 0.9, 3.4, new THREE.CylinderGeometry(0.16, 0.16, 1.0, 12), steel, 0.5);
      at(Math.PI + 0.9, 3.4, new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), lockerDark, 1.02);
    }
    habs.push({ id, x, z, yaw, cy: g.position.y, lamp: habLamp });
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

  // ── The rover: a rocker-bogie six-wheeler — six spoked aluminium wheels
  // on two rockers and two bogies so every wheel keeps the ground on any
  // slope — with a crew seat and roll cage up front, a camera mast beside
  // it, a stowed arm, a finned RTG canted up at the back, a high-gain dish,
  // a whip antenna, and headlights that come on when it is driven. ──
  const rover = place(px + 12, pz + 10, 0.9);
  const roverCollider: Collider = { x: px + 12, z: pz + 10, r: 2.8 };
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.45, metalness: 0.7 });
  const tread = new THREE.MeshStandardMaterial({ color: 0x8b8f95, roughness: 0.7, metalness: 0.5 });
  const rtgMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.5 });
  const rtgHot = new THREE.MeshStandardMaterial({ color: 0x552200, emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0.9 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2a44, roughness: 0.9, metalness: 0 });
  owned.push(wheelMat, tread, rtgMat, rtgHot, seatMat);
  const brakeLight = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: new THREE.Color(0xff2a1a), emissiveIntensity: 0.15, roughness: 0.4 });
  owned.push(brakeLight);
  const roverParts: RoverParts = { spin: [], steer: [], rockers: [], bogies: [], wheelXZ: [], mast: new THREE.Group(), headlight: new THREE.SpotLight(0xfff4dc, 0, 24, 0.55, 0.5, 1.2), arm: [], brakeLight };
  {
    const g = rover;
    const up = new THREE.Vector3(0, 1, 0);
    /** A strut between two points. */
    const strut = (parent: THREE.Object3D, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r = 0.05) => {
      const dx = bx - ax; const dy = by - ay; const dz = bz - az;
      const len = Math.hypot(dx, dy, dz);
      const m = mesh(parent, new THREE.CylinderGeometry(r, r, len, 8), steel, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      m.quaternion.setFromUnitVectors(up, new THREE.Vector3(dx, dy, dz).normalize());
      return m;
    };
    // The body: the warm electronics box under a solar deck, wings out.
    mesh(g, new THREE.BoxGeometry(2.0, 0.5, 2.9), white, 0, 1.55, -0.1);
    mesh(g, new THREE.BoxGeometry(1.9, 0.04, 2.4), panel, 0, 1.82, -0.4);
    for (const sd of [-1, 1]) {
      mesh(g, new THREE.BoxGeometry(0.8, 0.03, 1.6), panel, sd * 1.3, 1.84, -0.7);
      strut(g, sd * 0.95, 1.8, -0.7, sd * 1.65, 1.82, -0.7, 0.025);
    }
    mesh(g, new THREE.BoxGeometry(1.2, 0.12, 0.1), steel, 0, 1.3, 0.3);
    // Crew seat, roll cage, tiller and a dash.
    mesh(g, new THREE.BoxGeometry(0.72, 0.16, 0.6), seatMat, 0, 1.9, 0.85);
    mesh(g, new THREE.BoxGeometry(0.72, 0.6, 0.14), seatMat, 0, 2.25, 0.55);
    for (const sd of [-1, 1]) {
      strut(g, sd * 0.46, 1.8, 1.3, sd * 0.46, 2.9, 1.1, 0.035);
      strut(g, sd * 0.46, 1.8, 0.35, sd * 0.46, 2.9, 0.45, 0.035);
      strut(g, sd * 0.46, 2.9, 1.1, sd * 0.46, 2.9, 0.45, 0.035);
    }
    strut(g, -0.46, 2.9, 1.1, 0.46, 2.9, 1.1, 0.035);
    strut(g, -0.46, 2.9, 0.45, 0.46, 2.9, 0.45, 0.035);
    mesh(g, new THREE.BoxGeometry(0.5, 0.05, 0.16), dark, 0, 2.15, 1.32);
    mesh(g, new THREE.BoxGeometry(0.34, 0.2, 0.03), screen, 0, 2.3, 1.36).rotation.x = -0.35;
    // A glass canopy over the cage, a name plaque on the flank, brake lights.
    const canopy = mesh(g, new THREE.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), glass, 0, 2.45, 0.8);
    canopy.scale.set(1, 0.75, 1.15);
    canopy.castShadow = false;
    const plaqueTex = plaque(['STELLAR', 'ROVER 1'], 256, 128, '#e9e9e4', '#1b1f26', 40);
    textures.push(plaqueTex);
    const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.7 });
    owned.push(plaqueMat);
    for (const sd of [-1, 1]) {
      const pl = mesh(g, new THREE.PlaneGeometry(0.7, 0.35), plaqueMat, sd * 1.005, 1.55, -0.2);
      pl.rotation.y = sd * Math.PI / 2;
      mesh(g, new THREE.BoxGeometry(0.22, 0.08, 0.04), brakeLight, sd * 0.7, 1.5, -1.56);
    }
    // The mast with its camera head; the head looks where the rover is steered.
    mesh(g, new THREE.CylinderGeometry(0.07, 0.09, 1.5, 10), alu, 0.62, 2.55, 1.25);
    roverParts.mast.position.set(0.62, 3.35, 1.25);
    g.add(roverParts.mast);
    mesh(roverParts.mast, new THREE.BoxGeometry(0.5, 0.26, 0.32), white);
    for (const sd of [-1, 1]) mesh(roverParts.mast, new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), dark, sd * 0.15, 0, 0.18).rotation.x = Math.PI / 2;
    mesh(roverParts.mast, new THREE.CircleGeometry(0.05, 12), lamp, 0, -0.06, 0.245);
    // The arm: a shoulder on the front corner, an upper arm, an elbow, a
    // forearm with the turret of tools at the end. Stowed across the front
    // on the move; the drive unfolds it when the rover stands.
    const shoulder = new THREE.Group();
    shoulder.position.set(-0.55, 1.45, 1.35);
    g.add(shoulder);
    mesh(shoulder, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), steel);
    strut(shoulder, 0, 0, 0, 0.9, 0.1, 0.35, 0.05);
    const elbow = new THREE.Group();
    elbow.position.set(0.9, 0.1, 0.35);
    shoulder.add(elbow);
    elbow.rotation.x = -0.9;
    mesh(elbow, new THREE.SphereGeometry(0.07, 12, 10), steel);
    strut(elbow, 0, 0, 0, -0.5, -0.25, 0.5, 0.045);
    mesh(elbow, new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12), dark, -0.5, -0.25, 0.5).rotation.x = Math.PI / 2;
    for (let tool = 0; tool < 4; tool++) {
      const a = tool * Math.PI / 2;
      mesh(elbow, new THREE.CylinderGeometry(0.025, 0.02, 0.12, 8), steel, -0.5 + Math.cos(a) * 0.1, -0.25 + Math.sin(a) * 0.1, 0.66).rotation.x = Math.PI / 2;
    }
    roverParts.arm.push(shoulder, elbow);
    // The RTG on the back, canted up, finned, warm at the core.
    const rtg = new THREE.Group();
    rtg.position.set(0, 1.95, -1.6);
    rtg.rotation.x = -0.6;
    g.add(rtg);
    mesh(rtg, new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12), rtgMat).rotation.x = Math.PI / 2;
    for (let f = 0; f < 8; f++) mesh(rtg, new THREE.BoxGeometry(0.02, 0.5, 0.74), rtgMat).rotation.z = f * Math.PI / 8;
    mesh(rtg, new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), rtgHot, 0, 0, -0.42).rotation.x = Math.PI / 2;
    // High-gain dish on its post, and the UHF whip.
    strut(g, -0.7, 1.8, -1.0, -0.7, 2.45, -1.0, 0.04);
    mesh(g, new THREE.CylinderGeometry(0.34, 0.1, 0.12, 20, 1, true), alu, -0.7, 2.55, -1.0).rotation.x = -0.9;
    strut(g, 0.75, 1.8, -1.2, 0.75, 2.95, -1.2, 0.02);
    // Headlights, and the beam they throw when driven.
    for (const sd of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.18, 0.1, 0.06), lamp, sd * 0.7, 1.55, 1.36);
    roverParts.headlight.position.set(0, 1.6, 1.4);
    roverParts.headlight.target.position.set(0, 0.4, 9);
    g.add(roverParts.headlight, roverParts.headlight.target);
    // Rocker-bogie, both sides: the rocker carries the front wheel and the
    // bogie; the bogie carries the middle and rear wheels. A differential
    // bar across the top ties the rockers.
    mesh(g, new THREE.BoxGeometry(2.3, 0.08, 0.08), steel, 0, 1.32, 0.3);
    const wheel = (parent: THREE.Object3D, x: number, y: number, z: number, steerable: boolean) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      parent.add(pivot);
      const hub = new THREE.Group();
      pivot.add(hub);
      mesh(hub, new THREE.CylinderGeometry(0.55, 0.55, 0.42, lite ? 20 : 36), wheelMat).rotation.z = Math.PI / 2;
      // Chevron cleats: each a pair of bars meeting at the centreline, the
      // whole tread merged into one geometry so a wheel is one draw call.
      const cleats: THREE.BufferGeometry[] = [];
      const count = lite ? 14 : 22;
      for (let tr = 0; tr < count; tr++) {
        const a = (tr / count) * Math.PI * 2;
        for (const half of [-1, 1]) {
          const bar = new THREE.BoxGeometry(0.2, 0.05, 0.07);
          bar.rotateZ(half * 0.5);
          bar.rotateX(-a);
          bar.translate(half * 0.11, Math.cos(a) * 0.565, Math.sin(a) * 0.565);
          cleats.push(bar);
        }
      }
      const treadGeom = mergeGeometries(cleats, false);
      for (const c of cleats) c.dispose();
      if (treadGeom) mesh(hub, treadGeom, tread);
      mesh(hub, new THREE.CylinderGeometry(0.2, 0.2, 0.46, 12), dark).rotation.z = Math.PI / 2;
      for (let sp = 0; sp < 3; sp++) mesh(hub, new THREE.BoxGeometry(0.47, 0.9, 0.05), steel).rotation.x = sp * Math.PI / 3;
      roverParts.spin.push(hub);
      if (steerable) roverParts.steer.push(pivot);
    };
    for (const sd of [-1, 1]) {
      const rocker = new THREE.Group();
      rocker.position.set(sd * 1.05, 1.15, 0.3);
      g.add(rocker);
      roverParts.rockers.push(rocker);
      strut(rocker, 0, 0, 0, sd * 0.3, -0.6, 1.25);
      strut(rocker, 0, 0, 0, 0, -0.3, -0.85);
      mesh(rocker, new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), dark).rotation.z = Math.PI / 2;
      wheel(rocker, sd * 0.3, -0.6, 1.25, true);
      const bogie = new THREE.Group();
      bogie.position.set(0, -0.3, -0.85);
      rocker.add(bogie);
      roverParts.bogies.push(bogie);
      strut(bogie, 0, 0, 0, sd * 0.3, -0.3, 0.35);
      strut(bogie, 0, 0, 0, sd * 0.3, -0.3, -1.0);
      mesh(bogie, new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10), dark).rotation.z = Math.PI / 2;
      wheel(bogie, sd * 0.3, -0.3, 0.35, false);
      wheel(bogie, sd * 0.3, -0.3, -1.0, true);
      roverParts.wheelXZ.push([sd * 1.35, 1.55], [sd * 1.35, -0.2], [sd * 1.35, -1.55]);
    }
    colliders.push(roverCollider);
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
  const roverPoi = pois.find((p) => p.id === 'rover')!;
  const walkColliders = colliders.filter((c) => !habColliders.has(c));

  // ── Standing on a habitat. ──
  const lp = { x: 0, z: 0 };
  /** World → a habitat's own frame (its yaw undone). */
  const local = (h: Hab, x: number, z: number) => {
    const dx = x - h.x; const dz = z - h.z;
    const c = Math.cos(h.yaw); const s = Math.sin(h.yaw);
    lp.x = dx * c - dz * s;
    lp.z = dx * s + dz * c;
  };
  /** The floor under a point of a habitat, or null off its structure. */
  const structure = (h: Hab, lx: number, lz: number): number | null => {
    if (Math.hypot(lx, lz) < DOME_R) return h.cy + FLOOR;
    if (Math.abs(lx) < 0.75) {
      if (lz >= 4.2 && lz < 6.75) return h.cy + FLOOR;
      if (lz >= 6.75 && lz < 7.5) return h.cy + LANDING;
      if (lz >= 7.5 && lz <= RAMP_END) return h.cy + rampY(lz);
    }
    return null;
  };
  const floorAt = (x: number, z: number): number | null => {
    for (const h of habs) {
      local(h, x, z);
      if (Math.hypot(lp.x, lp.z) > 13) continue;
      const y = structure(h, lp.x, lp.z);
      if (y !== null) return y;
    }
    return null;
  };
  const confine = (p: { x: number; z: number }) => {
    for (const h of habs) {
      local(h, p.x, p.z);
      let lx = lp.x; let lz = lp.z;
      const r = Math.hypot(lx, lz);
      if (r > 13) continue;
      let moved = false;
      if (structure(h, lx, lz) !== null) {
        if (r < DOME_R) {
          // On the deck: the wall, open only where the doorway is.
          const doorway = Math.abs(lx) < 0.75 && lz > 3.8;
          if (!doorway && r > DOME_R - 0.55) { const k = (DOME_R - 0.55) / r; lx *= k; lz *= k; moved = true; }
        } else if (Math.abs(lx) > 0.62) {
          // The airlock's walls and the ramp's rails.
          lx = Math.sign(lx) * 0.62; moved = true;
        }
      } else if (r < 5.95 && !(Math.abs(lx) < 0.75 && lz > 4.0)) {
        // Outside: off the skirt and the legs …
        const k = 5.95 / r; lx *= k; lz *= k; moved = true;
      } else if (Math.abs(lx) < 1.25 && lz > 4.0 && lz < 11.5) {
        // … and off the sides of the airlock module and the ramp — the ramp
        // is climbed from its foot.
        lx = Math.sign(lx || 1) * 1.25; moved = true;
      }
      if (moved) {
        const c = Math.cos(h.yaw); const s = Math.sin(h.yaw);
        p.x = h.x + lx * c + lz * s;
        p.z = h.z - lx * s + lz * c;
      }
    }
  };

  const handle: BaseHandle = {
    group, colliders, walkColliders, pois, spawn, airlocks, rover, roverCollider, roverParts, floorAt, confine, inside: null,
    update(dt, t, earthDir, crewX, crewZ) {
      // Which habitat the crew is in; its light comes up as they enter.
      let inside: Inside | null = null;
      for (const h of habs) {
        local(h, crewX, crewZ);
        const r = Math.hypot(lp.x, lp.z);
        const here = r < DOME_R || (Math.abs(lp.x) < 0.75 && lp.z >= 4.2 && lp.z < 6.75);
        if (here) inside = { id: h.id, x: h.x, z: h.z, y: h.cy + FLOOR };
        h.lamp.intensity += ((here ? 1.6 : 0) - h.lamp.intensity) * (1 - Math.exp(-dt * 3));
      }
      handle.inside = inside;
      const blink = (Math.sin(t * 2.2) > 0.6 ? 1 : 0.15) * 2;
      for (const m of beaconMats) m.emissiveIntensity = blink;
      // The dish tracks Earth.
      dishHead.getWorldPosition(tmp).add(earthDir);
      dishHead.lookAt(tmp);
      // Airlock doors slide up when the crew comes to the foot of the ramp.
      for (const a of airlocks) {
        const near = Math.hypot(crewX - a.x, crewZ - a.z) < 7;
        a.open += ((near ? 1 : 0) - a.open) * (1 - Math.exp(-dt * 2.2));
        a.panel.position.y = 2.55 + a.open * 1.75;
      }
      roverPoi.x = roverCollider.x;
      roverPoi.z = roverCollider.z;
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
  return handle;
}
