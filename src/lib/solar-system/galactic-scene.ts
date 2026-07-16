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
  /** Confirmed exoplanets in the system (omitted = none known). */
  planets?: number;
}

/**
 * Bright-star roster + the real nearest star systems and famous planet
 * hosts — every entry has a Hipparcos/Gaia-grade distance, and planet
 * counts stick to confirmed detections.
 */
export const NEARBY_STARS: NearbyStarRow[] = [
  { id: 'sirius',     name: 'Sirius',         ra: 6.752,  dec: -16.716, pc: 2.64,  mag: -1.46, spectral: 'A' },
  { id: 'canopus',    name: 'Canopus',        ra: 6.399,  dec: -52.696, pc: 95,    mag: -0.74, spectral: 'F' },
  { id: 'rigil',      name: 'Alpha Centauri', ra: 14.660, dec: -60.834, pc: 1.34,  mag: -0.27, spectral: 'G', planets: 3 },
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
  { id: 'pollux',     name: 'Pollux',         ra: 7.755,  dec:  28.026, pc: 10.34, mag:  1.14, spectral: 'K', planets: 1 },
  { id: 'fomalhaut',  name: 'Fomalhaut',      ra: 22.961, dec: -29.622, pc: 7.7,   mag:  1.16, spectral: 'A' },
  { id: 'deneb',      name: 'Deneb',          ra: 20.690, dec:  45.280, pc: 802,   mag:  1.25, spectral: 'A' },
  { id: 'regulus',    name: 'Regulus',        ra: 10.139, dec:  11.967, pc: 24.31, mag:  1.40, spectral: 'B' },
  { id: 'castor',     name: 'Castor',         ra: 7.577,  dec:  31.888, pc: 15.6,  mag:  1.58, spectral: 'A' },
  { id: 'polaris',    name: 'Polaris',        ra: 2.530,  dec:  89.260, pc: 132,   mag:  1.97, spectral: 'F' },
  // The true nearest systems — dim red dwarfs the bright-star list skips.
  { id: 'barnard',    name: "Barnard's Star", ra: 17.963, dec:   4.693, pc: 1.83,  mag:  9.51, spectral: 'M', planets: 4 },
  { id: 'wolf359',    name: 'Wolf 359',       ra: 10.941, dec:   7.014, pc: 2.41,  mag: 13.54, spectral: 'M' },
  { id: 'lalande',    name: 'Lalande 21185',  ra: 11.055, dec:  35.970, pc: 2.55,  mag:  7.52, spectral: 'M', planets: 2 },
  { id: 'epseri',     name: 'Epsilon Eridani', ra: 3.549, dec:  -9.458, pc: 3.22,  mag:  3.73, spectral: 'K', planets: 1 },
  { id: 'tauceti',    name: 'Tau Ceti',       ra: 1.734,  dec: -15.937, pc: 3.65,  mag:  3.50, spectral: 'G', planets: 4 },
  { id: 'epsindi',    name: 'Epsilon Indi',   ra: 22.055, dec: -56.786, pc: 3.64,  mag:  4.69, spectral: 'K', planets: 1 },
  { id: 'cyg61',      name: '61 Cygni',       ra: 21.115, dec:  38.749, pc: 3.50,  mag:  5.21, spectral: 'K' },
  // Famous planetary systems a bit farther out.
  { id: 'gliese581',  name: 'Gliese 581',     ra: 15.323, dec:  -7.722, pc: 6.30,  mag: 10.57, spectral: 'M', planets: 3 },
  { id: 'trappist1',  name: 'TRAPPIST-1',     ra: 23.108, dec:  -5.041, pc: 12.47, mag: 18.80, spectral: 'M', planets: 7 },
  { id: 'peg51',      name: '51 Pegasi',      ra: 22.958, dec:  20.769, pc: 15.47, mag:  5.49, spectral: 'G', planets: 1 },
  { id: 'kepler90',   name: 'Kepler-90',      ra: 18.963, dec:  49.306, pc: 855,   mag: 14.0,  spectral: 'G', planets: 8 },
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
  /** `labelFade` defaults to `fade`; pass a lower value to hide the catalog
   *  labels while keeping the stars (e.g. once the galactic tier takes over). */
  setFade: (fade: number, labelFade?: number) => void;
  dispose: () => void;
}

export function makeNearbyStars(lite: boolean): NearbyStarsHandle {
  const group = new THREE.Group();
  group.name = 'galactic.nearbyStars';

  const sprite = softStarSprite();

  // Named stars — each its own sprite, carrying a catalog label with the
  // real distance and, where the system has them, its confirmed planet
  // count. Zooming out of the solar system introduces the actual stellar
  // neighbourhood: Barnard's four worlds, TRAPPIST-1's seven, and so on.
  const positions = new Map<string, THREE.Vector3>();
  const coreSprite = starCoreSprite();
  const namedMats: THREE.SpriteMaterial[] = [];
  const labelMats: THREE.SpriteMaterial[] = [];
  const labelTextures: THREE.CanvasTexture[] = [];
  for (const star of NEARBY_STARS) {
    const pos = raDecPcToVec(star.ra, star.dec, star.pc);
    positions.set(star.id, pos.clone());
    const [r, g, b] = SPECTRAL_RGB[star.spectral];
    const mat = new THREE.SpriteMaterial({
      map: coreSprite,
      color: new THREE.Color(r, g, b),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.copy(pos);
    // Apparent brightness — brighter (lower mag) gets a larger sprite. Kept
    // small: a star is a point with a halo, not a fog ball.
    const apparent = THREE.MathUtils.clamp(1.8 - star.mag * 0.6, 0.4, 3.0);
    spr.scale.setScalar(12 + apparent * 5);
    group.add(spr);
    namedMats.push(mat);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 170;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'middle';
    ctx.font = '500 44px "JetBrains Mono", "SF Mono", Menlo, monospace';
    ctx.fillStyle = 'rgba(212,224,244,0.92)';
    ctx.fillText(star.name.toUpperCase(), 10, 52);
    const ly = star.pc * 3.2616;
    const info = ly >= 100 ? `${Math.round(ly)} LY` : `${ly.toFixed(1)} LY`;
    ctx.font = '500 32px "JetBrains Mono", "SF Mono", Menlo, monospace';
    ctx.fillStyle = 'rgba(142,162,198,0.85)';
    const planetTag = star.planets === 1 ? '1 PLANET' : `${star.planets} PLANETS`;
    ctx.fillText(star.planets ? `${info} · ${planetTag}` : info, 10, 118);
    const labelTex = new THREE.CanvasTexture(canvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const labelMat = new THREE.SpriteMaterial({
      map: labelTex, transparent: true, opacity: 0, depthWrite: false,
    });
    const label = new THREE.Sprite(labelMat);
    // Scale with distance so labels stay a readable size across the layer.
    const s = 6 + pos.length() * 0.042;
    label.scale.set(s * 3, s, 1);
    label.center.set(-0.1, 0.5); // sits just right of the star's glow
    label.position.copy(pos);
    group.add(label);
    labelMats.push(labelMat);
    labelTextures.push(labelTex);
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

  const setFade = (fade: number, labelFade?: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    const lf = THREE.MathUtils.clamp(labelFade ?? fade, 0, 1);
    for (const m of namedMats) m.opacity = f;
    for (const m of labelMats) m.opacity = lf * 0.85;
    fieldMat.opacity = f * 0.72;
    group.visible = f > 0.005;
  };

  return {
    group,
    positions,
    setFade,
    dispose: () => {
      for (const m of namedMats) m.dispose();
      for (const m of labelMats) m.dispose();
      for (const t of labelTextures) t.dispose();
      coreSprite.dispose();
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

/** Tight stellar profile — hot pinpoint core, small halo. The broad soft
 *  sprite reads as fog when a star is viewed from the stellar tier. */
function starCoreSprite(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.07, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.16, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.34, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

/**
 * Star sampler for a barred spiral galaxy, centred at the origin in the XZ
 * plane: exponential radial falloff, log-spiral arm density waves, a central
 * bar, a thin vertical profile that flares outward, and population colouring
 * (warm bulge/bar, blue arm ridges, sparse pink HII, yellow inter-arm).
 * Shared by the Milky Way and Andromeda so both read as the same species.
 */
function sampleSpiralStars(
  starN: number,
  R: number,
  opts: { arms?: number; pitchDeg?: number; barFraction?: number; hiiChance?: number } = {},
): { pos: Float32Array; col: Float32Array } {
  const ARMS = opts.arms ?? 4;
  const pitch = Math.tan(THREE.MathUtils.degToRad(opts.pitchDeg ?? 22));
  const barFrac = opts.barFraction ?? 0.16;
  const hiiChance = opts.hiiChance ?? 0.045;
  const Rd = R * 0.28;
  const thin = R * 0.012;
  const pos = new Float32Array(starN * 3);
  const col = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const r = Math.min(-Rd * Math.log(Math.random() * Math.random() + 1e-6) * 0.5, R * 0.98);
    let theta = Math.random() * Math.PI * 2;
    const rNorm = r / R;
    const isBar = r < R * barFrac;
    let onArm = false;
    if (!isBar && Math.random() < 0.6) {
      const armPhase = Math.log(Math.max(r, 1) / (R * 0.05)) / pitch;
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
      x *= 1.55;
      z *= 0.5;
    }
    const h = thin * (1 + rNorm * 2.2) + (isBar ? R * 0.02 * (1 - rNorm * 4) : 0);
    const y = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.7 * h;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    let cr: number, cg: number, cb: number;
    if (isBar || rNorm < 0.18) {
      cr = 1.0; cg = 0.82; cb = 0.58;                       // old population — warm
    } else if (onArm && Math.random() < hiiChance) {
      cr = 1.0; cg = 0.58; cb = 0.68;                       // HII star-forming region
    } else if (onArm) {
      cr = 0.72; cg = 0.82; cb = 1.0;                       // young OB associations — blue
    } else {
      cr = 1.0; cg = 0.92; cb = 0.74;                       // inter-arm disk — yellowish
    }
    const lum = 0.35 + Math.random() * 0.65;
    col[i * 3] = cr * lum;
    col[i * 3 + 1] = cg * lum;
    col[i * 3 + 2] = cb * lum;
  }
  return { pos, col };
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
  const starN = lite ? 12000 : 34000;
  const { pos: vPos, col: vCol } = sampleSpiralStars(starN, diskRadius, { hiiChance: 0.03 });
  const volGeom = new THREE.BufferGeometry();
  volGeom.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  volGeom.setAttribute('color', new THREE.BufferAttribute(vCol, 3));
  const volMat = new THREE.PointsMaterial({
    map: softStarSprite(),
    size: lite ? 14 : 11,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
  });
  const volume = new THREE.Points(volGeom, volMat);
  // Centre the sampled disk on the galactic centre (Sun stays at origin).
  volume.position.set(-sunOffsetLocal.x, 0, -sunOffsetLocal.z);
  group.add(volume);

  // Faint halo of population-II stars around the bulge — adds depth above
  // and below the disk plane. Modest count, additive blend.
  const haloN = 1200;
  const haloPos = new Float32Array(haloN * 3);
  const haloCol = new Float32Array(haloN * 3);
  for (let i = 0; i < haloN; i++) {
    // Sample inside a flattened ellipsoid centred on the galactic centre.
    // Kept compact and dim — an oversized halo reads as a stray plume of
    // dots crossing the disk when the galaxy is viewed edge-on.
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = Math.pow(w, 0.35) * 1100 + 90;
    const x = -sunOffsetLocal.x + r * Math.sin(p) * Math.cos(t);
    const z = -sunOffsetLocal.z + r * Math.sin(p) * Math.sin(t) * 0.4; // flatten in disk plane
    const y = r * Math.cos(p) * 0.28;
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
    size: 13,
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

  // Warm core glow (like Andromeda's) so the bulge stays a bright luminous
  // nucleus from every viewing angle — the flat texture disk vanishes when
  // seen edge-on, and without this the centre looked like loose grit.
  const coreGlowMat = new THREE.SpriteMaterial({
    map: softStarSprite(),
    color: new THREE.Color(1.0, 0.88, 0.66),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coreGlow = new THREE.Sprite(coreGlowMat);
  coreGlow.scale.setScalar(diskRadius * 0.3);
  coreGlow.position.copy(disk.position);
  group.add(coreGlow);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    // Texture disk provides the smooth glow underneath; the particle volume
    // carries most of the brightness so the galaxy reads as true 3D.
    diskMat.opacity = f * 0.55;
    volMat.opacity = f * 0.92;
    haloMat.opacity = f * 0.28;
    coreGlowMat.opacity = f * 0.5;
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
      haloGeom.dispose();
      (haloMat.map as THREE.Texture | null)?.dispose();
      haloMat.dispose();
      coreGlowMat.dispose();
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

  // HII regions — soft pink glows scattered loosely around the arms. Kept
  // few, dim, and well-jittered so they read as nebulae, not a dashed ring.
  for (let i = 0; i < 70; i++) {
    const armIdx = Math.floor(Math.random() * arms);
    const t = 0.3 + Math.random() * 0.55;
    const theta = armIdx * (Math.PI * 2 / arms) + t * Math.PI * 2 * turns;
    const r = t * SIZE * 0.44;
    const cx = SIZE / 2 + Math.cos(theta) * r + (Math.random() - 0.5) * 26;
    const cy = SIZE / 2 + Math.sin(theta) * r + (Math.random() - 0.5) * 26;
    const rad = 3 + Math.random() * 4;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0,   'rgba(255, 150, 170, 0.4)');
    grad.addColorStop(0.6, 'rgba(255, 110, 140, 0.16)');
    grad.addColorStop(1.0, 'rgba(255, 80, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
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

/* ───────────────────────── andromeda (M31) ───────────────────────── */

export interface AndromedaHandle {
  group: THREE.Group;
  setFade: (fade: number) => void;
  dispose: () => void;
}

/**
 * Andromeda as a true volumetric particle galaxy — same generator as the
 * Milky Way (it's the same species of barred spiral) at its real ~77°
 * inclination, half again larger than the Milky Way, with a warm core glow.
 * Replaces the old flat M31 sprite.
 */
export function makeAndromedaGalaxy(lite: boolean): AndromedaHandle {
  const group = new THREE.Group();
  group.name = 'galactic.andromeda';

  const R = 1500;
  const { pos, col } = sampleSpiralStars(lite ? 4500 : 11000, R, {
    pitchDeg: 20,
    barFraction: 0.13,
    hiiChance: 0.025,
  });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sprite = softStarSprite();
  const mat = new THREE.PointsMaterial({
    map: sprite,
    size: lite ? 22 : 17,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
  });
  const points = new THREE.Points(geom, mat);
  group.add(points);

  // Warm core glow so the bulge reads bright from every angle.
  const glowMat = new THREE.SpriteMaterial({
    map: sprite,
    color: new THREE.Color(1.0, 0.88, 0.68),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(R * 0.9);
  group.add(glow);

  // M31's real position sense: high above the Milky Way plane in our frame,
  // disk inclined ~77° so it shows the classic near-edge-on ellipse.
  group.position.set(6200, 2800, -4800);
  group.rotation.set(THREE.MathUtils.degToRad(77), 0.6, 0.25);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    mat.opacity = f * 0.9;
    glowMat.opacity = f * 0.5;
    group.visible = f > 0.005;
  };

  return {
    group,
    setFade,
    dispose: () => {
      geom.dispose();
      mat.dispose();
      glowMat.dispose();
      sprite.dispose();
    },
  };
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
  // M31 lives in makeAndromedaGalaxy as a full particle galaxy.
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

/**
 * 2×2 galaxy sprite atlas: spiral face-on / elliptical / edge-on disk /
 * irregular. Each galaxy is drawn inside the central ~72% of its tile so the
 * per-point rotation in the shader never clips a corner. This is what turns
 * the far tier into a Hubble-deep-field of shaped galaxies instead of dots.
 */
function galaxyAtlasTexture(): THREE.CanvasTexture {
  const TILE = 256;
  const c = document.createElement('canvas');
  c.width = c.height = TILE * 2;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, TILE * 2, TILE * 2);

  const withTile = (tx: number, ty: number, draw: (cx: number, cy: number) => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx * TILE, ty * TILE, TILE, TILE);
    ctx.clip();
    draw(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    ctx.restore();
  };

  // Tile (0,0) — face-on spiral.
  withTile(0, 0, (cx, cy) => {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE * 0.34);
    bg.addColorStop(0, 'rgba(255,244,222,0.95)');
    bg.addColorStop(0.18, 'rgba(255,232,190,0.5)');
    bg.addColorStop(0.55, 'rgba(190,200,235,0.16)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(cx - TILE / 2, cy - TILE / 2, TILE, TILE);
    for (let i = 0; i < 2600; i++) {
      const arm = Math.floor(Math.random() * 2);
      const t = Math.pow(Math.random(), 0.6);
      const theta = arm * Math.PI + t * Math.PI * 1.7;
      const rr = t * TILE * 0.34;
      const jit = (1 - t * 0.5) * 7;
      const x = cx + Math.cos(theta) * rr + (Math.random() - 0.5) * jit;
      const y = cy + Math.sin(theta) * rr * 0.92 + (Math.random() - 0.5) * jit;
      const a = (1 - t) * 0.5 + 0.08;
      ctx.fillStyle = `rgba(214,226,255,${a})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  });

  // Tile (1,0) — elliptical.
  withTile(1, 0, (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.72);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, TILE * 0.32);
    bg.addColorStop(0, 'rgba(255,240,214,0.95)');
    bg.addColorStop(0.35, 'rgba(244,222,186,0.42)');
    bg.addColorStop(0.75, 'rgba(220,198,168,0.12)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(-TILE / 2, -TILE / 2, TILE, TILE);
    ctx.restore();
  });

  // Tile (0,1) — edge-on disk: thin streak + central bulge + dust hint.
  withTile(0, 1, (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    const streak = ctx.createLinearGradient(-TILE * 0.34, 0, TILE * 0.34, 0);
    streak.addColorStop(0, 'rgba(0,0,0,0)');
    streak.addColorStop(0.2, 'rgba(235,225,205,0.55)');
    streak.addColorStop(0.5, 'rgba(255,244,222,0.9)');
    streak.addColorStop(0.8, 'rgba(235,225,205,0.55)');
    streak.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.ellipse(0, 0, TILE * 0.34, TILE * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    const bulge = ctx.createRadialGradient(0, 0, 0, 0, 0, TILE * 0.1);
    bulge.addColorStop(0, 'rgba(255,240,210,0.95)');
    bulge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bulge;
    ctx.beginPath();
    ctx.ellipse(0, 0, TILE * 0.1, TILE * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dust lane
    ctx.fillStyle = 'rgba(20,12,8,0.5)';
    ctx.fillRect(-TILE * 0.3, -1.5, TILE * 0.6, 3);
    ctx.restore();
  });

  // Tile (1,1) — irregular: offset clumps.
  withTile(1, 1, (cx, cy) => {
    for (let b = 0; b < 5; b++) {
      const bx = cx + (Math.random() - 0.5) * TILE * 0.3;
      const by = cy + (Math.random() - 0.5) * TILE * 0.3;
      const br = TILE * (0.07 + Math.random() * 0.12);
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, 'rgba(226,232,255,0.6)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - TILE / 2, cy - TILE / 2, TILE, TILE);
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const GALAXY_POINTS_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAngle;
  attribute vec2 aTile;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAngle;
  varying vec2 vTile;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vAngle = aAngle;
    vTile = aTile;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (900.0 / max(1.0, -mv.z)), 1.5, 220.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const GALAXY_POINTS_FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAngle;
  varying vec2 vTile;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float s = sin(vAngle);
    float co = cos(vAngle);
    vec2 rp = vec2(p.x * co - p.y * s, p.x * s + p.y * co);
    if (abs(rp.x) > 0.5 || abs(rp.y) > 0.5) discard;
    vec2 uv = (rp + 0.5) * 0.5 + vTile;
    vec4 t = texture2D(uAtlas, uv);
    float a = t.a * uOpacity * vAlpha;
    if (a < 0.012) discard;
    gl_FragColor = vec4(vColor * t.rgb, a);
  }
`;

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

  // ── One merged deep field: every entry is a shaped galaxy sprite with its
  // own rotation, atlas tile, tint, and brightness — filament members,
  // cluster members, and lonely void galaxies all in a single draw call. ──
  const filN = lite ? 5200 : 13000;
  const coreN = lite ? 2600 : 6400;
  const fieldN = lite ? 1400 : 3600;
  const total = filN + coreN + fieldN;

  const gPos = new Float32Array(total * 3);
  const gCol = new Float32Array(total * 3);
  const gSize = new Float32Array(total);
  const gAngle = new Float32Array(total);
  const gTile = new Float32Array(total * 2);
  const gAlpha = new Float32Array(total);

  // Atlas tile UV offsets (flipY canvas → top row is v=0.5).
  const TILE_SPIRAL: [number, number] = [0, 0.5];
  const TILE_ELLIPTICAL: [number, number] = [0.5, 0.5];
  const TILE_EDGE: [number, number] = [0, 0];
  const TILE_IRREGULAR: [number, number] = [0.5, 0];

  let w = 0;
  const put = (
    x: number, y: number, z: number,
    kind: 'cluster' | 'filament' | 'field',
  ) => {
    const i = w++;
    gPos[i * 3] = x;
    gPos[i * 3 + 1] = y;
    gPos[i * 3 + 2] = z;
    // Morphology mix: clusters are elliptical-rich (real morphology–density
    // relation); filaments and the field are spiral-rich.
    const roll = Math.random();
    let tile: [number, number];
    if (kind === 'cluster') {
      tile = roll < 0.55 ? TILE_ELLIPTICAL : roll < 0.8 ? TILE_SPIRAL : roll < 0.93 ? TILE_EDGE : TILE_IRREGULAR;
    } else {
      tile = roll < 0.45 ? TILE_SPIRAL : roll < 0.68 ? TILE_EDGE : roll < 0.86 ? TILE_ELLIPTICAL : TILE_IRREGULAR;
    }
    gTile[i * 2] = tile[0];
    gTile[i * 2 + 1] = tile[1];
    gAngle[i] = Math.random() * Math.PI * 2;
    // Tint: ellipticals warm gold, spirals blue-white, plus a redshifted tail.
    const isEll = tile === TILE_ELLIPTICAL;
    const redshifted = Math.random() < 0.16;
    if (redshifted) {
      gCol[i * 3] = 0.95; gCol[i * 3 + 1] = 0.62; gCol[i * 3 + 2] = 0.5;
    } else if (isEll) {
      gCol[i * 3] = 1.0; gCol[i * 3 + 1] = 0.88; gCol[i * 3 + 2] = 0.7;
    } else {
      gCol[i * 3] = 0.82; gCol[i * 3 + 1] = 0.88; gCol[i * 3 + 2] = 1.0;
    }
    if (kind === 'cluster') {
      gSize[i] = 90 + Math.random() * Math.random() * 220;
      gAlpha[i] = 0.55 + Math.random() * 0.45;
    } else if (kind === 'filament') {
      gSize[i] = 60 + Math.random() * 110;
      gAlpha[i] = 0.4 + Math.random() * 0.4;
    } else {
      gSize[i] = 50 + Math.random() * 110;
      gAlpha[i] = 0.2 + Math.random() * 0.3;
    }
  };

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
    put(
      pt.x + (Math.random() + Math.random() - 1) * spread,
      pt.y + (Math.random() + Math.random() - 1) * spread,
      pt.z + (Math.random() + Math.random() - 1) * spread,
      'filament',
    );
  }

  // Cluster cores — dense knots at the nodes (galaxies crowd there).
  for (let i = 0; i < coreN; i++) {
    const n = nodes[i % NODE_N];
    const sigma = 380 + (i % 7) * 60;
    put(
      n.x + (Math.random() + Math.random() + Math.random() - 1.5) * sigma,
      n.y + (Math.random() + Math.random() + Math.random() - 1.5) * sigma,
      n.z + (Math.random() + Math.random() + Math.random() - 1.5) * sigma,
      'cluster',
    );
  }

  // Sparse lonely galaxies drifting in the voids.
  for (let i = 0; i < fieldN; i++) {
    const u = Math.random();
    const v = Math.random();
    const t = 2 * Math.PI * u;
    const p = Math.acos(2 * v - 1);
    const r = R_MIN * 0.8 + Math.random() * (R_MAX - R_MIN * 0.8);
    put(
      r * Math.sin(p) * Math.cos(t),
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      'field',
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
  geom.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  geom.setAttribute('aAngle', new THREE.BufferAttribute(gAngle, 1));
  geom.setAttribute('aTile', new THREE.BufferAttribute(gTile, 2));
  geom.setAttribute('aAlpha', new THREE.BufferAttribute(gAlpha, 1));

  const atlas = galaxyAtlasTexture();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: atlas },
      uOpacity: { value: 0 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
    },
    vertexShader: GALAXY_POINTS_VERT,
    fragmentShader: GALAXY_POINTS_FRAG,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geom, mat);
  group.add(pts);

  const setFade = (fade: number) => {
    const f = THREE.MathUtils.clamp(fade, 0, 1);
    mat.uniforms.uOpacity.value = f;
    group.visible = f > 0.005;
  };

  return {
    group,
    setFade,
    dispose: () => {
      geom.dispose();
      mat.dispose();
      atlas.dispose();
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
  //   1400-3800 : galactic tier
  //   3800-6500 : intergalactic tier (Local Group galaxies pop in)
  //   6500+ : cosmic web — clusters + filaments of the large-scale structure
  const stellar = smoothstep(60, 220, radius);
  const galactic = smoothstep(1400, 3200, radius);
  const universe = smoothstep(3800, 5800, radius);
  const web = smoothstep(6500, 10500, radius);
  // The solar tier doesn't fully disappear — at huge distances the sun
  // simply becomes a tiny dot via perspective, no need to hide the meshes.
  const solar = 1.0;
  return { solar, stellar, galactic, universe, web };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
