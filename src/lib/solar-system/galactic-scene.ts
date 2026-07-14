// Galactic-tier scene extras for SolarSystemCanvas.
// Builds three additive layers visible only when the user zooms way out:
//   1) NearbyStars  — bright named stars at real RA/Dec, distance-scaled.
//   2) MilkyWay     — tilted spiral-disk mesh + halo + faint disc sprinkle.
//                     The Sun sits offset from galactic centre inside the disk.
//   3) OtherGalaxies — distant galaxy sprites (M31, M33, LMC/SMC, M51, M104).
// All groups expose `update(zoomFactor, dt)` so the canvas loop can drive a
// smooth fade-in/out as `sysRadius` grows past the solar-system tier.

import * as THREE from 'three';

const PC_TO_UNIT = 22;       // 1 parsec → 22 scene units (compressed for visual cohesion)
const NEAR_STAR_MAX_R = 2600; // visual clamp so very distant catalog stars stay in view

export interface NearbyStarRow {
  id: string;
  name: string;
  ra: number;        // hours
  dec: number;       // degrees
  pc: number;        // parsecs (Hipparcos/Gaia)
  mag: number;       // apparent V magnitude
  spectral: 'O'|'B'|'A'|'F'|'G'|'K'|'M';
}

/** A tight bright-star roster — every entry has a Hipparcos-grade distance. */
export const NEARBY_STARS: NearbyStarRow[] = [
  { id: 'sirius',     name: 'Sirius',         ra: 6.752,  dec: -16.716, pc: 2.64,  mag: -1.46, spectral: 'A' },
  { id: 'canopus',    name: 'Canopus',        ra: 6.399,  dec: -52.696, pc: 95,    mag: -0.74, spectral: 'F' },
  { id: 'rigil',      name: 'Alpha Centauri', ra: 14.660, dec: -60.834, pc: 1.34,  mag: -0.27, spectral: 'G' },
  { id: 'arcturus',   name: 'Arcturus',       ra: 14.261, dec:  19.182, pc: 11.26, mag: -0.05, spectral: 'K' },
  { id: 'vega',       name: 'Vega',           ra: 18.616, dec:  38.784, pc: 7.68,  mag:  0.03, spectral: 'A' },
  { id: 'capella',    name: 'Capella',        ra: 5.278,  dec:  45.998, pc: 13.13, mag:  0.08, spectral: 'G' },
  { id: 'rigel',      name: 'Rigel',          ra: 5.243,  dec:  -8.202, pc: 264,   mag:  0.13, spectral: 'B' },
  { id: 'procyon',    name: 'Procyon',        ra: 7.655,  dec:   5.225, pc: 3.51,  mag:  0.34, spectral: 'F' },
  { id: 'achernar',   name: 'Achernar',       ra: 1.629,  dec: -57.237, pc: 42.7,  mag:  0.46, spectral: 'B' },
  { id: 'betelgeuse', name: 'Betelgeuse',     ra: 5.919,  dec:   7.407, pc: 168,   mag:  0.50, spectral: 'M' },
  { id: 'hadar',      name: 'Hadar',          ra: 14.064, dec: -60.373, pc: 119,   mag:  0.61, spectral: 'B' },
  { id: 'altair',     name: 'Altair',         ra: 19.846, dec:   8.868, pc: 5.13,  mag:  0.77, spectral: 'A' },
  { id: 'aldebaran',  name: 'Aldebaran',      ra: 4.598,  dec:  16.509, pc: 20.43, mag:  0.85, spectral: 'K' },
  { id: 'antares',    name: 'Antares',        ra: 16.490, dec: -26.432, pc: 169,   mag:  0.96, spectral: 'M' },
  { id: 'spica',      name: 'Spica',          ra: 13.420, dec: -11.161, pc: 78,    mag:  0.98, spectral: 'B' },
  { id: 'pollux',     name: 'Pollux',         ra: 7.755,  dec:  28.026, pc: 10.34, mag:  1.14, spectral: 'K' },
  { id: 'fomalhaut',  name: 'Fomalhaut',      ra: 22.961, dec: -29.622, pc: 7.7,   mag:  1.16, spectral: 'A' },
  { id: 'deneb',      name: 'Deneb',          ra: 20.690, dec:  45.280, pc: 802,   mag:  1.25, spectral: 'A' },
  { id: 'regulus',    name: 'Regulus',        ra: 10.139, dec:  11.967, pc: 24.31, mag:  1.40, spectral: 'B' },
  { id: 'castor',     name: 'Castor',         ra: 7.577,  dec:  31.888, pc: 15.6,  mag:  1.58, spectral: 'A' },
  { id: 'polaris',    name: 'Polaris',        ra: 2.530,  dec:  89.260, pc: 132,   mag:  1.97, spectral: 'F' },
];

const SPECTRAL_RGB: Record<NearbyStarRow['spectral'], [number, number, number]> = {
  O: [0.64, 0.77, 1.00],
  B: [0.72, 0.82, 1.00],
  A: [0.87, 0.91, 1.00],
  F: [0.99, 0.97, 0.92],
  G: [1.00, 0.95, 0.78],
  K: [1.00, 0.78, 0.58],
  M: [1.00, 0.55, 0.34],
};

function raDecPcToVec(ra: number, dec: number, pc: number): THREE.Vector3 {
  const raRad = (ra / 24) * Math.PI * 2;
  const decRad = (dec / 180) * Math.PI;
  const dist = Math.min(pc * PC_TO_UNIT, NEAR_STAR_MAX_R);
  const x = dist * Math.cos(decRad) * Math.cos(raRad);
  const z = dist * Math.cos(decRad) * Math.sin(raRad);
  const y = dist * Math.sin(decRad);
  return new THREE.Vector3(x, y, z);
}

/* ───────────────────────── nearby stars layer ───────────────────────── */

export interface NearbyStarsHandle {
  group: THREE.Group;
  positions: Map<string, THREE.Vector3>;
  setFade: (fade: number) => void;
  dispose: () => void;
}

export function makeNearbyStars(lite: boolean): NearbyStarsHandle {
  const group = new THREE.Group();
  group.name = 'galactic.nearbyStars';

  const sprite = softStarSprite();

  // Named bright stars — each its own sprite so they pop and can carry the
  // catalog name in the future.
  const positions = new Map<string, THREE.Vector3>();
  const namedMats: THREE.SpriteMaterial[] = [];
  for (const star of NEARBY_STARS) {
    const pos = raDecPcToVec(star.ra, star.dec, star.pc);
    positions.set(star.id, pos.clone());
    const [r, g, b] = SPECTRAL_RGB[star.spectral];
    const mat = new THREE.SpriteMaterial({
      map: sprite,
      color: new THREE.Color(r, g, b),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.copy(pos);
    // Apparent brightness — brighter (lower mag) gets a larger sprite.
    const apparent = THREE.MathUtils.clamp(1.8 - star.mag * 0.6, 0.4, 3.0);
    spr.scale.setScalar(34 + apparent * 12);
    group.add(spr);
    namedMats.push(mat);
  }

  // Background field stars filling the rest of the celestial sphere — they
  // give the deep-space backdrop a real density without overpowering the
  // named stars. Count is modest because they're rendered as Points with
  // a softer sprite, not full sprites.
  const fieldN = lite ? 4500 : 12000;
  const fieldPos = new Float32Array(fieldN * 3);
  const fieldCol = new Float32Array(fieldN * 3);
  for (let i = 0; i < fieldN; i++) {
    const u = Math.random();
    const v = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = 800 + Math.random() * 1900;
    fieldPos[i * 3] = r * Math.sin(p) * Math.cos(t);
    fieldPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    fieldPos[i * 3 + 2] = r * Math.cos(p);
    const sp = pickFieldSpectral();
    const c = 0.45 + Math.random() * 0.55;
    fieldCol[i * 3] = sp[0] * c;
    fieldCol[i * 3 + 1] = sp[1] * c;
    fieldCol[i * 3 + 2] = sp[2] * c;
  }
  const fieldGeo = new THREE.BufferGeometry();
  fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
  fieldGeo.setAttribute('color', new THREE.BufferAttribute(fieldCol, 3));
  const fieldMat = new THREE.PointsMaterial({
    map: sprite,
    size: lite ? 5 : 4,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
  });
  const field = new THREE.Points(fieldGeo, fieldMat);
  group.add(field);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    for (const m of namedMats) m.opacity = f;
    fieldMat.opacity = f * 0.72;
    group.visible = f > 0.005;
  };

  return {
    group,
    positions,
    setFade,
    dispose: () => {
      for (const m of namedMats) m.dispose();
      sprite.dispose();
      fieldGeo.dispose();
      fieldMat.dispose();
    },
  };
}

function pickFieldSpectral(): [number, number, number] {
  const r = Math.random();
  if (r < 0.04) return [0.66, 0.78, 1.00];   // B
  if (r < 0.14) return [0.84, 0.90, 1.00];   // A
  if (r < 0.32) return [0.98, 0.98, 1.00];   // F
  if (r < 0.50) return [1.00, 0.96, 0.84];   // G
  if (r < 0.75) return [1.00, 0.86, 0.66];   // K
  return [1.00, 0.70, 0.52];                 // M
}

function softStarSprite(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.86)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  g.addColorStop(1.0,  'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ───────────────────────── milky way disk ───────────────────────── */

export interface MilkyWayHandle {
  group: THREE.Group;
  /** The disk mesh — exposed so the canvas can register it for picking. */
  pickTarget: THREE.Mesh;
  /** Sun's position inside the galactic disk (offset from centre). */
  sunOffset: THREE.Vector3;
  /** Tilt frame for the disk — useful for projecting the Sun pin. */
  tilt: THREE.Euler;
  setFade: (fade: number) => void;
  dispose: () => void;
}

export function makeMilkyWayDisk(lite = false): MilkyWayHandle {
  const group = new THREE.Group();
  group.name = 'galactic.milkyWay';

  // Tilt the entire galaxy frame so it doesn't sit flat on the ecliptic.
  // This matches the rough orientation of the galactic plane relative to
  // the solar system in our local "up = Y" convention.
  const tilt = new THREE.Euler(THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(28), 0, 'XYZ');
  group.rotation.copy(tilt);

  // We are ~8.2 kpc from the galactic centre — offset the disk so the Sun
  // (which lives at scene origin) sits on a spiral arm, not in the bulge.
  // Direction is arbitrary; magnitude is in scene units.
  const SUN_OFFSET_FROM_CENTER = 1600;
  const sunOffsetLocal = new THREE.Vector3(SUN_OFFSET_FROM_CENTER, 0, 220);
  // Disk geometry centred at the galactic centre, then translated so the
  // disk's centre is offset from the Sun by sunOffsetLocal.
  const diskRadius = 4400;
  const diskGeom = new THREE.CircleGeometry(diskRadius, 192);
  const diskTex = spiralGalaxyCanvasTexture();
  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const disk = new THREE.Mesh(diskGeom, diskMat);
  // The disk lives at -sunOffsetLocal so the Sun (origin) sits on a spiral arm.
  disk.position.copy(sunOffsetLocal.clone().negate());
  group.add(disk);

  // Volumetric stellar disk — tens of thousands of point-stars distributed
  // like a real barred spiral: exponential radial falloff, log-spiral arm
  // density waves, a central bar, and a thin-disk vertical profile that
  // flares outward. Young blue stars + pink HII regions hug the arm ridges;
  // older yellow stars fill the inter-arm disk. This gives the galaxy true
  // 3D depth the flat texture alone can't provide.
  const starN = lite ? 9000 : 24000;
  const vPos = new Float32Array(starN * 3);
  const vCol = new Float32Array(starN * 3);
  const Rd = diskRadius * 0.28;          // radial scale length
  // 22° pitch keeps the arms to ~1.2 windings across the disk — grand-design
  // spirals read like this; tighter pitches degenerate into concentric rings.
  const pitch = Math.tan(THREE.MathUtils.degToRad(22));
  const ARMS = 4;
  const thin = diskRadius * 0.012;       // vertical scale height
  const cx = -sunOffsetLocal.x;
  const cz = -sunOffsetLocal.z;
  for (let i = 0; i < starN; i++) {
    // Exponential disk sampling: r = -Rd·ln(u1·u2) approximates a gamma(2)
    // profile that peaks off-centre like a real surface-density law.
    const r = Math.min(-Rd * Math.log(Math.random() * Math.random() + 1e-6) * 0.5, diskRadius * 0.98);
    let theta = Math.random() * Math.PI * 2;
    const rNorm = r / diskRadius;
    const isBar = r < diskRadius * 0.16;
    // Two dominant arms + two weaker ones; ~60% of disk stars gather on a
    // ridge, the rest stay smooth inter-arm background.
    let onArm = false;
    if (!isBar && Math.random() < 0.6) {
      onArm = true;
      const armPhase = Math.log(Math.max(r, 1) / (diskRadius * 0.05)) / pitch;
      const arm = Math.random() < 0.7
        ? Math.floor(Math.random() * 2) * 2       // major arms 0/2
        : Math.floor(Math.random() * 2) * 2 + 1;  // minor arms 1/3
      const ridge = armPhase + (arm * Math.PI * 2) / ARMS;
      // Arm width grows with radius so the outer arms dissolve naturally.
      const sigma = 0.12 + 0.5 * rNorm;
      const scatter = (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
      theta = ridge + scatter;
      onArm = Math.abs(scatter) < sigma * 0.6;
    }
    let x = Math.cos(theta) * r;
    let z = Math.sin(theta) * r;
    if (isBar) {
      // Central bar — elongate along X, squash along Z.
      x *= 1.55;
      z *= 0.5;
    }
    // Thin disk with outer flare; the bulge/bar region is thicker.
    const h = thin * (1 + rNorm * 2.2) + (isBar ? diskRadius * 0.02 * (1 - rNorm * 4) : 0);
    const y = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.7 * h;
    vPos[i * 3] = cx + x;
    vPos[i * 3 + 1] = y;
    vPos[i * 3 + 2] = cz + z;

    // Colour by population: warm bulge/bar, blue arm ridges, pink HII sparks.
    let cr: number, cg: number, cb: number;
    let lum = 0.35 + Math.random() * 0.65;
    if (isBar || rNorm < 0.18) {
      cr = 1.0; cg = 0.82; cb = 0.58;                       // old population I/II — warm
    } else if (onArm && Math.random() < 0.035) {
      cr = 1.0; cg = 0.55; cb = 0.66;                       // HII star-forming region
      lum *= 0.75;                                          // glow, don't bead
    } else if (onArm) {
      cr = 0.72; cg = 0.82; cb = 1.0;                       // young OB associations — blue
    } else {
      cr = 1.0; cg = 0.92; cb = 0.74;                       // inter-arm disk — yellowish
    }
    vCol[i * 3] = cr * lum;
    vCol[i * 3 + 1] = cg * lum;
    vCol[i * 3 + 2] = cb * lum;
  }
  const volGeom = new THREE.BufferGeometry();
  volGeom.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  volGeom.setAttribute('color', new THREE.BufferAttribute(vCol, 3));
  const volMat = new THREE.PointsMaterial({
    map: softStarSprite(),
    size: lite ? 26 : 20,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
  });
  const volume = new THREE.Points(volGeom, volMat);
  group.add(volume);

  // Backside dust lane — slightly larger, darker disk pasted behind so the
  // central bulge isn't completely transparent against far galaxies.
  const dustGeom = new THREE.CircleGeometry(diskRadius * 1.04, 96);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x06070d,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const dust = new THREE.Mesh(dustGeom, dustMat);
  dust.position.copy(sunOffsetLocal.clone().negate());
  dust.position.y -= 4;
  group.add(dust);

  // Faint halo of population-II stars around the bulge — adds depth above
  // and below the disk plane. Modest count, additive blend.
  const haloN = 1800;
  const haloPos = new Float32Array(haloN * 3);
  const haloCol = new Float32Array(haloN * 3);
  for (let i = 0; i < haloN; i++) {
    // Sample inside a flattened ellipsoid centred on the galactic centre.
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = Math.pow(w, 0.35) * 1800 + 90;
    const x = -sunOffsetLocal.x + r * Math.sin(p) * Math.cos(t);
    const z = -sunOffsetLocal.z + r * Math.sin(p) * Math.sin(t) * 0.4; // flatten in disk plane
    const y = r * Math.cos(p) * 0.42;
    haloPos[i * 3] = x;
    haloPos[i * 3 + 1] = y;
    haloPos[i * 3 + 2] = z;
    const warm = 0.6 + Math.random() * 0.4;
    haloCol[i * 3]     = 1.00 * warm;
    haloCol[i * 3 + 1] = 0.78 * warm;
    haloCol[i * 3 + 2] = 0.52 * warm;
  }
  const haloGeom = new THREE.BufferGeometry();
  haloGeom.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  haloGeom.setAttribute('color', new THREE.BufferAttribute(haloCol, 3));
  const haloMat = new THREE.PointsMaterial({
    map: softStarSprite(),
    size: 18,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
  });
  const halo = new THREE.Points(haloGeom, haloMat);
  group.add(halo);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    // Texture disk provides the smooth glow underneath; the particle volume
    // carries most of the brightness so the galaxy reads as true 3D.
    diskMat.opacity = f * 0.62;
    volMat.opacity = f * 0.92;
    dustMat.opacity = f * 0.85;
    haloMat.opacity = f * 0.55;
    group.visible = f > 0.005;
  };

  return {
    group,
    pickTarget: disk,
    sunOffset: sunOffsetLocal,
    tilt,
    setFade,
    dispose: () => {
      diskGeom.dispose();
      diskTex.dispose();
      diskMat.dispose();
      volGeom.dispose();
      (volMat.map as THREE.Texture | null)?.dispose();
      volMat.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      haloGeom.dispose();
      (haloMat.map as THREE.Texture | null)?.dispose();
      haloMat.dispose();
    },
  };
}

/** Procedural spiral-galaxy canvas. ~25k particle splats spread along
 *  log-spiral arms with a warm bulge core and a few darker dust lanes
 *  multiplied on top. Result reads as a real galaxy under additive blend. */
function spiralGalaxyCanvasTexture(): THREE.CanvasTexture {
  const SIZE = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Bulge
  const bg = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.40);
  bg.addColorStop(0,    'rgba(255, 236, 196, 0.95)');
  bg.addColorStop(0.06, 'rgba(255, 210, 142, 0.78)');
  bg.addColorStop(0.18, 'rgba(255, 168,  88, 0.32)');
  bg.addColorStop(0.45, 'rgba(140, 156, 210, 0.10)');
  bg.addColorStop(0.85, 'rgba(40, 60, 120, 0.02)');
  bg.addColorStop(1.0,  'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Spiral arms — log spirals + jitter (winding count matches the particle
  // volume above so the texture glow and the 3D stars trace the same arms)
  const arms = 4;
  const turns = 1.1;
  const particles = 28000;
  for (let i = 0; i < particles; i++) {
    const armIdx = Math.floor(Math.random() * arms);
    const t = Math.pow(Math.random(), 0.55); // outer-biased
    const theta = armIdx * (Math.PI * 2 / arms) + t * Math.PI * 2 * turns + Math.random() * 0.05;
    const r = t * SIZE * 0.46;
    const sigma = SIZE * 0.018 * (1 - t * 0.4);
    const jx = (Math.random() - 0.5) * sigma * 6;
    const jy = (Math.random() - 0.5) * sigma * 6;
    const cx = SIZE / 2 + Math.cos(theta) * r + jx;
    const cy = SIZE / 2 + Math.sin(theta) * r + jy;

    const cool = Math.min(1, t * 1.4);
    const r0 = Math.floor(230 - 100 * cool);
    const g0 = Math.floor(204 - 60 * cool);
    const b0 = Math.floor(170 + 70 * cool);
    const a = (1 - t) * 0.45 + 0.06;
    ctx.fillStyle = `rgba(${r0},${g0},${b0},${a})`;
    ctx.fillRect(cx, cy, 1.6, 1.6);
  }

  // HII regions — small pink/red sparks along the arms.
  for (let i = 0; i < 220; i++) {
    const armIdx = Math.floor(Math.random() * arms);
    const t = 0.35 + Math.random() * 0.45;
    const theta = armIdx * (Math.PI * 2 / arms) + t * Math.PI * 2 * turns;
    const r = t * SIZE * 0.44;
    const cx = SIZE / 2 + Math.cos(theta) * r + (Math.random() - 0.5) * 8;
    const cy = SIZE / 2 + Math.sin(theta) * r + (Math.random() - 0.5) * 8;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5);
    grad.addColorStop(0,   'rgba(255, 160, 180, 0.95)');
    grad.addColorStop(0.6, 'rgba(255, 120, 150, 0.35)');
    grad.addColorStop(1.0, 'rgba(255, 80, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 5, cy - 5, 10, 10);
  }

  // Dust lanes
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 9000; i++) {
    const armIdx = Math.floor(Math.random() * arms);
    const t = Math.pow(Math.random(), 0.5);
    const theta = armIdx * (Math.PI * 2 / arms) + t * Math.PI * 2 * turns - 0.16;
    const r = t * SIZE * 0.44;
    const cx = SIZE / 2 + Math.cos(theta) * r + (Math.random() - 0.5) * SIZE * 0.012;
    const cy = SIZE / 2 + Math.sin(theta) * r + (Math.random() - 0.5) * SIZE * 0.012;
    ctx.fillStyle = `rgba(0,0,0,${0.45 - t * 0.32})`;
    ctx.fillRect(cx, cy, 1.4, 1.4);
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ───────────────────────── other galaxies ───────────────────────── */

interface GalaxyDef {
  id: string;
  name: string;
  pos: [number, number, number];
  size: number;
  shape: 'spiral' | 'elliptical' | 'irregular';
  tilt: number; // disk tilt
  color: [number, number, number];
}

const OTHER_GALAXIES: GalaxyDef[] = [
  { id: 'm31',  name: 'Andromeda',   pos: [ 6200, 2800, -4800], size: 1700, shape: 'spiral',     tilt: -0.7, color: [1.0, 0.92, 0.78] },
  { id: 'm33',  name: 'Triangulum',  pos: [ 5400, 1900, -5600], size: 900,  shape: 'spiral',     tilt: 0.4,  color: [0.96, 0.94, 1.0] },
  { id: 'lmc',  name: 'LMC',         pos: [-1800, -3200,  2400], size: 700,  shape: 'irregular',  tilt: 0.2,  color: [1.0, 0.88, 0.74] },
  { id: 'smc',  name: 'SMC',         pos: [-2200, -2800,  1600], size: 480,  shape: 'irregular',  tilt: 0.6,  color: [1.0, 0.86, 0.82] },
  { id: 'm51',  name: 'Whirlpool',   pos: [-5200,  3600, -3800], size: 950,  shape: 'spiral',     tilt: -0.2, color: [0.94, 0.94, 1.0] },
  { id: 'm104', name: 'Sombrero',    pos: [ 4800, -2400,  4600], size: 820,  shape: 'spiral',     tilt: 1.4,  color: [1.0, 0.94, 0.84] },
  { id: 'm87',  name: 'M87',         pos: [-6000, -3200, -3400], size: 720,  shape: 'elliptical', tilt: 0.0,  color: [1.0, 0.90, 0.74] },
  { id: 'cen-a',name: 'Centaurus A', pos: [ 3200, -3800, -5800], size: 880,  shape: 'elliptical', tilt: 0.9,  color: [1.0, 0.86, 0.66] },
];

export interface OtherGalaxiesHandle {
  group: THREE.Group;
  setFade: (fade: number) => void;
  dispose: () => void;
}

export function makeOtherGalaxies(): OtherGalaxiesHandle {
  const group = new THREE.Group();
  group.name = 'galactic.others';
  const mats: THREE.Material[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  const texs: THREE.Texture[] = [];

  for (const g of OTHER_GALAXIES) {
    const tex = galaxySpriteTexture(g.shape, g.color);
    texs.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    mats.push(mat);
    const geom = new THREE.PlaneGeometry(g.size, g.size);
    geoms.push(geom);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(g.pos[0], g.pos[1], g.pos[2]);
    // Face roughly toward origin, then apply per-galaxy tilt.
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(g.tilt);
    mesh.userData.galaxyId = g.id;
    group.add(mesh);
  }

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    for (const m of mats) (m as THREE.MeshBasicMaterial).opacity = f;
    group.visible = f > 0.005;
  };

  return {
    group,
    setFade,
    dispose: () => {
      for (const m of mats) m.dispose();
      for (const g of geoms) g.dispose();
      for (const t of texs) t.dispose();
    },
  };
}

function galaxySpriteTexture(
  shape: 'spiral' | 'elliptical' | 'irregular',
  color: [number, number, number],
): THREE.CanvasTexture {
  const SIZE = 384;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const [cr, cg, cb] = color.map((v) => Math.floor(v * 255));
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (shape === 'spiral') {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.45);
    bg.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`);
    bg.addColorStop(0.12, `rgba(${cr},${cg},${cb},0.55)`);
    bg.addColorStop(0.4, `rgba(${Math.floor(cr * 0.7)},${Math.floor(cg * 0.65)},${Math.floor(cb * 0.8)},0.18)`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const arms = 2;
    for (let i = 0; i < 7000; i++) {
      const armIdx = Math.floor(Math.random() * arms);
      const t = Math.pow(Math.random(), 0.55);
      const theta = armIdx * Math.PI + t * Math.PI * 2 * 1.4;
      const r = t * SIZE * 0.45;
      const jitter = SIZE * 0.012 * (1 - t * 0.4);
      const x = cx + Math.cos(theta) * r + (Math.random() - 0.5) * jitter * 4;
      const y = cy + Math.sin(theta) * r + (Math.random() - 0.5) * jitter * 4;
      const a = (1 - t) * 0.45 + 0.08;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  } else if (shape === 'elliptical') {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.42);
    bg.addColorStop(0, `rgba(${cr},${cg},${cb},0.92)`);
    bg.addColorStop(0.3, `rgba(${Math.floor(cr * 0.8)},${Math.floor(cg * 0.75)},${Math.floor(cb * 0.7)},0.4)`);
    bg.addColorStop(0.7, `rgba(${Math.floor(cr * 0.6)},${Math.floor(cg * 0.55)},${Math.floor(cb * 0.55)},0.12)`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.74);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();
  } else {
    // irregular — clumpy blob
    for (let blob = 0; blob < 4; blob++) {
      const bx = cx + (Math.random() - 0.5) * SIZE * 0.25;
      const by = cy + (Math.random() - 0.5) * SIZE * 0.25;
      const br = SIZE * (0.12 + Math.random() * 0.16);
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, `rgba(${cr},${cg},${cb},0.55)`);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    for (let i = 0; i < 1400; i++) {
      const x = cx + (Math.random() - 0.5) * SIZE * 0.6;
      const y = cy + (Math.random() - 0.5) * SIZE * 0.6;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.2 + Math.random() * 0.4})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ───────────────────────── cosmic web ───────────────────────── */

export interface CosmicWebHandle {
  group: THREE.Group;
  setFade: (fade: number) => void;
  dispose: () => void;
}

/**
 * Large-scale structure of the universe, the way simulations like Illustris
 * and Uchuu show it: galaxy clusters as bright knots, filaments of galaxies
 * strung between neighbouring knots, and near-empty voids in between. Built
 * from three point clouds (filaments / cluster cores / sparse field) so the
 * whole tier costs three draw calls.
 */
export function makeCosmicWeb(lite: boolean): CosmicWebHandle {
  const group = new THREE.Group();
  group.name = 'galactic.cosmicWeb';

  const NODE_N = lite ? 42 : 64;
  const R_MIN = 9000;
  const R_MAX = 26000;
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < NODE_N; i++) {
    const u = Math.random();
    const v = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = R_MIN + Math.pow(Math.random(), 0.7) * (R_MAX - R_MIN);
    nodes.push(new THREE.Vector3(
      r * Math.sin(p) * Math.cos(t),
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
    ));
  }

  // Filaments — each node links to its 2–3 nearest neighbours (deduped), and
  // galaxies are scattered along a gently bowed curve between the pair with
  // gaussian spread, exactly how the web looks in N-body survey maps.
  const links: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < NODE_N; i++) {
    const dists = nodes
      .map((n, j) => ({ j, d: i === j ? Infinity : nodes[i].distanceToSquared(n) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2 + (i % 2));
    for (const { j } of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push(i < j ? [i, j] : [j, i]);
      }
    }
  }

  const filN = lite ? 7000 : 18000;
  const filPos = new Float32Array(filN * 3);
  const filCol = new Float32Array(filN * 3);
  const mid = new THREE.Vector3();
  const bow = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pt = new THREE.Vector3();
  const bows = links.map(([ia, ib]) => {
    // Fixed random bow per filament, perpendicular-ish to the link.
    mid.copy(nodes[ia]).add(nodes[ib]).multiplyScalar(0.5);
    const len = nodes[ia].distanceTo(nodes[ib]);
    return new THREE.Vector3(
      (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5),
    ).normalize().multiplyScalar(len * (0.08 + Math.random() * 0.14)).add(mid);
  });
  for (let i = 0; i < filN; i++) {
    const li = i % links.length;
    const [ia, ib] = links[li];
    pA.copy(nodes[ia]);
    pB.copy(nodes[ib]);
    bow.copy(bows[li]);
    // Quadratic bezier sample, biased toward the ends (denser near clusters).
    let s = Math.random();
    s = s < 0.5 ? Math.pow(s * 2, 1.4) / 2 : 1 - Math.pow((1 - s) * 2, 1.4) / 2;
    const inv = 1 - s;
    pt.set(0, 0, 0)
      .addScaledVector(pA, inv * inv)
      .addScaledVector(bow, 2 * inv * s)
      .addScaledVector(pB, s * s);
    const len = pA.distanceTo(pB);
    const spread = len * 0.035;
    filPos[i * 3] = pt.x + (Math.random() + Math.random() - 1) * spread;
    filPos[i * 3 + 1] = pt.y + (Math.random() + Math.random() - 1) * spread;
    filPos[i * 3 + 2] = pt.z + (Math.random() + Math.random() - 1) * spread;
    const lum = 0.25 + Math.random() * 0.5;
    filCol[i * 3] = 0.62 * lum;
    filCol[i * 3 + 1] = 0.66 * lum;
    filCol[i * 3 + 2] = 0.95 * lum;
  }

  // Cluster cores — dense warm knots at the nodes (galaxies crowd there).
  const coreN = lite ? 2600 : 6400;
  const corePos = new Float32Array(coreN * 3);
  const coreCol = new Float32Array(coreN * 3);
  for (let i = 0; i < coreN; i++) {
    const n = nodes[i % NODE_N];
    const sigma = 380 + (i % 7) * 60;
    corePos[i * 3] = n.x + (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
    corePos[i * 3 + 1] = n.y + (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
    corePos[i * 3 + 2] = n.z + (Math.random() + Math.random() + Math.random() - 1.5) * sigma;
    const lum = 0.4 + Math.random() * 0.6;
    coreCol[i * 3] = 1.0 * lum;
    coreCol[i * 3 + 1] = 0.9 * lum;
    coreCol[i * 3 + 2] = 0.76 * lum;
  }

  // Sparse field galaxies drifting in the voids.
  const fieldN = lite ? 900 : 2200;
  const fieldPos = new Float32Array(fieldN * 3);
  const fieldCol = new Float32Array(fieldN * 3);
  for (let i = 0; i < fieldN; i++) {
    const u = Math.random();
    const v = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = R_MIN * 0.8 + Math.random() * (R_MAX - R_MIN * 0.8);
    fieldPos[i * 3] = r * Math.sin(p) * Math.cos(t);
    fieldPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    fieldPos[i * 3 + 2] = r * Math.cos(p);
    const lum = 0.2 + Math.random() * 0.4;
    fieldCol[i * 3] = 0.85 * lum;
    fieldCol[i * 3 + 1] = 0.85 * lum;
    fieldCol[i * 3 + 2] = 0.95 * lum;
  }

  const sprite = softStarSprite();
  const layers: { pts: THREE.Points; mat: THREE.PointsMaterial; peak: number }[] = [];
  const addLayer = (pos: Float32Array, col: Float32Array, size: number, peak: number) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: sprite,
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.02,
    });
    const pts = new THREE.Points(geom, mat);
    group.add(pts);
    layers.push({ pts, mat, peak });
  };
  addLayer(filPos, filCol, 130, 0.6);
  addLayer(corePos, coreCol, 210, 0.85);
  addLayer(fieldPos, fieldCol, 160, 0.35);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    for (const l of layers) l.mat.opacity = f * l.peak;
    group.visible = f > 0.005;
  };

  return {
    group,
    setFade,
    dispose: () => {
      for (const l of layers) {
        l.pts.geometry.dispose();
        l.mat.dispose();
      }
      sprite.dispose();
    },
  };
}

/* ───────────────────────── tier helper ───────────────────────── */

/**
 * Map the camera's radial distance to a "galactic tier" value used by the
 * canvas loop to fade each layer in/out:
 *   tier.solar   — solar system fade (1 = full, 0 = hidden)
 *   tier.stellar — nearby-star sprites fade in
 *   tier.galactic — Milky Way disk fade in
 *   tier.universe — other galaxies fade in
 */
export interface TierBlend {
  solar: number;
  stellar: number;
  galactic: number;
  universe: number;
  /** Cosmic web / large-scale structure — the outermost tier. */
  web: number;
}

export function tierBlendFromRadius(radius: number): TierBlend {
  // Thresholds tuned to feel like a continuous outward dolly:
  //   <  60 : pure solar
  //   60-150 : solar fades a bit, stars fade in
  //   150-1400 : stellar tier
  //   1400-4500 : galactic tier
  //   4500-9000 : intergalactic tier (Local Group galaxies pop in)
  //   9000+ : cosmic web — clusters + filaments of the large-scale structure
  const stellar = smoothstep(60, 220, radius);
  const galactic = smoothstep(1400, 3200, radius);
  const universe = smoothstep(4400, 6800, radius);
  const web = smoothstep(9000, 15000, radius);
  // The solar tier doesn't fully disappear — at huge distances the sun
  // simply becomes a tiny dot via perspective, no need to hide the meshes.
  const solar = 1.0;
  return { solar, stellar, galactic, universe, web };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
