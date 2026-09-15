// The outpost's core: three inflatable habitats under quilted micrometeoroid
// blankets and restraint straps, on skirts with their equipment and
// radiators, a hard collar and hatch on top, a hard airlock module at the
// front with its control panel and status lamp, a ramp down to the regolith,
// and pressurised tunnels between them. The crew walks inside: up the ramp,
// cycle the airlock, onto a deck with bunks, benches and a gym under the lit
// restraint layer. Around them moon-base-zones builds the working outpost,
// moon-rover-mesh the rover; the first crew's descent stage stands out past
// the landing zone, where it came down; the flag and the sign between.
//
// Everything sits on the terrain's own height. Every footprint is a
// collider — the habitats only for vehicles, since the crew goes in.

import * as THREE from 'three';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';
import { PAD_CENTER } from '@/lib/solar-system/moon-terrain';
import type { RoverParts } from '@/lib/solar-system/moon-rover';
import { keep, mergeStatic, pivot } from '@/lib/solar-system/moon-batch';
import type { LightPool } from '@/lib/solar-system/moon-lights';
import type { Kit } from '@/lib/solar-system/moon-kit';
import { buildRover } from '@/lib/solar-system/moon-rover-mesh';
import { buildZones, type ZonesHandle } from '@/lib/solar-system/moon-base-zones';

export interface PointOfInterest {
  id: string;
  x: number;
  z: number;
  /** Approach radius that names it on the HUD. */
  r: number;
}

export interface Airlock {
  habitat: string;
  /** The door, world metres, and the module's facing. */
  x: number; z: number; yaw: number;
  panel: THREE.Mesh;
  /** 0 shut … 1 open, as drawn. */
  open: number;
  state: 'closed' | 'cycling' | 'open';
  /** 0…1 through an equalisation cycle. */
  cycle: number;
  lamp: THREE.MeshStandardMaterial;
}

/** A habitat the crew can stand in. */
export interface Inside { id: string; x: number; z: number; y: number }

export interface BaseHandle {
  group: THREE.Group;
  /** Every footprint — what the rover and the meteoroids keep out of. */
  colliders: Collider[];
  /** The footprints the crew keeps out of on foot: not the habitats. */
  walkColliders: Collider[];
  /** The floor under a point on the base's own structure, or null on open ground. */
  floorAt: (x: number, z: number) => number | null;
  /** Keep a walker on the ramps, inside the dome walls, out of the domes
   *  from outside, and on their own side of a shut airlock door. */
  confine: (p: { x: number; z: number }) => void;
  inside: Inside | null;
  pois: PointOfInterest[];
  spawn: THREE.Vector3;
  airlocks: Airlock[];
  /** Start an equalisation cycle, or shut an open door. */
  cycleAirlock: (a: Airlock) => void;
  rover: THREE.Group;
  roverCollider: Collider;
  roverParts: RoverParts;
  zones: ZonesHandle;
  update: (dt: number, t: number, earthDir: THREE.Vector3, crewX: number, crewZ: number) => void;
  dispose: () => void;
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

const CYCLE_SECONDS = 1.4;
const LAMP = { closed: 0xff3b2e, cycling: 0xffb347, open: 0x4dff88 } as const;

export function makeMoonBase(
  heightAt: (x: number, z: number) => number,
  lite: boolean,
  kit: Kit,
  sunDir: THREE.Vector3,
  lights?: LightPool,
): BaseHandle {
  const m = kit.mat;
  const group = new THREE.Group();
  group.name = 'moon-base';
  const colliders: Collider[] = [];
  const pois: PointOfInterest[] = [];
  const airlocks: Airlock[] = [];
  const textures: THREE.Texture[] = [];
  const std = (p: THREE.MeshStandardMaterialParameters) => { const x = new THREE.MeshStandardMaterial(p); owned.push(x); return x; };
  const owned: THREE.Material[] = [];
  // Inside the habitats.
  const innerWall = std({ color: 0xb4b2ab, roughness: 0.95, metalness: 0, side: THREE.BackSide });
  const chamber = std({ color: 0x9aa0a8, roughness: 0.6, side: THREE.BackSide });
  const locker = std({ color: 0xb9bdc3, roughness: 0.5, metalness: 0.3 });
  const lockerDark = std({ color: 0x2e3238, roughness: 0.5, metalness: 0.4 });
  const roomLight = std({ color: 0xffffff, emissive: new THREE.Color(0xfff3dc), emissiveIntensity: 2.2 });
  const bedding = std({ color: 0x1f3f8a, roughness: 0.95, metalness: 0 });
  const pillow = std({ color: 0xeeeee8, roughness: 0.95, metalness: 0 });
  const wood = std({ color: 0x8a6a48, roughness: 0.7, metalness: 0 });
  const leaf = std({ color: 0x3e8a35, roughness: 0.8 });
  const soil = std({ color: 0x3b2c22, roughness: 1 });
  const beacon = std({ color: 0x2a1a06, emissive: new THREE.Color(0xffb347), emissiveIntensity: 2 });
  const mesh = kit.mesh;
  const noShadow = <T extends THREE.Mesh>(o: T) => { o.castShadow = false; return o; };
  const place = (x: number, z: number, yaw = 0): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = yaw;
    group.add(g);
    return g;
  };
  const seg = lite ? 24 : 40;

  // ── Habitats. ──
  interface Hab { id: string; x: number; z: number; yaw: number; cy: number; glow: number; airlock: Airlock }
  const habs: Hab[] = [];
  const habColliders = new Set<Collider>();
  const habCollider = (c: Collider) => { colliders.push(c); habColliders.add(c); };
  /** Floor levels in a habitat's own frame: the dome deck over the skirt,
   *  the airlock landing, and the ramp running down from it. */
  const FLOOR = 1.95;
  const LANDING = 1.74;
  const DOME_R = 5.0;
  const RAMP_END = 11.9;
  const rampY = (lz: number) => LANDING - (lz - 6.7) * (1.56 / 5.2);
  /** Sphere phi runs from −X, so π/2 is straight ahead (+Z): the doorway
   *  is a gap in the lower band of the dome, centred on the airlock. */
  const DOOR_GAP = 0.42;
  const DOOR_THETA = 1.05;
  const DOOR_HALF = 1.05;
  const DOOR_Z = 6.72;
  const APRON = 3.4;
  const DOME_TOP = 1.95 + 5.4 * 0.86;
  const habitat = (x: number, z: number, yaw: number, id: string, code: string) => {
    const g = place(x, z, yaw);
    // Legs on pads, regolith banked over the feet.
    for (const [lx, lz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) {
      kit.cyl(g, 0.16, 0.2, 1.1, m.steel, lx, 0.55, lz, 10);
      kit.cyl(g, 0.6, 0.6, 0.08, m.steel, lx, 0.04, lz, 12);
      const berm = noShadow(mesh(g, new THREE.SphereGeometry(0.9, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.regolith, lx, -0.04, lz));
      berm.scale.set(1, 0.3, 1);
    }
    mesh(g, new THREE.CylinderGeometry(5.4, 5.6, 0.9, seg), m.shellDusty, 0, 1.5, 0);
    // Equipment on the skirt and radiators standing off it, all clear of the door.
    for (const a of [1.9, -1.9, Math.PI]) {
      const box = new THREE.Group();
      box.position.set(Math.sin(a) * 5.55, 1.5, Math.cos(a) * 5.55);
      box.rotation.y = a;
      g.add(box);
      kit.rbox(box, 1.0, 0.62, 0.32, 0.04, m.anodised, 0, 0, 0.12);
      noShadow(kit.box(box, 0.07, 0.06, 0.02, m.green, 0.36, 0.18, 0.29));
    }
    for (const a of [2.6, -2.6]) {
      const rad = new THREE.Group();
      rad.position.set(Math.sin(a) * 6.3, 0, Math.cos(a) * 6.3);
      rad.rotation.y = a;
      g.add(rad);
      kit.box(rad, 2.0, 1.3, 0.05, m.radiator, 0, 1.25, 0);
      for (const sx of [-0.85, 0.85]) kit.strut(rad, sx, 0, 0.35, sx, 0.62, 0, 0.04, m.steel);
    }
    // The shell: a cap, and a lower band with the doorway cut where the
    // airlock module covers it, both under the quilted blanket.
    mesh(g, new THREE.SphereGeometry(5.4, seg, seg / 2, 0, Math.PI * 2, 0, DOOR_THETA), m.blanket, 0, 1.95, 0).scale.set(1, 0.86, 1);
    mesh(g, new THREE.SphereGeometry(5.4, seg, seg / 2, Math.PI / 2 + DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP, DOOR_THETA, Math.PI * 0.62 - DOOR_THETA), m.blanket, 0, 1.95, 0).scale.set(1, 0.86, 1);
    // Restraint straps over the top, belts round it.
    for (let i = 0; i < 8; i++) {
      // Webbing, not tubing: flat and close to the blanket's own tone.
      const strap = noShadow(mesh(g, new THREE.TorusGeometry(5.43, 0.03, 3, seg, Math.PI), m.shellDusty, 0, 1.95, 0));
      strap.rotation.y = (i / 8) * Math.PI;
      strap.scale.set(1, 0.86, 1.8);
    }
    for (const yh of [2.7, 3.9, 5.1]) {
      const r = Math.sqrt(Math.max(0.1, 1 - Math.pow((yh - 1.95) / (5.4 * 0.86), 2))) * 5.42;
      noShadow(mesh(g, new THREE.TorusGeometry(r, 0.03, 3, seg), m.shellDusty, 0, yh, 0)).rotation.x = Math.PI / 2;
    }
    // The hard collar on top: hatch, whip, beacon.
    kit.cyl(g, 1.25, 1.4, 0.36, m.shell, 0, DOME_TOP - 0.06, 0, seg);
    kit.cyl(g, 0.62, 0.62, 0.12, m.anodised, 0, DOME_TOP + 0.18, 0, 20);
    kit.cyl(g, 0.012, 0.02, 1.3, m.steel, 0.85, DOME_TOP + 0.75, 0.25, 6);
    noShadow(mesh(g, new THREE.SphereGeometry(0.14, 10, 8), beacon, 0, DOME_TOP + 0.34, 0));
    // The airlock module: shell, blanket roof, corner frames, the lit chamber
    // behind the door, the door that slides up, its lintel and status lamp.
    kit.box(g, 3.0, 2.8, 2.2, m.shell, 0, 2.8, 5.6);
    kit.box(g, 3.08, 0.12, 2.28, m.blanket, 0, 4.26, 5.6);
    for (const sx of [-1.52, 1.52]) kit.box(g, 0.09, 2.8, 0.09, m.anodised, sx, 2.8, 6.68);
    mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2, 2.2, 2.5), chamber, 0, 3.05, 5.5).castShadow = false;
    noShadow(mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2, 0.06, 2.5), m.deck, 0, FLOOR, 5.5));
    noShadow(kit.box(g, 0.8, 0.04, 0.8, m.cool, 0, 3.7, 5.9));
    const door = keep(mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2 - 0.1, 2.1, 0.1), m.shellDusty, 0, 2.65, DOOR_Z));
    mesh(door, new THREE.BoxGeometry(0.34, 0.34, 0.06), m.glass, 0.0, 0.55, 0.06);
    kit.box(g, DOOR_HALF * 2 + 0.3, 0.14, 0.18, m.anodised, 0, 3.8, DOOR_Z);
    const lamp = std({ color: 0x100404, emissive: new THREE.Color(LAMP.closed), emissiveIntensity: 1.8, roughness: 0.4 });
    noShadow(mesh(g, new THREE.BoxGeometry(0.9, 0.07, 0.05), lamp, 0, 4.02, DOOR_Z + 0.03));
    // The control panel beside the door, and the handrails.
    const cp = kit.rbox(g, 0.36, 0.5, 0.1, 0.03, m.carbon, 1.3, 2.75, DOOR_Z + 0.06);
    noShadow(mesh(cp, new THREE.PlaneGeometry(0.26, 0.2), m.screen, 0, 0.08, 0.055));
    noShadow(mesh(cp, new THREE.BoxGeometry(0.08, 0.08, 0.03), lamp, 0, -0.14, 0.05));
    for (const sx of [-1.42, 1.62]) kit.strut(g, sx, 2.1, DOOR_Z + 0.14, sx, 3.4, DOOR_Z + 0.14, 0.022, m.alu);
    const idPlate = noShadow(mesh(g, new THREE.PlaneGeometry(1.4, 0.35), kit.label([code], { w: 256, h: 64 }), 1.515, 3.3, 5.6));
    idPlate.rotation.y = Math.PI / 2;
    const logo = noShadow(mesh(g, new THREE.PlaneGeometry(1.6, 0.4), kit.logo, -1.515, 3.3, 5.6));
    logo.rotation.y = -Math.PI / 2;
    const airlock: Airlock = { habitat: id, x: x + Math.sin(yaw) * DOOR_Z, z: z + Math.cos(yaw) * DOOR_Z, yaw, panel: door, open: 0, state: 'closed', cycle: 0, lamp };
    airlocks.push(airlock);
    // The ramp, its cleats, rails and landing, a hazard strip at the foot.
    const ramp = mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2 + 0.3, 0.12, 5.2), m.deck, 0, 0.9, 9.3);
    ramp.rotation.x = Math.atan2(1.5, 5);
    for (let i = 0; i < 9; i++) {
      const cleat = noShadow(mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2, 0.04, 0.09), m.steel, 0, 1.63 - i * 0.174, 7.1 + i * 0.58));
      cleat.rotation.x = Math.atan2(1.5, 5);
    }
    for (const s of [-1, 1]) {
      const rail = mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 5.3, 6), m.alu, s * (DOOR_HALF + 0.12), 1.75, 9.3);
      rail.rotation.x = Math.PI / 2 + Math.atan2(1.5, 5);
      for (let i = 0; i < 4; i++) mesh(g, new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), m.steel, s * (DOOR_HALF + 0.12), 1.2 - i * 0.26, 7.6 + i * 1.3);
    }
    mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2 + 0.3, 0.12, 1.2), m.deck, 0, 1.68, 6.9);
    noShadow(mesh(g, new THREE.BoxGeometry(DOOR_HALF * 2 + 0.3, 0.015, 0.3), m.hazard, 0, 0.02, RAMP_END + 0.2));
    habCollider({ x: x + Math.sin(yaw) * 9.3, z: z + Math.cos(yaw) * 9.3, r: 2.2 });
    // Two portholes in the flank.
    for (const pa of [-1.15, 1.15]) {
      const ph = new THREE.Group();
      ph.position.set(Math.sin(pa) * 5.3, 3.5, Math.cos(pa) * 5.3);
      // Facing straight out from the dome, tipped back with its curve.
      ph.rotation.set(-0.35, pa, 0, 'YXZ');
      g.add(ph);
      mesh(ph, new THREE.TorusGeometry(0.62, 0.09, 8, 20), m.alu);
      noShadow(mesh(ph, new THREE.CircleGeometry(0.58, 20), m.glass));
    }
    habCollider({ x, z, r: 5.9 });
    habCollider({ x: x + Math.sin(yaw) * 6.5, z: z + Math.cos(yaw) * 6.5, r: 1.5 });
    pois.push({ id, x: x + Math.sin(yaw) * 9, z: z + Math.cos(yaw) * 9, r: 6 });
    pois.push({ id, x, z, r: 5.3 });

    // ── Inside: the restraint layer seen from within, a deck over the
    // skirt, a ring of lockers clear of the door, a light ring, and what
    // the module is for. ──
    const inner = noShadow(mesh(g, new THREE.SphereGeometry(5.25, seg, seg / 2, Math.PI / 2 + DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP, DOOR_THETA, Math.PI * 0.62 - DOOR_THETA), innerWall, 0, 1.95, 0));
    inner.scale.set(1, 0.86, 1);
    noShadow(mesh(g, new THREE.SphereGeometry(5.25, seg, seg / 2, 0, Math.PI * 2, 0, DOOR_THETA), innerWall, 0, 1.95, 0)).scale.set(1, 0.86, 1);
    noShadow(mesh(g, new THREE.CylinderGeometry(DOME_R + 0.1, DOME_R + 0.1, 0.06, seg), m.deck, 0, FLOOR, 0));
    for (let i = 0; i < 4; i++) noShadow(mesh(g, new THREE.BoxGeometry(0.03, 0.005, DOME_R * 2), lockerDark, 0, FLOOR + 0.035, 0)).rotation.y = (i / 4) * Math.PI;
    noShadow(mesh(g, new THREE.TorusGeometry(2.7, 0.06, 8, seg), roomLight, 0, 5.5, 0)).rotation.x = Math.PI / 2;
    noShadow(mesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), roomLight, 0, 6.0, 0));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.6) continue;
      const unit = noShadow(mesh(g, new THREE.BoxGeometry(0.95, 1.9, 0.42), i % 3 === 0 ? lockerDark : locker, Math.sin(a) * 4.35, FLOOR + 0.98, Math.cos(a) * 4.35));
      unit.rotation.y = a + Math.PI;
      if (i % 3 === 1) noShadow(mesh(unit, new THREE.PlaneGeometry(0.62, 0.36), m.screen, 0, 0.4, 0.215));
      else noShadow(mesh(unit, new THREE.BoxGeometry(0.06, 0.4, 0.03), lockerDark, 0.3, 0, 0.22));
    }
    const at = (a: number, r: number, geometry: THREE.BufferGeometry, mt: THREE.Material, dy: number, dx = 0) => {
      const o = noShadow(mesh(g, geometry, mt, Math.sin(a) * r + Math.cos(a) * dx, FLOOR + dy, Math.cos(a) * r - Math.sin(a) * dx));
      o.rotation.y = a;
      return o;
    };
    if (id === 'habitatA') {
      for (const a of [1.7, 2.6, -1.7, -2.6]) {
        at(a, 3.5, new THREE.BoxGeometry(2.0, 0.34, 0.9), locker, 0.45);
        at(a, 3.5, new THREE.BoxGeometry(1.94, 0.1, 0.84), bedding, 0.67);
        at(a, 3.5, new THREE.BoxGeometry(0.5, 0.1, 0.5), pillow, 0.75, -0.7);
        at(a, 3.9, new THREE.BoxGeometry(2.0, 0.34, 0.9), locker, 1.55);
        at(a, 3.9, new THREE.BoxGeometry(1.94, 0.1, 0.84), bedding, 1.77);
      }
      at(0, 0, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 24), wood, 0.78);
      at(0, 0, new THREE.CylinderGeometry(0.08, 0.12, 0.76, 10), m.steel, 0.38);
      for (const a of [0.6, 2.7, 4.8]) at(a, 1.35, new THREE.CylinderGeometry(0.2, 0.2, 0.46, 12), lockerDark, 0.23);
    } else if (id === 'habitatB') {
      for (const a of [2.1, -2.1]) {
        at(a, 3.3, new THREE.BoxGeometry(2.4, 0.9, 0.75), locker, 0.45);
        at(a, 3.3, new THREE.BoxGeometry(2.36, 0.04, 0.72), lockerDark, 0.92);
        at(a, 3.3, new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), m.steel, 1.17, 0.6);
        at(a, 3.3, new THREE.BoxGeometry(0.4, 0.3, 0.3), lockerDark, 1.1, -0.5);
        for (const dx of [-0.75, 0, 0.75]) at(a, 4.0, new THREE.PlaneGeometry(0.6, 0.38), m.screen, 1.75, dx).rotation.y = a + Math.PI;
      }
      at(Math.PI, 3.6, new THREE.BoxGeometry(2.6, 0.9, 0.7), locker, 0.45);
      at(Math.PI, 3.6, new THREE.BoxGeometry(2.56, 0.04, 0.66), lockerDark, 0.92);
      at(Math.PI, 3.6, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), m.steel, 0.95, 0.7);
      at(Math.PI, 3.6, new THREE.BoxGeometry(0.34, 0.42, 0.34), lockerDark, 1.15, -0.8);
      at(-0.95, 4.3, new THREE.BoxGeometry(2.4, 1.5, 0.08), lockerDark, 1.85).rotation.y = -0.95 + Math.PI;
      const board = kit.label(['DEEP CORE', 'MAGNETIC ANOMALY 3', 'BEARING 312 · 118 M'], { w: 512, h: 320, bg: '#07141c', fg: '#5eead4', px: 40, emissive: 0.55 });
      at(-0.95, 4.24, new THREE.PlaneGeometry(2.2, 1.34), board, 1.85).rotation.y = -0.95 + Math.PI;
    } else {
      at(2.3, 3.4, new THREE.BoxGeometry(2.0, 0.55, 0.85), pillow, 0.5);
      at(2.3, 3.4, new THREE.BoxGeometry(2.0, 0.08, 0.85), locker, 0.2);
      at(2.3, 3.4, new THREE.BoxGeometry(0.45, 0.1, 0.5), bedding, 0.82, -0.7);
      at(2.3, 4.1, new THREE.PlaneGeometry(0.7, 0.42), m.screen, 1.85).rotation.y = 2.3 + Math.PI;
      at(-2.3, 3.2, new THREE.BoxGeometry(0.85, 0.22, 1.9), m.rubber, 0.11);
      at(-2.3, 3.2, new THREE.BoxGeometry(0.3, 0.9, 0.06), m.steel, 0.6, 0.55);
      at(-2.3, 3.2, new THREE.BoxGeometry(0.3, 0.9, 0.06), m.steel, 0.6, -0.55);
      at(-2.3, 3.2, new THREE.BoxGeometry(1.3, 0.06, 0.06), m.steel, 1.03);
      at(Math.PI, 3.8, new THREE.BoxGeometry(1.8, 1.9, 0.5), locker, 0.95);
      at(Math.PI, 3.8, new THREE.PlaneGeometry(1.6, 1.2), m.glass, 1.05);
      at(Math.PI + 0.9, 3.4, new THREE.CylinderGeometry(0.16, 0.16, 1.0, 12), m.steel, 0.5);
      at(Math.PI + 0.9, 3.4, new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), lockerDark, 1.02);
    }
    habs.push({ id, x, z, yaw, cy: g.position.y, glow: 0, airlock });
  };
  const px = PAD_CENTER.x; const pz = PAD_CENTER.y;
  habitat(px - 21, pz - 12, 0.28, 'habitatA', 'HAB-A · 01');
  habitat(px, pz - 20, 0, 'habitatB', 'OPS-B · 02');
  habitat(px + 21, pz - 12, -0.28, 'habitatC', 'MED-C · 03');

  // ── Pressurised tunnels between the domes: a segmented shell with a
  // glazed strip down each side over the grow beds. ──
  const tunnel = (x: number, z: number, yaw: number, len: number) => {
    const g = place(x, z, yaw);
    // Angles measured from the top: turned onto its side about X, a
    // cylinder's own θ = π/2 is what points up.
    const shellPart = (from: number, span: number, mt: THREE.Material) => {
      const o = mesh(g, new THREE.CylinderGeometry(2.2, 2.2, len, seg, 1, true, from + Math.PI / 2, span), mt, 0, 0.75, 0);
      o.rotation.z = Math.PI / 2;
      return o;
    };
    shellPart(-0.55, 1.1, m.shellDusty);
    noShadow(shellPart(0.55, 0.35, m.glass));
    shellPart(0.9, 0.7, m.shellDusty);
    noShadow(shellPart(-0.9, 0.35, m.glass));
    shellPart(-1.6, 0.7, m.shellDusty);
    for (let i = 0; i <= 3; i++) {
      const rib = mesh(g, new THREE.TorusGeometry(2.25, 0.07, 6, seg, Math.PI), m.anodised, -len / 2 + (i / 3) * len, 0.75, 0);
      rib.rotation.y = Math.PI / 2;
    }
    mesh(g, new THREE.BoxGeometry(len, 0.5, 4.6), m.shellDusty, 0, 0.45, 0);
    for (const s of [-1, 1]) {
      noShadow(mesh(g, new THREE.BoxGeometry(len - 0.6, 0.5, 1.3), soil, 0, 0.95, s * 1.25));
      for (let k = 0; k < Math.floor(len / 1.1); k++) {
        const leafy = noShadow(mesh(g, new THREE.SphereGeometry(0.4, 8, 6), leaf, -len / 2 + 0.8 + k * 1.1, 1.42, s * 1.25));
        leafy.scale.set(1, 0.7, 1);
      }
      noShadow(mesh(g, new THREE.BoxGeometry(len - 0.6, 0.04, 0.06), roomLight, 0, 2.5, s * 1.2));
    }
    colliders.push({ x, z, r: len / 2 });
  };
  tunnel(px - 10.5, pz - 15.5, 0.36, 9);
  tunnel(px + 10.5, pz - 15.5, -0.36, 9);
  pois.push({ id: 'greenhouse', x: px - 10.5, z: pz - 10, r: 5 });
  pois.push({ id: 'greenhouse', x: px + 10.5, z: pz - 10, r: 5 });

  // ── The working outpost, and the rover parked in its bay. ──
  const zones = buildZones(kit, group, heightAt, colliders, pois, sunDir);
  const builtRover = buildRover(kit, lite);
  const rover = builtRover.group;
  const bay = zones.anchors.serviceBay;
  rover.position.set(bay.x, heightAt(bay.x, bay.z), bay.z);
  rover.rotation.y = bay.yaw;
  group.add(rover);
  const roverCollider: Collider = { x: bay.x, z: bay.z, r: 2.4 };
  colliders.push(roverCollider);
  pois.push({ id: 'rover', x: bay.x, z: bay.z, r: 5.5 });
  const roverParts = builtRover.parts;

  // ── The first crew's descent stage, out past the landing zone. ──
  {
    const g = place(px - 22, pz + 36, 0.4);
    kit.cyl(g, 2.4, 2.6, 1.7, m.gold, 0, 1.9, 0, 8);
    kit.cyl(g, 2.42, 2.42, 0.1, m.carbon, 0, 2.78, 0, 8);
    kit.cyl(g, 1.1, 1.6, 1.1, m.carbon, 0, 0.5, 0, 12);
    kit.cyl(g, 0.9, 0.9, 0.5, m.silver, 0, 2.95, 0, 12);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const lx = Math.sin(a) * 3.6; const lz = Math.cos(a) * 3.6;
      const leg = mesh(g, new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), m.gold, lx * 0.65, 1.3, lz * 0.65);
      leg.rotation.z = -Math.sin(a) * 0.6;
      leg.rotation.x = Math.cos(a) * 0.6;
      kit.cyl(g, 0.7, 0.55, 0.14, m.gold, lx, 0.07, lz, 12);
      noShadow(mesh(g, new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.regolith, lx, -0.05, lz)).scale.set(1, 0.22, 1);
    }
    for (let i = 0; i < 6; i++) kit.box(g, 0.5, 0.05, 0.05, m.steel, 0, 0.5 + i * 0.45, 2.55);
    for (const s of [-1, 1]) kit.cyl(g, 0.03, 0.03, 2.8, m.steel, s * 0.25, 1.75, 2.55, 6);
    noShadow(mesh(g, new THREE.PlaneGeometry(1.3, 0.34), kit.label(['STELLAR I · 2031'], { w: 256, h: 64 }), 0, 2.2, 2.62));
    colliders.push({ x: px - 22, z: pz + 36, r: 3.8 });
    pois.push({ id: 'lander', x: px - 22, z: pz + 36, r: 7 });
  }

  // ── The flag. ──
  {
    const g = place(px + 3, pz + 18, 0);
    kit.cyl(g, 0.02, 0.025, 2.6, m.alu, 0, 1.3, 0, 8);
    kit.cylX(g, 0.015, 1.25, m.alu, 0.62, 2.55, 0, 6);
    const tex = georgianFlag();
    textures.push(tex);
    const fm = std({ map: tex, roughness: 0.8, side: THREE.DoubleSide });
    const flag = mesh(g, new THREE.PlaneGeometry(1.2, 0.8, 12, 4), fm, 0.62, 2.14, 0);
    const fp = flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 7) * 0.03 * (fp.getX(i) + 0.6));
    flag.geometry.computeVertexNormals();
    pois.push({ id: 'flag', x: px + 3, z: pz + 18, r: 3.5 });
  }

  // ── The base sign. ──
  {
    const g = place(px, pz + 12, 0);
    for (const s of [-1, 1]) kit.cyl(g, 0.04, 0.04, 2.2, m.steel, s * 1.3, 1.1, 0, 8);
    const signMat = kit.label(['STELLAR BASE', 'ASTROMAN · TBILISI', '41.71 N · 44.83 E'], { w: 512, h: 256, px: 38 });
    const face = noShadow(mesh(g, new THREE.PlaneGeometry(2.8, 1.4), signMat, 0, 1.75, -0.03));
    face.rotation.y = Math.PI;
    kit.box(g, 2.9, 1.5, 0.04, m.carbon, 0, 1.75, 0);
    colliders.push({ x: px, z: pz + 12, r: 1.7 });
    pois.push({ id: 'sign', x: px, z: pz + 13, r: 3 });
  }

  // Fold the outpost into a few draw calls per material. The rover's
  // articulated parts, the array heads, the dish and the airlock doors keep moving.
  rover.traverse((o) => { if ((o as THREE.Group).isGroup) pivot(o); });
  const merged = mergeStatic(group, { cell: 24, minCaster: 0.15 });

  const spawn = new THREE.Vector3(px, heightAt(px, pz + 4), pz + 4);
  const roverPoi = pois.find((p) => p.id === 'rover')!;
  const walkColliders = colliders.filter((c) => !habColliders.has(c));

  // ── Standing on a habitat. ──
  const lp = { x: 0, z: 0 };
  const local = (h: Hab, x: number, z: number) => {
    const dx = x - h.x; const dz = z - h.z;
    const c = Math.cos(h.yaw); const s = Math.sin(h.yaw);
    lp.x = dx * c - dz * s;
    lp.z = dx * s + dz * c;
  };
  const structure = (h: Hab, lx: number, lz: number): number | null => {
    if (Math.hypot(lx, lz) < DOME_R) return h.cy + FLOOR;
    if (Math.abs(lx) < DOOR_HALF) {
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
  /** Going indoors takes walking at the door and cycling the lock: the apron
   *  in front of the ramp gathers an approach onto the centreline, and a shut
   *  door holds the walker on the side they are on. */
  const RAIL = DOOR_HALF - 0.14;
  const confine = (p: { x: number; z: number }) => {
    for (const h of habs) {
      local(h, p.x, p.z);
      let lx = lp.x; let lz = lp.z;
      const r = Math.hypot(lx, lz);
      if (r > 16) continue;
      let moved = false;
      if (structure(h, lx, lz) !== null) {
        if (r < DOME_R) {
          const doorway = Math.abs(lx) < DOOR_HALF && lz > 3.8;
          if (!doorway && r > DOME_R - 0.55) { const k = (DOME_R - 0.55) / r; lx *= k; lz *= k; moved = true; }
        } else if (Math.abs(lx) > RAIL) {
          lx = Math.sign(lx) * RAIL; moved = true;
        }
        if (h.airlock.open < 0.85 && Math.abs(lx) < DOOR_HALF && lz > DOOR_Z - 0.38 && lz < DOOR_Z + 0.38) {
          lz = lz < DOOR_Z ? DOOR_Z - 0.38 : DOOR_Z + 0.38;
          moved = true;
        }
      } else if (r < 5.95 && !(Math.abs(lx) < DOOR_HALF && lz > 4.0)) {
        const k = 5.95 / r; lx *= k; lz *= k; moved = true;
      } else if (Math.abs(lx) < 1.6 && lz > 4.0 && lz < RAMP_END - 0.4) {
        lx = Math.abs(lx) < 1.32 ? Math.sign(lx || 1) * (DOOR_HALF - 0.1) : Math.sign(lx || 1) * 1.6;
        moved = true;
      } else if (lz >= RAMP_END - 0.4 && lz < RAMP_END + APRON && Math.abs(lx) < 2.8) {
        const pull = 1 - (lz - (RAMP_END - 0.4)) / (APRON + 0.4);
        lx *= 1 - 0.55 * pull * pull;
        moved = true;
      }
      if (moved) {
        const c = Math.cos(h.yaw); const s = Math.sin(h.yaw);
        p.x = h.x + lx * c + lz * s;
        p.z = h.z - lx * s + lz * c;
      }
    }
  };

  const setLamp = (a: Airlock) => a.lamp.emissive.setHex(LAMP[a.state]);
  const handle: BaseHandle = {
    group, colliders, walkColliders, pois, spawn, airlocks, rover, roverCollider, roverParts, zones, floorAt, confine, inside: null,
    cycleAirlock(a) {
      if (a.state === 'closed') { a.state = 'cycling'; a.cycle = 0; }
      else if (a.state === 'open') a.state = 'closed';
      setLamp(a);
    },
    update(dt, t, earthDir, crewX, crewZ) {
      let inside: Inside | null = null;
      for (const h of habs) {
        local(h, crewX, crewZ);
        const r = Math.hypot(lp.x, lp.z);
        const here = r < DOME_R || (Math.abs(lp.x) < DOOR_HALF && lp.z >= 4.2 && lp.z < 6.75);
        if (here) inside = { id: h.id, x: h.x, z: h.z, y: h.cy + FLOOR };
        h.glow += ((here ? 1 : 0) - h.glow) * (1 - Math.exp(-dt * 3));
        if (h.glow > 0.01) lights?.request(h.x, h.cy + 4.6, h.z, 0xfff1dc, h.glow * 1.9, 22, 1.5);
      }
      handle.inside = inside;
      beacon.emissiveIntensity = (Math.sin(t * 2.2) > 0.6 ? 1 : 0.15) * 2;
      for (const a of airlocks) {
        if (a.state === 'cycling') {
          a.cycle = Math.min(1, a.cycle + dt / CYCLE_SECONDS);
          a.lamp.emissiveIntensity = Math.sin(t * 14) > 0 ? 2.2 : 0.4;
          if (a.cycle >= 1) { a.state = 'open'; a.lamp.emissiveIntensity = 1.8; setLamp(a); }
        } else if (a.state === 'open' && Math.hypot(crewX - a.x, crewZ - a.z) > 8.5) {
          a.state = 'closed';
          setLamp(a);
        }
        a.open += ((a.state === 'open' ? 1 : 0) - a.open) * (1 - Math.exp(-dt * 3.2));
        a.panel.position.y = 2.65 + a.open * 1.95;
      }
      zones.update(dt, t, earthDir);
      roverPoi.x = roverCollider.x;
      roverPoi.z = roverCollider.z;
    },
    dispose() {
      for (const g of merged.geometries) g.dispose();
      for (const o of owned) o.dispose();
      for (const tx of textures) tx.dispose();
      zones.dispose();
      builtRover.dispose();
    },
  };
  return handle;
}
