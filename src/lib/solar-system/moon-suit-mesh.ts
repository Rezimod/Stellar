// The EVA suit as built: a modern lunar pressure suit, sized to a real
// person in it. A sculpted hard upper torso with scye bearings canted to the
// shoulders and a chest display and control module; a lower torso with its
// waist and hip bearings and pleated brief; arms with rotation bearings and
// convolute elbows; gauntlet gloves with fingers; legs with thigh bearings,
// convolute knees and ankle joints into lugged boots. A deep life-support
// pack with its hinged cover, vents and handles, hoses round under the arms.
// A helmet with the clear bubble inside an extravehicular visor assembly —
// the gold visor down, a dark inner visor behind it for depth — and a lamp
// and camera pod on each temple. MODEBADZE on the chest, Georgia on the left
// shoulder, Stellar on the pack.
//
// This file only builds; moon-cosmonaut poses it. Joints are groups at
// their pivots: rotation.x negative swings a limb forward, positive folds a
// knee back; arm abduction is rotation.z = side * k.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const HIP_H = 0.98;
export const THIGH = 0.46;
export const SHIN = 0.42;
/** Helmet centre above the neck ring. */
export const HELMET_C = 0.2;
/** The lope's top speed, m/s — the gait is sized against it. */
export const RUN_SPEED = 4.6;

export interface SuitRig {
  group: THREE.Group;
  /** Carries the bob and the crouch. */
  body: THREE.Group;
  /** At the hips: lean and the whole-body roll live here. */
  pelvis: THREE.Group;
  /** The upper body above the waist bearing: counter-rotates against the hips. */
  chest: THREE.Group;
  pack: THREE.Group;
  neck: THREE.Group;
  helmet: THREE.Group;
  sides: number[];
  shoulders: THREE.Group[];
  elbows: THREE.Group[];
  hands: THREE.Group[];
  hips: THREE.Group[];
  knees: THREE.Group[];
  ankles: THREE.Group[];
  geometries: THREE.BufferGeometry[];
  dispose: () => void;
}

function fabricNormal(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const wx = Math.sin(x * Math.PI / 2) * 0.35 + (Math.random() - 0.5) * 0.3;
      const wy = Math.sin(y * Math.PI / 2) * 0.35 + (Math.random() - 0.5) * 0.3;
      img.data[i] = Math.round((wx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((wy * 0.5 + 0.5) * 255);
      img.data[i + 2] = 230;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

function drawn(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const lathe = (pts: [number, number][], seg: number) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
/** A limb segment hanging from its pivot, rounded at both ends and full in the middle. */
const limb = (rTop: number, rMid: number, rBottom: number, length: number, seg: number) => lathe([
  [0, -length], [rBottom * 0.7, -length + 0.012], [rBottom, -length + 0.05],
  [rMid, -length * 0.5], [rTop, -0.05], [rTop * 0.7, -0.012], [0, 0],
], seg);

export function buildSuit(lite: boolean): SuitRig {
  const seg = lite ? 14 : 22;
  const group = new THREE.Group();
  group.name = 'cosmonaut';
  const weave = fabricNormal();
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const cloth = std({ color: 0xe6e5e0, roughness: 0.82, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35) });
  const bellows = std({ color: 0xd3d2cc, roughness: 0.86, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.6, 0.6) });
  const dusty = std({ color: 0xb8b3aa, roughness: 0.92, metalness: 0, normalMap: weave, normalScale: new THREE.Vector2(0.5, 0.5) });
  const hard = std({ color: 0xf0f0eb, roughness: 0.36, metalness: 0.05 });
  const bearing = std({ color: 0x9aa0a7, roughness: 0.38, metalness: 0.78 });
  const dark = std({ color: 0x2a2d32, roughness: 0.58, metalness: 0.3 });
  const glove = std({ color: 0x5f656d, roughness: 0.78, metalness: 0.05, normalMap: weave, normalScale: new THREE.Vector2(0.4, 0.4) });
  const sole = std({ color: 0x34373c, roughness: 0.95, metalness: 0 });
  const red = std({ color: 0xb23029, roughness: 0.7, metalness: 0 });
  const hose = std({ color: 0x8c9198, roughness: 0.5, metalness: 0.4 });
  const screen = std({ color: 0x0a2a2a, emissive: new THREE.Color(0x5eead4), emissiveIntensity: 0.8, roughness: 0.3 });
  const lamp = std({ color: 0xffffff, emissive: new THREE.Color(0xfff4dc), emissiveIntensity: 1.6 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0xd2a33a, roughness: 0.06, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.8 });
  const inner = new THREE.MeshPhysicalMaterial({ color: 0x16191e, roughness: 0.08, metalness: 0.9, clearcoat: 1, envMapIntensity: 1.2 });
  const bubble = new THREE.MeshPhysicalMaterial({ color: 0xcfe2f2, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, clearcoat: 1 });

  const tapeTex = drawn(256, 64, (c) => {
    c.fillStyle = '#e9e9e4'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#1b1f26'; c.font = '600 34px "JetBrains Mono", ui-monospace, monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MODEBADZE', 128, 34);
  });
  const flagTex = drawn(96, 64, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 96, 64);
    c.fillStyle = '#e8112d';
    c.fillRect(40, 0, 16, 64); c.fillRect(0, 24, 96, 16);
    for (const [cx, cy] of [[20, 12], [76, 12], [20, 52], [76, 52]]) { c.fillRect(cx - 2, cy - 7, 4, 14); c.fillRect(cx - 7, cy - 2, 14, 4); }
  });
  const packTex = drawn(256, 64, (c) => {
    c.fillStyle = '#e4e3de'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#c8741f';
    c.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 - Math.PI / 2; const r = k % 2 ? 6 : 22; c.lineTo(30 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    c.fill();
    c.fillStyle = '#1b1f26'; c.font = '600 28px "JetBrains Mono", ui-monospace, monospace';
    c.textBaseline = 'middle'; c.fillText('STELLAR · EVA 1', 60, 34);
  });
  const tapeMat = std({ map: tapeTex, roughness: 0.8 });
  const flagMat = std({ map: flagTex, roughness: 0.8 });
  const packMat = std({ map: packTex, roughness: 0.7 });
  const materials: THREE.Material[] = [cloth, bellows, dusty, hard, bearing, dark, glove, sole, red, hose, screen, lamp, visor, inner, bubble, tapeMat, flagMat, packMat];
  const textures = [weave, tapeTex, flagTex, packTex];
  const geometries: THREE.BufferGeometry[] = [];

  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.push(g);
    const o = new THREE.Mesh(g, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const ring = (parent: THREE.Object3D, r: number, tube: number, mat: THREE.Material, y: number, x = 0, z = 0) => {
    const o = mesh(parent, new THREE.TorusGeometry(r, tube, 8, seg + 6), mat, x, y, z);
    o.rotation.x = Math.PI / 2;
    return o;
  };
  const convolute = (parent: THREE.Object3D, r: number, count: number, y0: number, step: number) => {
    for (let b = 0; b < count; b++) ring(parent, r * (1 - Math.abs(b - (count - 1) / 2) * 0.03), r * 0.22, bellows, y0 - b * step);
  };
  const rbox = (parent: THREE.Object3D, w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) =>
    mesh(parent, new RoundedBoxGeometry(w, h, d, 2, r), mat, x, y, z);

  const body = new THREE.Group();
  group.add(body);
  const pelvis = new THREE.Group();
  pelvis.position.y = HIP_H;
  body.add(pelvis);

  // ── Lower torso: brief, hip bearings, the waist bearing, pleats. ──
  mesh(pelvis, lathe([[0, -0.12], [0.16, -0.11], [0.215, -0.04], [0.225, 0.04], [0.21, 0.1], [0.19, 0.14]], seg), cloth).scale.set(1.12, 1, 0.84);
  ring(pelvis, 0.2, 0.024, bearing, 0.13).scale.set(1.08, 0.86, 1);
  ring(pelvis, 0.212, 0.018, bellows, 0.075).scale.set(1.1, 0.86, 1);
  ring(pelvis, 0.218, 0.018, bellows, 0.03).scale.set(1.12, 0.86, 1);

  // ── Chest: the hard upper torso, broad through the shoulders and flat at
  // the front, with its bearings, the display and control module and the
  // hoses round to the pack. ──
  const chest = new THREE.Group();
  chest.position.y = 0.13;
  pelvis.add(chest);
  mesh(chest, lathe([[0.18, 0.0], [0.215, 0.07], [0.265, 0.2], [0.3, 0.33], [0.305, 0.42], [0.285, 0.5], [0.22, 0.56], [0.14, 0.59], [0, 0.6]], seg + 4), hard).scale.set(1.2, 1, 0.8);
  // A flatter chest plate over the front, where the module mounts.
  rbox(chest, 0.42, 0.3, 0.08, 0.035, hard, 0, 0.33, 0.19);
  // Scye bearings, canted out and forward toward the arms.
  for (const s of [-1, 1]) {
    const scye = ring(chest, 0.105, 0.022, bearing, 0.4, s * 0.3, 0.01);
    scye.rotation.set(Math.PI / 2, s * 0.35, s * 1.25);
  }
  // The module: sloped top, a screen, three controls and the purge valve.
  const dcm = rbox(chest, 0.3, 0.16, 0.11, 0.025, dark, 0, 0.26, 0.26);
  dcm.rotation.x = -0.18;
  mesh(dcm, new THREE.PlaneGeometry(0.15, 0.06), screen, -0.05, 0.02, 0.056);
  for (const dx of [0.06, 0.1]) mesh(dcm, new THREE.CylinderGeometry(0.017, 0.017, 0.03, 12), bearing, dx, 0.025, 0.06).rotation.x = Math.PI / 2;
  mesh(dcm, new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), red, 0.08, -0.04, 0.06).rotation.x = Math.PI / 2;
  mesh(chest, new THREE.PlaneGeometry(0.19, 0.045), tapeMat, -0.12, 0.47, 0.235).rotation.set(-0.12, -0.22, 0);
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.14, 0.24, 0.3), new THREE.Vector3(s * 0.27, 0.17, 0.22),
      new THREE.Vector3(s * 0.34, 0.14, 0.0), new THREE.Vector3(s * 0.26, 0.16, -0.24),
    ]);
    mesh(chest, new THREE.TubeGeometry(curve, 16, 0.019, 8, false), hose).castShadow = false;
  }

  // ── Tool belt on the waist: hammer right, sample pouch left, tether reel. ──
  const beltRing = ring(pelvis, 0.235, 0.017, dark, 0.0);
  beltRing.scale.set(1.12, 0.86, 1);
  mesh(pelvis, new THREE.CylinderGeometry(0.012, 0.014, 0.26, 8), hose, 0.27, -0.14, 0.02).rotation.z = 0.25;
  rbox(pelvis, 0.045, 0.035, 0.11, 0.01, bearing, 0.3, -0.02, 0.02);
  rbox(pelvis, 0.11, 0.13, 0.06, 0.02, dusty, -0.26, -0.06, 0.07);
  mesh(pelvis, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14), bearing, 0.12, -0.02, 0.21).rotation.x = Math.PI / 2;

  // ── Life-support pack: deep shell, hinged cover, vents, top and bottom caps, handles. ──
  const pack = new THREE.Group();
  pack.position.set(0, 0.32, -0.34);
  chest.add(pack);
  rbox(pack, 0.56, 0.74, 0.3, 0.07, hard);
  rbox(pack, 0.58, 0.76, 0.04, 0.03, hard, 0, 0, -0.16);
  rbox(pack, 0.5, 0.12, 0.26, 0.04, dusty, 0, 0.39, 0);
  rbox(pack, 0.46, 0.08, 0.24, 0.03, dark, 0, -0.39, 0);
  for (const s of [-1, 1]) {
    rbox(pack, 0.03, 0.54, 0.22, 0.012, bearing, s * 0.285, -0.02, 0);
    mesh(pack, new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), dark, s * 0.18, -0.44, 0.02);
    mesh(pack, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), bearing, s * 0.2, 0.05, -0.2).rotation.x = Math.PI / 2 * 0;
  }
  for (let v = 0; v < 4; v++) mesh(pack, new THREE.BoxGeometry(0.3, 0.012, 0.012), dark, 0, 0.12 - v * 0.045, -0.185).castShadow = false;
  mesh(pack, new THREE.PlaneGeometry(0.34, 0.085), packMat, 0, 0.27, -0.182).rotation.y = Math.PI;
  mesh(pack, new THREE.CylinderGeometry(0.005, 0.005, 0.34, 6), bearing, 0.22, 0.54, -0.05).castShadow = false;

  // ── Helmet: neck ring, the bubble, the dark inner visor, the gold visor,
  // the visor assembly shell with its brow, and a lamp and camera each side. ──
  const neck = new THREE.Group();
  neck.position.set(0, 0.58, 0.01);
  chest.add(neck);
  ring(neck, 0.158, 0.032, bearing, 0.02);
  const helmet = new THREE.Group();
  neck.add(helmet);
  const HC = HELMET_C;
  mesh(helmet, new THREE.SphereGeometry(0.185, seg + 6, seg), bubble, 0, HC, 0);
  // SphereGeometry's phi runs from −X; π/2 is straight ahead (+Z).
  mesh(helmet, new THREE.SphereGeometry(0.196, seg + 8, seg + 2, Math.PI / 2 - 1.0, 2.0, 0.44, 1.46), inner, 0, HC, 0);
  mesh(helmet, new THREE.SphereGeometry(0.205, seg + 8, seg + 2, Math.PI / 2 - 1.02, 2.04, 0.5, 1.36), visor, 0, HC, 0.004);
  const shell = mesh(helmet, new THREE.SphereGeometry(0.218, seg + 8, seg + 2, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.78), hard, 0, HC, -0.006);
  shell.scale.set(1, 1.02, 1.04);
  const brow = mesh(helmet, new THREE.TorusGeometry(0.214, 0.016, 8, seg + 8, 2.1), hard, 0, HC + 0.02, 0.01);
  brow.rotation.set(0.42, 0, Math.PI / 2 - 1.05);
  const chin = mesh(helmet, new THREE.TorusGeometry(0.2, 0.014, 8, seg + 8, 2.0), bearing, 0, HC - 0.02, 0.01);
  chin.rotation.set(-1.2, 0, Math.PI / 2 - 1.0);
  rbox(helmet, 0.04, 0.012, 0.2, 0.005, hard, 0, HC + 0.215, -0.02);
  for (const s of [-1, 1]) {
    const pod = rbox(helmet, 0.055, 0.06, 0.12, 0.018, dark, s * 0.212, HC + 0.07, 0.03);
    pod.rotation.z = s * 0.3;
    mesh(pod, new THREE.CircleGeometry(0.02, 14), lamp, 0, 0.012, 0.061).castShadow = false;
    mesh(pod, new THREE.CircleGeometry(0.01, 10), dark, 0, -0.018, 0.062).castShadow = false;
  }

  // ── Limbs. ──
  const sides: number[] = [];
  const shoulders: THREE.Group[] = []; const elbows: THREE.Group[] = []; const hands: THREE.Group[] = [];
  const hips: THREE.Group[] = []; const knees: THREE.Group[] = []; const ankles: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    sides.push(side);
    // Arm: shoulder cap, upper-arm bearing, upper arm, elbow convolutes and
    // bearing, forearm, wrist bearing, gauntlet, glove.
    const sh = new THREE.Group();
    sh.position.set(side * 0.34, 0.4, 0.0);
    chest.add(sh);
    mesh(sh, new THREE.SphereGeometry(0.1, seg, seg - 4), cloth);
    ring(sh, 0.088, 0.017, bearing, -0.1);
    mesh(sh, limb(0.087, 0.09, 0.074, 0.3, seg), cloth, 0, -0.04, 0);
    if (side < 0) {
      const patch = mesh(sh, new THREE.PlaneGeometry(0.075, 0.05), flagMat, -0.093, -0.12, 0);
      patch.rotation.y = -Math.PI / 2;
      patch.castShadow = false;
    } else {
      mesh(sh, new THREE.CylinderGeometry(0.089, 0.089, 0.03, seg, 1, true), red, 0, -0.14, 0).castShadow = false;
    }
    const el = new THREE.Group();
    el.position.set(0, -0.34, 0);
    sh.add(el);
    convolute(el, 0.076, 3, 0.03, 0.03);
    ring(el, 0.07, 0.014, bearing, -0.06);
    mesh(el, limb(0.07, 0.068, 0.058, 0.26, seg), cloth, 0, -0.06, 0);
    ring(el, 0.06, 0.016, bearing, -0.3);
    if (side < 0) {
      const cuff = rbox(el, 0.1, 0.075, 0.035, 0.01, dark, 0, -0.2, 0.06);
      cuff.rotation.x = -0.35;
      mesh(cuff, new THREE.PlaneGeometry(0.07, 0.04), screen, 0, 0.004, 0.019).castShadow = false;
    }
    const hand = new THREE.Group();
    hand.position.set(0, -0.32, 0);
    el.add(hand);
    mesh(hand, new THREE.CylinderGeometry(0.07, 0.058, 0.08, seg), glove, 0, -0.02, 0);
    rbox(hand, 0.085, 0.1, 0.048, 0.02, glove, 0, -0.1, 0.005);
    for (let f = 0; f < 4; f++) {
      const finger = mesh(hand, new THREE.CapsuleGeometry(0.0125, 0.045, 3, 6), glove, -0.03 + f * 0.02, -0.17 + Math.abs(f - 1.5) * 0.006, 0.012);
      finger.rotation.x = -0.35;
      finger.castShadow = false;
    }
    mesh(hand, new THREE.CapsuleGeometry(0.014, 0.04, 3, 6), glove, -side * 0.05, -0.09, 0.03).rotation.z = -side * 0.6;
    shoulders.push(sh); elbows.push(el); hands.push(hand);

    // Leg: hip bearing, thigh with its rotation bearing, knee convolutes,
    // shin, ankle bearing and bellows, boot with toe cap, heel and lugs.
    const hip = new THREE.Group();
    hip.position.set(side * 0.125, 0.0, 0);
    pelvis.add(hip);
    mesh(hip, new THREE.SphereGeometry(0.112, seg, seg - 4), cloth);
    mesh(hip, limb(0.112, 0.108, 0.09, THIGH, seg), cloth, 0, -0.02, 0);
    ring(hip, 0.104, 0.016, bearing, -0.16);
    mesh(hip, new THREE.CylinderGeometry(0.107, 0.107, 0.04, seg, 1, true), red, 0, -0.26, 0).castShadow = false;
    const kn = new THREE.Group();
    kn.position.set(0, -THIGH, 0);
    hip.add(kn);
    convolute(kn, 0.094, 4, 0.05, 0.034);
    mesh(kn, limb(0.088, 0.086, 0.072, SHIN, seg), cloth, 0, -0.07, 0);
    ring(kn, 0.078, 0.016, bearing, -SHIN + 0.04);
    const an = new THREE.Group();
    an.position.set(0, -SHIN, 0);
    kn.add(an);
    convolute(an, 0.076, 2, 0.02, 0.028);
    mesh(an, lathe([[0.075, -0.07], [0.09, -0.03], [0.086, 0.02], [0.08, 0.05]], seg), dusty, 0, 0, 0.005);
    rbox(an, 0.15, 0.08, 0.28, 0.035, dusty, 0, -0.05, 0.05);
    mesh(an, new THREE.SphereGeometry(0.076, seg, seg - 6), dusty, 0, -0.055, 0.155).scale.set(1, 0.55, 0.9);
    rbox(an, 0.155, 0.045, 0.1, 0.015, dusty, 0, -0.035, -0.09);
    rbox(an, 0.17, 0.035, 0.33, 0.012, sole, 0, -0.1, 0.05);
    for (let l = 0; l < 4; l++) mesh(an, new THREE.BoxGeometry(0.14, 0.012, 0.03), sole, 0, -0.12, -0.08 + l * 0.08).castShadow = false;
    mesh(an, new THREE.BoxGeometry(0.07, 0.025, 0.012), red, 0, -0.03, 0.2).castShadow = false;
    hips.push(hip); knees.push(kn); ankles.push(an);
  }

  return {
    group, body, pelvis, chest, pack, neck, helmet, sides, shoulders, elbows, hands, hips, knees, ankles, geometries,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const mt of materials) mt.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
