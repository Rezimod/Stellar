import * as THREE from 'three';
import { GeoMoon } from 'astronomy-engine';
import {
  helioEqjToThree,
  sampleOrbitPath,
  sceneRadiusFromAu,
  worldRadiusForBody,
  type ScaleMode,
  type SolarBodyId,
} from '@/lib/solar-system/ephemeris';

const SRGB = THREE.SRGBColorSpace;
const MS_DAY = 86_400_000;
/** Mean motion (rad/ms) for a circular heliocentric orbit at `au` — Kepler's third law. */
function meanMotionRadPerMs(au: number): number {
  return (Math.PI * 2) / (Math.pow(au, 1.5) * 365.256 * MS_DAY);
}

/* ───────────────────────── orbit rings ───────────────────────── */

/**
 * True orbit paths — each line is the body's real heliocentric trajectory
 * sampled over one sidereal period, so Mercury's eccentric ellipse and
 * Pluto's inclined Neptune-crossing orbit render exactly as in space
 * (instead of the flat concentric circles a toy orrery would draw).
 */
export function makeOrbitRings(mode: ScaleMode, includePluto: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = 'orbitRings';

  const ids: Exclude<SolarBodyId, 'sun'>[] = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  ];
  if (includePluto) ids.push('pluto');

  for (const id of ids) {
    const pts = sampleOrbitPath(id, mode);
    const pos = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      pos[i * 3] = pts[i].x;
      pos[i * 3 + 1] = pts[i].y;
      pos[i * 3 + 2] = pts[i].z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const opacity = id === 'pluto' ? 0.1 : 0.13;
    const mat = new THREE.LineBasicMaterial({
      color: 0x6b86c8,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const line = new THREE.LineLoop(geom, mat);
    line.userData.orbitFor = id;
    group.add(line);
  }
  return group;
}

export function disposeOrbitRings(group: THREE.Group) {
  group.traverse((o) => {
    if (o instanceof THREE.LineLoop || o instanceof THREE.Line) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}

/* ───────────────────────── asteroid belt ───────────────────────── */

export interface BeltHandle {
  group: THREE.Group;
  /** Repositions every particle for the simulation epoch — Keplerian rates. */
  update: (epochMs: number) => void;
  dispose: () => void;
}

function diskSprite(): THREE.CanvasTexture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,235,200,1)');
  grad.addColorStop(0.45, 'rgba(220,200,170,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = SRGB;
  return t;
}

export function makeAsteroidBelt(mode: ScaleMode, lite: boolean): BeltHandle {
  const count = lite ? 1200 : 2800;
  const innerAu = 2.15;
  const outerAu = 3.3;
  const inner = sceneRadiusFromAu(innerAu, mode);
  const outer = sceneRadiusFromAu(outerAu, mode);
  const thickness = (outer - inner) * 0.06;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const heights = new Float32Array(count);
  const driftRates = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const tAu = Math.pow(Math.random(), 0.62);
    const au = innerAu + tAu * (outerAu - innerAu);
    const r = sceneRadiusFromAu(au, mode);
    const y = (Math.random() - 0.5) * thickness;
    angles[i] = a;
    radii[i] = r;
    heights[i] = y;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;
    const shade = 0.55 + Math.random() * 0.45;
    colors[i * 3] = 0.85 * shade;
    colors[i * 3 + 1] = 0.72 * shade;
    colors[i * 3 + 2] = 0.55 * shade;
    sizes[i] = 0.018 + Math.random() * 0.032;
    // True Keplerian mean motion for the particle's heliocentric distance —
    // an inner-belt asteroid takes ~3.2 years per lap, exactly as in space.
    driftRates[i] = meanMotionRadPerMs(au);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const sprite = diskSprite();
  const mat = new THREE.PointsMaterial({
    map: sprite,
    size: 0.038,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.02,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'asteroidBelt';

  const group = new THREE.Group();
  group.name = 'asteroidBeltGroup';
  group.add(points);

  // A few resolvable boulders among the dust — lumpy displaced icosahedra
  // (Ceres/Vesta-class stand-ins) on their own Keplerian orbits, tumbling
  // slowly. Everything else in the belt stays a point sprite.
  const boulders: {
    mesh: THREE.Mesh;
    r: number;
    y: number;
    angle0: number;
    rate: number;
    spinRate: number;
  }[] = [];
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x8d8073,
    roughness: 0.95,
    metalness: 0.02,
  });
  const BOULDER_N = lite ? 3 : 6;
  for (let i = 0; i < BOULDER_N; i++) {
    const bGeom = new THREE.IcosahedronGeometry(0.008 + Math.random() * 0.008, 1);
    // Gently lumpy silhouette — potato, not shrapnel.
    const bp = bGeom.getAttribute('position') as THREE.BufferAttribute;
    for (let v = 0; v < bp.count; v++) {
      const k = 0.88 + Math.random() * 0.24;
      bp.setXYZ(v, bp.getX(v) * k, bp.getY(v) * (0.85 + Math.random() * 0.25), bp.getZ(v) * k);
    }
    bGeom.computeVertexNormals();
    const bMesh = new THREE.Mesh(bGeom, boulderMat);
    const au = innerAu + Math.random() * (outerAu - innerAu);
    boulders.push({
      mesh: bMesh,
      r: sceneRadiusFromAu(au, mode),
      y: (Math.random() - 0.5) * thickness,
      angle0: Math.random() * Math.PI * 2,
      rate: meanMotionRadPerMs(au),
      spinRate: (0.5 + Math.random()) * 2e-5, // rad/ms of sim time
    });
    group.add(bMesh);
  }

  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  return {
    group,
    update(epochMs: number) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const a = angles[i] + driftRates[i] * epochMs;
        const r = radii[i];
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = heights[i];
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
      posAttr.needsUpdate = true;
      for (const b of boulders) {
        const a = b.angle0 + b.rate * epochMs;
        b.mesh.position.set(Math.cos(a) * b.r, b.y, Math.sin(a) * b.r);
        b.mesh.rotation.y = b.spinRate * epochMs;
        b.mesh.rotation.x = b.spinRate * 0.6 * epochMs;
      }
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      sprite.dispose();
      for (const b of boulders) b.mesh.geometry.dispose();
      boulderMat.dispose();
    },
  };
}

/* ───────────────────────── kuiper belt ───────────────────────── */

export function makeKuiperBelt(mode: ScaleMode, lite: boolean): BeltHandle {
  const count = lite ? 600 : 1400;
  const innerAu = 30;
  const outerAu = 50;
  const inner = sceneRadiusFromAu(innerAu, mode);
  const outer = sceneRadiusFromAu(outerAu, mode);
  const thickness = (outer - inner) * 0.18;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const heights = new Float32Array(count);
  const driftRates = new Float64Array(count);

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const au = innerAu + Math.random() * (outerAu - innerAu);
    const r = sceneRadiusFromAu(au, mode);
    const y = (Math.random() - 0.5) * thickness;
    angles[i] = a;
    radii[i] = r;
    heights[i] = y;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;
    const shade = 0.45 + Math.random() * 0.4;
    colors[i * 3] = 0.6 * shade;
    colors[i * 3 + 1] = 0.66 * shade;
    colors[i * 3 + 2] = 0.85 * shade;
    driftRates[i] = meanMotionRadPerMs(au);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const sprite = diskSprite();
  const mat = new THREE.PointsMaterial({
    map: sprite,
    size: 0.026,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.02,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'kuiperBelt';

  const group = new THREE.Group();
  group.name = 'kuiperBeltGroup';
  group.add(points);

  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  return {
    group,
    update(epochMs: number) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const a = angles[i] + driftRates[i] * epochMs;
        const r = radii[i];
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = heights[i];
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
      posAttr.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      sprite.dispose();
    },
  };
}

/* ───────────────────────── earth clouds + moon ───────────────────────── */

function cloudsTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 220; i++) {
    const cx = Math.random() * w;
    const cy = Math.pow(Math.random(), 0.7) * h;
    const rx = 30 + Math.random() * 70;
    const ry = 12 + Math.random() * 32;
    const alpha = 0.18 + Math.random() * 0.34;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.4})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export interface EarthExtrasHandle {
  cloudMesh: THREE.Mesh;
  atmosphereMesh: THREE.Mesh;
  moonGroup: THREE.Group;
  moonMesh: THREE.Mesh;
  /** `dtSec` drives the real-time weather (lightning); epoch drives orbits. */
  update: (epochMs: number, dtSec: number) => void;
  dispose: () => void;
}

function moonTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b6b1a8';
  ctx.fillRect(0, 0, w, h);
  // Noise.
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  // Craters.
  for (let i = 0; i < 110; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const r = 3 + Math.random() * 14;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(40,38,34,0.55)');
    g.addColorStop(0.7, 'rgba(80,76,70,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Maria.
  ctx.fillStyle = 'rgba(60,58,55,0.32)';
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 25 + Math.random() * 45, 14 + Math.random() * 28, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  return tex;
}

const ATMOSPHERE_VERT = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ATMOSPHERE_FRAG = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
    gl_FragColor = vec4(uColor * fresnel * uIntensity, fresnel);
  }
`;

export function makeAtmosphereShell(planetRadius: number, color: number, scale = 1.06, intensity = 1.2, power = 2.2): THREE.Mesh {
  const geom = new THREE.SphereGeometry(planetRadius * scale, 48, 48);
  const c = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: ATMOSPHERE_VERT,
    fragmentShader: ATMOSPHERE_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.isAtmosphere = true;
  return mesh;
}

export function disposeAtmosphereShell(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}

export function makeEarthExtras(earthRadius: number, lite: boolean): EarthExtrasHandle {
  // Cloud layer — procedural fallback swaps to the real NASA-derived
  // satellite cloud composite once it loads.
  const cloudsTex = cloudsTexture();
  const cloudGeom = new THREE.SphereGeometry(earthRadius * 1.013, lite ? 48 : 72, lite ? 48 : 72);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudsTex,
    alphaMap: cloudsTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
  cloudMesh.userData.isClouds = true;

  let realCloudsTex: THREE.Texture | null = null;
  new THREE.TextureLoader().load('/solar-system/planets/earth-clouds.jpg', (tex) => {
    tex.colorSpace = SRGB;
    tex.wrapS = THREE.RepeatWrapping;
    realCloudsTex = tex;
    cloudMat.map = tex;
    cloudMat.alphaMap = tex; // clouds-on-black composite doubles as alpha
    cloudMat.needsUpdate = true;
  });

  // Thunderstorms — small flash sprites parked inside the cloud layer.
  // Each storm cell flickers 2–3 times, goes dark, then re-arms elsewhere
  // on its own schedule, the way lightning looks from orbit.
  const STORM_N = lite ? 3 : 6;
  const stormTex = cometGlowSprite(); // cool white-blue glow — reads as lightning
  const storms: {
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    wait: number;
    burst: number; // >0 while flickering
  }[] = [];
  const placeStorm = (spr: THREE.Sprite) => {
    // Bias toward the tropics where thunderstorms actually cluster.
    const lat = (Math.random() + Math.random() - 1) * 0.62; // ±~35°
    const lon = Math.random() * Math.PI * 2;
    const r = earthRadius * 1.015;
    spr.position.set(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon),
    );
  };
  for (let i = 0; i < STORM_N; i++) {
    const mat = new THREE.SpriteMaterial({
      map: stormTex,
      color: new THREE.Color(0.85, 0.9, 1.0),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(earthRadius * 0.14);
    placeStorm(sprite);
    cloudMesh.add(sprite); // rides the cloud layer's rotation
    storms.push({ sprite, mat, wait: 1 + Math.random() * 5, burst: 0 });
  }

  // Atmosphere fresnel shell
  const atmosphereMesh = makeAtmosphereShell(earthRadius, 0x6ab7ff, 1.06, 1.3, 2.4);

  // Moon — orbiting parent group; group orbits, moon spins
  const moonGroup = new THREE.Group();
  moonGroup.name = 'moonGroup';
  const moonTex = moonTexture();
  const moonRadius = earthRadius * 0.273;
  const moonGeom = new THREE.SphereGeometry(moonRadius, lite ? 32 : 48, lite ? 32 : 48);
  const moonMat = new THREE.MeshStandardMaterial({
    map: moonTex,
    roughness: 0.96,
    metalness: 0,
  });
  const moonMesh = new THREE.Mesh(moonGeom, moonMat);
  // Distance: in real life ≈ 30 Earth diameters, but compressed for visibility.
  const moonDist = earthRadius * 4.2;
  moonMesh.position.set(moonDist, 0, 0);
  moonGroup.add(moonMesh);

  const moonDir = new THREE.Vector3();

  return {
    cloudMesh,
    atmosphereMesh,
    moonGroup,
    moonMesh,
    update(epochMs: number, dtSec: number) {
      // Cloud is a child of spinning Earth; set local rotation to a small drift
      // so world-space cloud motion = earth spin + slight delta (visual drift).
      cloudMesh.rotation.y = (epochMs / (86400 * 1000)) * Math.PI * 2 * 0.04;
      // Real geocentric Moon direction from the lunar ephemeris — phase,
      // 5.1° inclination, and node regression all come along for free.
      // Only the distance is compressed for visibility.
      moonDir.copy(helioEqjToThree(GeoMoon(new Date(epochMs)))).normalize();
      moonMesh.position.copy(moonDir).multiplyScalar(moonDist);
      // Tidally locked — keep the same hemisphere pointed at Earth.
      moonMesh.rotation.y = Math.atan2(-moonDir.z, -moonDir.x);

      // Lightning — quick double/triple flickers, then a long dark rearm.
      for (const s of storms) {
        if (s.burst > 0) {
          s.burst -= dtSec;
          // Flicker envelope: a few sharp pulses across ~0.5 s.
          const p = Math.max(0, s.burst) * 14;
          s.mat.opacity = Math.max(0, Math.sin(p) * Math.sin(p * 2.7)) * 0.9;
          if (s.burst <= 0) {
            s.mat.opacity = 0;
            s.wait = 2 + Math.random() * 7;
            placeStorm(s.sprite);
          }
        } else {
          s.wait -= dtSec;
          if (s.wait <= 0) s.burst = 0.5;
        }
      }
    },
    dispose() {
      cloudGeom.dispose();
      cloudMat.dispose();
      cloudsTex.dispose();
      realCloudsTex?.dispose();
      for (const s of storms) s.mat.dispose();
      stormTex.dispose();
      disposeAtmosphereShell(atmosphereMesh);
      moonGeom.dispose();
      moonMat.dispose();
      moonTex.dispose();
    },
  };
}

/* ───────────────────────── sun corona + lens flare ───────────────────────── */

export interface SunExtrasHandle {
  group: THREE.Group;
  update: (cameraPos: THREE.Vector3, sunPos: THREE.Vector3, dtSec: number) => void;
  dispose: () => void;
}

function lensFlareSprite(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,240,200,0.95)');
  grad.addColorStop(0.18, 'rgba(255,200,120,0.55)');
  grad.addColorStop(0.5, 'rgba(255,140,60,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = SRGB;
  return t;
}

/** Glowing prominence loop — a fiery arc that stands on the solar limb. */
function prominenceTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  // Arch: half-ellipse from (0.2w, h) to (0.8w, h) peaking near y = 0.18h.
  const draw = (lw: number, alpha: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(w / 2, h, w * 0.3, h * 0.82, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  };
  draw(18, 0.25, '#ff5a20');
  draw(10, 0.5, '#ff8a30');
  draw(5, 0.85, '#ffc060');
  draw(2, 1.0, '#fff0c0');
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  return tex;
}

/** Elongated jet for eruptive flares. */
function flareJetTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(255,220,150,0.95)');
  g.addColorStop(0.35, 'rgba(255,150,60,0.55)');
  g.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h);
  ctx.quadraticCurveTo(w * 0.18, h * 0.45, w * 0.42, 0);
  ctx.lineTo(w * 0.58, 0);
  ctx.quadraticCurveTo(w * 0.82, h * 0.45, w * 0.5, h);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  return tex;
}

export function makeSunExtras(sunRadius: number): SunExtrasHandle {
  const group = new THREE.Group();
  group.name = 'sunExtras';

  // Outer corona shell
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(sunRadius * 1.85, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffd07a,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  corona.name = 'sunCorona';

  // ── Prominence loops — fiery arcs anchored on the limb, carried around
  // by the Sun's slow rotation, each breathing on its own rhythm. ──
  const promTex = prominenceTexture();
  const promGroup = new THREE.Group();
  promGroup.name = 'sunProminences';
  const proms: { pivot: THREE.Group; plane: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number; speed: number }[] = [];
  const promGeom = new THREE.PlaneGeometry(sunRadius * 1.35, sunRadius * 0.72);
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: promTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(promGeom, mat);
    // Stand the arc on the limb: texture "up" points radially outward.
    plane.rotation.z = -Math.PI / 2;
    plane.position.x = sunRadius * 1.08;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 4) * Math.PI * 2 + Math.random() * 0.8;
    pivot.rotation.z = (Math.random() - 0.5) * 1.1;
    pivot.add(plane);
    promGroup.add(pivot);
    proms.push({ pivot, plane, mat, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.5 });
  }

  // ── Eruptive flare — a jet that bursts from a random limb point every
  // several seconds, grows, and fades. ──
  const jetTex = flareJetTexture();
  const jetMat = new THREE.MeshBasicMaterial({
    map: jetTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const jetGeom = new THREE.PlaneGeometry(sunRadius * 0.5, sunRadius * 1.3);
  const jet = new THREE.Mesh(jetGeom, jetMat);
  jet.rotation.z = -Math.PI / 2;
  jet.position.x = sunRadius * 1.05;
  const jetPivot = new THREE.Group();
  jetPivot.add(jet);
  promGroup.add(jetPivot);
  let flareClock = 3; // first eruption a few seconds in
  let flareT = -1;    // <0 = idle, otherwise seconds since eruption began
  const FLARE_DUR = 3.2;

  // Lens flare sprite (always faces camera, scales w/ distance)
  const flareTex = lensFlareSprite();
  const flare = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flare.scale.set(sunRadius * 6, sunRadius * 6, 1);
  flare.name = 'sunFlare';

  group.add(corona);
  group.add(flare);
  group.add(promGroup);

  let pulse = 0;

  return {
    group,
    update(cameraPos, sunPos, dtSec) {
      pulse += dtSec * 0.8;
      const breath = 1 + Math.sin(pulse) * 0.03;
      corona.scale.setScalar(breath);
      // Flare scales with camera distance so it doesn't get monstrous at zoom-in.
      const dist = cameraPos.distanceTo(sunPos);
      const flareScale = THREE.MathUtils.clamp(dist * 0.42, sunRadius * 5, sunRadius * 24);
      flare.scale.set(flareScale, flareScale, 1);
      flare.position.copy(sunPos);
      corona.position.copy(sunPos);
      promGroup.position.copy(sunPos);

      // Prominences are a close-range detail — from system distance the
      // flat arc planes would read as odd rings, so fade them out beyond
      // ~12 solar radii and let the corona carry the look.
      const promVis = THREE.MathUtils.clamp((sunRadius * 12 - dist) / (sunRadius * 6), 0, 1);
      promGroup.visible = promVis > 0.01;

      // Prominences ride the Sun's slow rotation and breathe individually.
      promGroup.rotation.y += dtSec * 0.02;
      for (const p of proms) {
        p.phase += dtSec * p.speed;
        const s = 1 + Math.sin(p.phase) * 0.18;
        p.plane.scale.set(1, s, 1);
        p.mat.opacity = (0.65 + 0.3 * Math.sin(p.phase * 0.7 + 1.3)) * promVis;
      }

      // Eruptive flare cycle: idle → burst (grow fast, fade out) → idle.
      if (flareT < 0) {
        flareClock -= dtSec;
        if (flareClock <= 0) {
          flareT = 0;
          jetPivot.rotation.y = Math.random() * Math.PI * 2;
          jetPivot.rotation.z = (Math.random() - 0.5) * 1.6;
        }
      } else {
        flareT += dtSec;
        const t = flareT / FLARE_DUR;
        if (t >= 1) {
          flareT = -1;
          flareClock = 6 + Math.random() * 9;
          jetMat.opacity = 0;
        } else {
          // Fast rise, slow decay.
          const env = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
          jetMat.opacity = env * 0.85 * promVis;
          const grow = 0.5 + Math.min(1, t * 2.2) * 0.9;
          jet.scale.set(1, grow, 1);
        }
      }
    },
    dispose() {
      corona.geometry.dispose();
      (corona.material as THREE.Material).dispose();
      (flare.material as THREE.SpriteMaterial).dispose();
      flareTex.dispose();
      promGeom.dispose();
      for (const p of proms) p.mat.dispose();
      promTex.dispose();
      jetGeom.dispose();
      jetMat.dispose();
      jetTex.dispose();
    },
  };
}

/* ───────────────────────── milky way background ───────────────────────── */

export function makeMilkyWayBand(lite: boolean): THREE.Points {
  const count = lite ? 800 : 2400;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const inclination = 0.42; // band tilt vs ecliptic
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const angle = u * Math.PI * 2;
    const bandThickness = (Math.random() - 0.5) * 0.55;
    const r = 280 + Math.random() * 60;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = bandThickness * r * 0.18;
    // rotate around X by inclination
    const cy = Math.cos(inclination);
    const sy = Math.sin(inclination);
    pos[i * 3] = x;
    pos[i * 3 + 1] = y * cy - z * sy;
    pos[i * 3 + 2] = y * sy + z * cy;
    const warmth = 0.4 + Math.random() * 0.6;
    col[i * 3] = 0.92 * warmth;
    col[i * 3 + 1] = 0.82 * warmth;
    col[i * 3 + 2] = 0.68 * warmth;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: lite ? 0.5 : 0.42,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'milkyWay';
  return pts;
}

export function disposeMilkyWayBand(pts: THREE.Points) {
  pts.geometry.dispose();
  (pts.material as THREE.Material).dispose();
}

/* ───────────────────────── saturn particle rings ───────────────────────── */
/**
 * Particle-based Saturn ring system matching the home-page hero look:
 * 4–18k tiny disks with Cassini + Encke gaps, banded warm palette,
 * Keplerian angular drift entirely on the GPU. Replaces the flat
 * RingGeometry mesh so the rings feel like millions of icy pebbles when
 * the camera orbits close to Saturn.
 */
export interface SaturnRingsHandle {
  group: THREE.Group;
  /** `simSec` — simulation seconds (epoch-relative), so ring motion tracks sim speed. */
  update: (simSec: number) => void;
  dispose: () => void;
}

/**
 * Radial color+alpha strip encoding Saturn's real ring structure, sampled by
 * radius across the ring mesh: D (faint) → C (translucent) → B (bright,
 * opaque) → Cassini Division → A with the Encke and Keeler gaps → F (thin
 * bright thread). Fine-grained noise adds the ringlet banding Cassini saw.
 */
function saturnRingStripTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 16;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const R0 = 1.11;
  const R1 = 2.33;
  const img = ctx.createImageData(W, H);
  // Band lookup: [rIn, rOut, r, g, b, alpha]
  const bands: [number, number, number, number, number, number][] = [
    [1.110, 1.236, 150, 135, 120, 0.05],  // D ring
    [1.239, 1.526, 168, 146, 122, 0.30],  // C ring
    [1.526, 1.951, 232, 214, 184, 0.94],  // B ring — brightest
    [1.951, 2.027, 130, 118, 100, 0.10],  // Cassini Division
    [2.027, 2.211, 214, 196, 164, 0.78],  // A ring (inner)
    [2.217, 2.261, 208, 190, 158, 0.72],  // A ring (mid) — Encke gap before
    [2.265, 2.269, 200, 184, 152, 0.66],  // A ring (outer edge) — Keeler gap before
    [2.320, 2.328, 240, 228, 205, 0.42],  // F ring — thin bright thread
  ];
  for (let x = 0; x < W; x++) {
    const R = R0 + (x / W) * (R1 - R0);
    let cr = 0, cg = 0, cb = 0, ca = 0;
    for (const [ri, ro, r, g, b, a] of bands) {
      if (R >= ri && R <= ro) {
        const t = (R - ri) / (ro - ri);
        // Slight inner-to-outer shading within each band.
        const shade = 0.92 + 0.08 * Math.sin(t * Math.PI);
        cr = r * shade; cg = g * shade; cb = b * shade; ca = a;
        break;
      }
    }
    // Ringlet noise — fine radial brightness striations.
    if (ca > 0.02) {
      const n = 0.86 + 0.14 * Math.sin(x * 0.9) * Math.sin(x * 0.23 + 1.7) + (Math.random() - 0.5) * 0.1;
      cr *= n; cg *= n; cb *= n;
      ca *= 0.9 + (Math.random() - 0.5) * 0.16;
    }
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, cr);
      img.data[i + 1] = Math.min(255, cg);
      img.data[i + 2] = Math.min(255, cb);
      img.data[i + 3] = Math.min(255, Math.round(ca * 255));
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  tex.anisotropy = 8;
  return tex;
}

export function makeSaturnParticleRings(saturnRadius: number, lite: boolean): SaturnRingsHandle {
  // ── Banded ring plane — carries the photoreal look ──────────────
  const meshInner = saturnRadius * 1.11;
  const meshOuter = saturnRadius * 2.33;
  const ringGeom = new THREE.RingGeometry(meshInner, meshOuter, 256, 1);
  // RingGeometry UVs are planar; remap radially so the strip texture reads
  // as concentric bands.
  const posAttr2 = ringGeom.getAttribute('position') as THREE.BufferAttribute;
  const uvAttr = ringGeom.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < posAttr2.count; i++) {
    const len = Math.hypot(posAttr2.getX(i), posAttr2.getY(i));
    uvAttr.setXY(i, (len - meshInner) / (meshOuter - meshInner), 0.5);
  }
  const ringTex = saturnRingStripTexture();
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = -Math.PI / 2; // lie in the equatorial plane
  ringMesh.renderOrder = 1;

  // ── Sparse ice-particle sparkle on top (close-range depth cue) ──
  const RING_COUNT = lite ? 1500 : 4500;
  // Real ring extents: C ring inner edge 1.24 R♄ → A ring outer edge 2.27 R♄.
  const innerR = saturnRadius * 1.239;
  const outerR = saturnRadius * 2.270;

  const yJitter = new Float32Array(RING_COUNT);
  const colors = new Float32Array(RING_COUNT * 3);
  const sizes = new Float32Array(RING_COUNT);
  const radii = new Float32Array(RING_COUNT);
  const baseAngles = new Float32Array(RING_COUNT);

  const palette = [
    new THREE.Color('#f5dcb6'),
    new THREE.Color('#e7c08c'),
    new THREE.Color('#d49a5e'),
    new THREE.Color('#fff3da'),
    new THREE.Color('#a87444'),
  ];

  let filled = 0;
  while (filled < RING_COUNT) {
    const t = Math.pow(Math.random(), 0.85);
    const r = innerR + t * (outerR - innerR);
    // Cassini division: 1.95–1.99 R♄. Encke gap: 2.214 R♄, 325 km wide.
    const cassini = Math.abs(r - saturnRadius * 1.97);
    if (cassini < saturnRadius * 0.04 && Math.random() < 0.88) continue;
    const encke = Math.abs(r - saturnRadius * 2.214);
    if (encke < saturnRadius * 0.006 && Math.random() < 0.92) continue;
    radii[filled] = r;
    baseAngles[filled] = Math.random() * Math.PI * 2;
    yJitter[filled] = (Math.random() - 0.5) * saturnRadius * 0.012;
    const c = palette[Math.floor(Math.random() * palette.length)];
    const shade = 0.6 + Math.random() * 0.5;
    colors[filled * 3 + 0] = c.r * shade;
    colors[filled * 3 + 1] = c.g * shade;
    colors[filled * 3 + 2] = c.b * shade;
    sizes[filled] = saturnRadius * (0.012 + Math.random() * 0.036);
    filled += 1;
  }

  const positions = new Float32Array(RING_COUNT * 3);
  for (let i = 0; i < RING_COUNT; i++) positions[i * 3 + 1] = yJitter[i];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  geo.setAttribute('aBaseAngle', new THREE.BufferAttribute(baseAngles, 1));

  // Real ring dynamics: a particle at x Saturn radii orbits with period
  // T = 2π·√(x³·R³/GM) ≈ 4.2 h at the ring's inner edge. uOmegaScale folds the
  // scene-unit conversion in so the shader only needs pow(aRadius, -1.5).
  const RING_PERIOD_AT_1R_SEC = 15_096;
  const omegaScale = ((Math.PI * 2) / RING_PERIOD_AT_1R_SEC) * Math.pow(saturnRadius, 1.5);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      uTime: { value: 0 },
      uOmegaScale: { value: omegaScale },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float aRadius;
      attribute float aBaseAngle;
      varying vec3 vColor;
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uOmegaScale;
      void main() {
        vColor = color;
        float a = aBaseAngle + uOmegaScale * pow(aRadius, -1.5) * uTime;
        vec3 pos = vec3(cos(a) * aRadius, position.y, sin(a) * aRadius);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = max(1.0, size * uPixelRatio * (260.0 / max(0.0001, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, alpha * 0.4);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'saturnParticleRings';
  points.renderOrder = 2;

  const group = new THREE.Group();
  group.name = 'saturnParticleRingsGroup';
  group.add(ringMesh);
  group.add(points);

  return {
    group,
    update(simSec: number) {
      mat.uniforms.uTime.value = simSec;
    },
    dispose() {
      ringGeom.dispose();
      ringTex.dispose();
      ringMat.dispose();
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ───────────────────────── uranus rings ───────────────────────── */
/**
 * Uranus's narrow, dark ring system — a faint inner band plus the dominant
 * ε ring at its real 2.0 R♅ radius. Added as children of the planet mesh so
 * they pick up the real 82° tilt (rings nearly face-on to the orbit plane).
 */
export function makeUranusRings(planetRadius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'uranusRings';
  const defs = [
    { inner: 1.64, outer: 1.95, color: 0x8fa3ad, opacity: 0.06 },
    { inner: 1.99, outer: 2.04, color: 0xaebfc9, opacity: 0.24 },
  ];
  for (const d of defs) {
    const geom = new THREE.RingGeometry(planetRadius * d.inner, planetRadius * d.outer, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: d.color,
      transparent: true,
      opacity: d.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
  }
  return group;
}

/* ───────────────────────── auroras ───────────────────────── */
/**
 * Auroral ovals — glowing curtain cones ringing each magnetic pole, added as
 * children of the planet mesh so they inherit the real axial tilt and spin.
 * Earth's oval is offset ~11° from the spin axis (magnetic pole ≠ geographic
 * pole); the gas giants' ovals hug the poles tighter. Curtain rays drift
 * slowly and the whole oval breathes, like time-lapse footage from orbit.
 */
export interface AuroraHandle {
  group: THREE.Group;
  update: (dtSec: number) => void;
  dispose: () => void;
}

function auroraCurtainTexture(base: THREE.Color, top: THREE.Color): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    // Smooth pseudo-random ray brightness along the oval.
    const ray =
      0.45 +
      0.3 * Math.sin(x * 0.23) * Math.sin(x * 0.071 + 2.1) +
      0.25 * Math.sin(x * 0.53 + 0.7);
    for (let y = 0; y < h; y++) {
      const v = y / h; // 0 = top of curtain, 1 = base
      const heightFade = Math.pow(v, 1.6);           // bright at the base
      const r = base.r * v + top.r * (1 - v);
      const g = base.g * v + top.g * (1 - v);
      const b = base.b * v + top.b * (1 - v);
      const a = Math.max(0, ray) * heightFade;
      const i = (y * w + x) * 4;
      img.data[i] = r * 255;
      img.data[i + 1] = g * 255;
      img.data[i + 2] = b * 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function makeAurora(
  planetRadius: number,
  opts: {
    color: number;
    topColor?: number;
    latitudeDeg?: number;
    magneticTiltDeg?: number;
    intensity?: number;
  },
): AuroraHandle {
  const group = new THREE.Group();
  group.name = 'aurora';
  const lat = THREE.MathUtils.degToRad(opts.latitudeDeg ?? 70);
  const intensity = opts.intensity ?? 0.55;
  const tex = auroraCurtainTexture(
    new THREE.Color(opts.color),
    new THREE.Color(opts.topColor ?? opts.color),
  );

  const ringR = planetRadius * Math.cos(lat);
  const baseY = planetRadius * Math.sin(lat);
  const height = planetRadius * 0.16;
  const mats: THREE.MeshBasicMaterial[] = [];
  for (const side of [1, -1]) {
    const geom = new THREE.CylinderGeometry(ringR * 0.88, ringR, height, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: intensity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mats.push(mat);
    const curtain = new THREE.Mesh(geom, mat);
    curtain.position.y = side * (baseY + height * 0.4);
    if (side < 0) curtain.rotation.x = Math.PI;
    group.add(curtain);
  }

  // Magnetic axis offset from the spin axis.
  group.rotation.z = THREE.MathUtils.degToRad(opts.magneticTiltDeg ?? 0);

  let t = Math.random() * 10;
  return {
    group,
    update(dtSec: number) {
      t += dtSec;
      tex.offset.x = t * 0.012; // rays drift along the oval
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1.2);
      for (const m of mats) m.opacity = intensity * breathe;
    },
    dispose() {
      for (const m of mats) m.dispose();
      group.children.forEach((ch) => {
        if (ch instanceof THREE.Mesh) ch.geometry.dispose();
      });
      tex.dispose();
    },
  };
}

/* ───────────────────────── speed-of-light pulse ───────────────────────── */
/**
 * A photon wavefront that leaves the Sun and expands at the true speed of
 * light — 8 min 20 s to Earth, over 4 hours to Neptune. Each planet flares
 * softly as the front sweeps past it. Epoch-driven, so at Live speed you
 * feel how slow light really is, and at +1 h/s the pulse sweeps the whole
 * system in seconds. Nothing else in a consumer sky app shows this.
 */
export interface LightPulseHandle {
  group: THREE.Group;
  /** Heliocentric distance of the wavefront (AU) at the last update. */
  frontAu: number;
  update: (epochMs: number) => void;
  dispose: () => void;
}

const LIGHT_SEC_PER_AU = 499.005;
/** Pulse repeats every 5 sim-hours — light reaches Neptune in ~4.2 h. */
const PULSE_PERIOD_MS = 5 * 3600 * 1000;

export function makeLightPulse(mode: ScaleMode): LightPulseHandle {
  const group = new THREE.Group();
  group.name = 'lightPulse';

  // Ecliptic-plane ring marks the wavefront where the orbits live…
  const SEG = 160;
  const ringPos = new Float32Array(SEG * 3);
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    ringPos[i * 3] = Math.cos(a);
    ringPos[i * 3 + 1] = 0;
    ringPos[i * 3 + 2] = Math.sin(a);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const ringMat = new THREE.LineBasicMaterial({
    color: 0x9fe8dc,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const ring = new THREE.LineLoop(ringGeo, ringMat);
  group.add(ring);

  // …and a whisper-faint shell gives it presence off the plane.
  const shellGeo = new THREE.SphereGeometry(1, 48, 32);
  const shellMat = new THREE.MeshBasicMaterial({
    color: 0x86d8cc,
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  const handle: LightPulseHandle = {
    group,
    frontAu: 0,
    update(epochMs: number) {
      const tSec = (((epochMs % PULSE_PERIOD_MS) + PULSE_PERIOD_MS) % PULSE_PERIOD_MS) / 1000;
      const au = tSec / LIGHT_SEC_PER_AU;
      handle.frontAu = au;
      const r = sceneRadiusFromAu(Math.max(au, 0.001), mode);
      ring.scale.setScalar(r);
      shell.scale.setScalar(r);
      // Fade as the front thins out toward the Kuiper belt.
      const fade = THREE.MathUtils.clamp(1 - au / 34, 0.12, 1);
      ringMat.opacity = 0.42 * fade;
      shellMat.opacity = 0.032 * fade;
      group.visible = au > 0.002;
    },
    dispose() {
      ringGeo.dispose();
      ringMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
    },
  };
  return handle;
}

/* ───────────────────────── earth rocket launch ───────────────────────── */
/**
 * A small rocket that lifts off from Earth every so often: vertical ascent,
 * gravity turn downrange (the real launch profile), engine plume + smoke
 * trail while burning, engine cutoff, then a quiet coast as it fades out.
 * Decorative and real-time — the canvas pins the group to Earth each frame.
 */
export interface EarthRocketHandle {
  group: THREE.Group;
  update: (dtSec: number) => void;
  dispose: () => void;
}

export function makeEarthRocket(earthRadius: number): EarthRocketHandle {
  const group = new THREE.Group();
  group.name = 'earthRocket';

  // Oversized relative to true scale (a real rocket would be sub-pixel) but
  // slim, so it reads as a launch vehicle rather than another moon.
  const L = earthRadius * 0.3;

  // ── Two-stage vehicle, built along +Z so lookAt() points it downrange ──
  const rocket = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf2eee4, roughness: 0.5, metalness: 0.35, transparent: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x23262e, roughness: 0.65, metalness: 0.3, transparent: true,
  });

  // First stage (booster) — its own group so it can separate mid-flight.
  const stage1 = new THREE.Group();
  const s1Body = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.052, L * 0.056, L * 0.46, 12), whiteMat);
  s1Body.rotation.x = Math.PI / 2;
  stage1.add(s1Body);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.052, L * 0.036, L * 0.05, 10), darkMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = -L * 0.25;
  stage1.add(nozzle);
  // Four grid-fin stubs near the interstage.
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.012, L * 0.05, L * 0.04), darkMat);
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * L * 0.06, Math.sin(a) * L * 0.06, L * 0.18);
    fin.rotation.z = a;
    stage1.add(fin);
  }
  stage1.position.z = -L * 0.14;
  rocket.add(stage1);

  // Interstage band + second stage + fairing.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.052, L * 0.052, L * 0.035, 12), darkMat);
  band.rotation.x = Math.PI / 2;
  band.position.z = L * 0.1;
  rocket.add(band);
  const s2Body = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.048, L * 0.052, L * 0.2, 12), whiteMat);
  s2Body.rotation.x = Math.PI / 2;
  s2Body.position.z = L * 0.22;
  rocket.add(s2Body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(L * 0.048, L * 0.14, 12), whiteMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = L * 0.39;
  rocket.add(nose);
  group.add(rocket);

  // Engine plume — bright core + wide orange glow at the active engine.
  const plumeTex = cometGlowSprite();
  const plumeCoreMat = new THREE.SpriteMaterial({
    map: plumeTex, color: new THREE.Color(1.0, 0.95, 0.8),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const plumeGlowMat = new THREE.SpriteMaterial({
    map: plumeTex, color: new THREE.Color(1.0, 0.6, 0.28),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const plumeCore = new THREE.Sprite(plumeCoreMat);
  const plumeGlow = new THREE.Sprite(plumeGlowMat);
  plumeCore.position.z = -L * 0.42;
  plumeGlow.position.z = -L * 0.48;
  rocket.add(plumeCore);
  rocket.add(plumeGlow);

  // Liftoff flash at the pad.
  const padFlashMat = new THREE.SpriteMaterial({
    map: plumeTex, color: new THREE.Color(1.0, 0.85, 0.6),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const padFlash = new THREE.Sprite(padFlashMat);
  group.add(padFlash);

  // Smoke/exhaust trail — ring buffer of fading points.
  const TRAIL_N = 56;
  const trailPos = new Float32Array(TRAIL_N * 3);
  const trailCol = new Float32Array(TRAIL_N * 3);
  const trailAge = new Float32Array(TRAIL_N).fill(Infinity);
  let trailHead = 0;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.PointsMaterial({
    map: plumeTex,
    size: L * 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const trail = new THREE.Points(trailGeo, trailMat);
  group.add(trail);

  // Flight profile — a launch leaves Earth roughly every 15 seconds.
  const FLIGHT_DUR = 10;
  const BURN_FRAC = 0.62;
  const SEP_T = 0.45;      // booster separation (fraction of flight)
  let idleClock = 4;       // first launch shortly after load
  let flightT = -1;        // <0 idle, else seconds since liftoff
  let separated = false;
  const launchDir = new THREE.Vector3(0, 1, 0);
  const downrange = new THREE.Vector3(1, 0, 0);
  const dir = new THREE.Vector3();
  const posNow = new THREE.Vector3();
  const posNext = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const sepPos = new THREE.Vector3();
  const sepVel = new THREE.Vector3();
  let emitAcc = 0;

  const flightPos = (t: number, out: THREE.Vector3) => {
    // Vertical rise blending into a downrange arc — a gravity turn.
    const alt = earthRadius * (1.02 + 2.8 * Math.pow(t, 1.55));
    const phi = 1.9 * t * t;
    dir.copy(launchDir).multiplyScalar(Math.cos(phi)).addScaledVector(downrange, Math.sin(phi)).normalize();
    return out.copy(dir).multiplyScalar(alt);
  };

  const beginFlight = () => {
    flightT = 0;
    separated = false;
    // Random launch site; downrange direction is any perpendicular ("east").
    launchDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    downrange.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .cross(launchDir).normalize();
    trailAge.fill(Infinity);
    // Re-attach the booster for the next flight.
    stage1.visible = true;
    if (stage1.parent !== rocket) rocket.add(stage1);
    stage1.position.set(0, 0, -L * 0.14);
    stage1.rotation.set(0, 0, 0);
    whiteMat.opacity = 1;
    darkMat.opacity = 1;
    flightPos(0, posNow);
    padFlash.position.copy(posNow);
    padFlash.scale.setScalar(L * 0.9);
    rocket.visible = true;
  };

  rocket.visible = false;

  return {
    group,
    update(dtSec: number) {
      // Age the trail regardless of flight state so smoke keeps dissolving.
      for (let i = 0; i < TRAIL_N; i++) {
        trailAge[i] += dtSec;
        const fade = Math.max(0, 1 - trailAge[i] / 3.2);
        const warm = Math.min(1, trailAge[i] * 2); // orange → gray smoke
        trailCol[i * 3] = fade * (1 - warm * 0.45);
        trailCol[i * 3 + 1] = fade * (0.78 - warm * 0.3);
        trailCol[i * 3 + 2] = fade * (0.55 - warm * 0.1);
      }
      (trailGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

      if (flightT < 0) {
        idleClock -= dtSec;
        if (idleClock <= 0) beginFlight();
        return;
      }

      flightT += dtSec;
      const t = flightT / FLIGHT_DUR;
      if (t >= 1) {
        flightT = -1;
        // ~15 s cadence: 10 s flight + ~5 s turnaround.
        idleClock = 4.5 + Math.random();
        rocket.visible = false;
        stage1.visible = false;
        plumeCoreMat.opacity = 0;
        plumeGlowMat.opacity = 0;
        padFlashMat.opacity = 0;
        return;
      }

      flightPos(t, posNow);
      flightPos(Math.min(1, t + 0.01), posNext);
      rocket.position.copy(posNow);
      // lookAt works in world space — offset by the group's world position.
      group.getWorldPosition(lookTarget);
      lookTarget.add(posNext);
      rocket.lookAt(lookTarget);

      // Booster separation: detach, tumble, decelerate, fade.
      if (!separated && t >= SEP_T) {
        separated = true;
        stage1.getWorldPosition(sepPos);
        group.worldToLocal(sepPos);
        sepVel.copy(posNext).sub(posNow).normalize().multiplyScalar(earthRadius * 0.55);
        group.add(stage1);
        stage1.position.copy(sepPos);
      }
      if (separated && stage1.visible) {
        const tau = flightT - SEP_T * FLIGHT_DUR;
        // Coast forward while gravity bends it back toward Earth.
        stage1.position.copy(sepPos)
          .addScaledVector(sepVel, tau * Math.max(0.15, 1 - tau * 0.22))
          .addScaledVector(posNow.clone().normalize(), -earthRadius * 0.05 * tau * tau);
        stage1.rotation.x += dtSec * 1.6;
        stage1.rotation.y += dtSec * 0.9;
        if (tau > 3.4) stage1.visible = false;
      }

      const burning = t < BURN_FRAC;
      const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
      whiteMat.opacity = fade;
      darkMat.opacity = fade;
      plumeCoreMat.opacity = burning ? 0.85 + Math.random() * 0.15 : 0;
      plumeGlowMat.opacity = burning ? 0.5 + Math.random() * 0.2 : 0;
      const flick = burning ? 0.85 + Math.random() * 0.3 : 0.001;
      plumeCore.scale.setScalar(L * 0.32 * flick);
      plumeGlow.scale.setScalar(L * 0.75 * flick);
      // Pad flash decays over the first second of flight.
      padFlashMat.opacity = Math.max(0, 0.9 - flightT * 1.1);

      if (burning) {
        emitAcc += dtSec;
        // Drop a smoke puff every ~90 ms of burn.
        while (emitAcc > 0.09) {
          emitAcc -= 0.09;
          trailPos[trailHead * 3] = posNow.x;
          trailPos[trailHead * 3 + 1] = posNow.y;
          trailPos[trailHead * 3 + 2] = posNow.z;
          trailAge[trailHead] = 0;
          trailHead = (trailHead + 1) % TRAIL_N;
        }
        (trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }
    },
    dispose() {
      rocket.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      stage1.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      whiteMat.dispose();
      darkMat.dispose();
      plumeCoreMat.dispose();
      plumeGlowMat.dispose();
      padFlashMat.dispose();
      plumeTex.dispose();
      trailGeo.dispose();
      trailMat.dispose();
    },
  };
}

/* ───────────────────────── planetary moons ───────────────────────── */
/**
 * Named moons for the outer/terrestrial giants — Earth keeps its dedicated
 * Moon in `makeEarthExtras`; this covers everyone else. Each moon orbits in a
 * per-planet sub-group that the canvas keeps pinned to its planet's position,
 * so the moons follow the planet around the Sun without inheriting its spin.
 * Distances/radii are visually compressed (true ratios would put most moons
 * inside the planet sprite or off-screen) but the relative ordering, colour,
 * and Triton's retrograde motion are real.
 */
interface MoonSpec {
  planet: SolarBodyId;
  name: string;
  radiusMul: number;    // moon radius ÷ planet radius
  distMul: number;      // orbit radius ÷ planet radius
  inclination: number;  // rad
  phase: number;        // rad
  /** True sidereal orbital period in days (negative = retrograde). */
  periodDays: number;
  color: number;
  roughness: number;
}

const MOON_SPECS: MoonSpec[] = [
  // Mars — Phobos laps Mars 3×/day, faster than Mars rotates.
  { planet: 'mars', name: 'Phobos', radiusMul: 0.09, distMul: 1.9, inclination: 0.02, phase: 0.0, periodDays: 0.3189, color: 0x8a7d6e, roughness: 0.95 },
  { planet: 'mars', name: 'Deimos', radiusMul: 0.06, distMul: 2.7, inclination: 0.03, phase: 1.4, periodDays: 1.2624, color: 0x9b8d7c, roughness: 0.95 },
  // Jupiter — Galilean moons in their real 1:2:4 Laplace resonance.
  { planet: 'jupiter', name: 'Io',       radiusMul: 0.026, distMul: 1.7, inclination: 0.02, phase: 0.3, periodDays: 1.7691, color: 0xe6d24a, roughness: 0.80 },
  { planet: 'jupiter', name: 'Europa',   radiusMul: 0.022, distMul: 2.1, inclination: 0.02, phase: 2.0, periodDays: 3.5512, color: 0xd9cebb, roughness: 0.55 },
  { planet: 'jupiter', name: 'Ganymede', radiusMul: 0.037, distMul: 2.8, inclination: 0.03, phase: 3.6, periodDays: 7.1546, color: 0xa69884, roughness: 0.80 },
  { planet: 'jupiter', name: 'Callisto', radiusMul: 0.034, distMul: 3.7, inclination: 0.04, phase: 5.0, periodDays: 16.689, color: 0x726658, roughness: 0.90 },
  // Saturn — moons orbit clear of the rings (outer ring ≈ 2.27× radius)
  { planet: 'saturn', name: 'Titan', radiusMul: 0.040, distMul: 3.4, inclination: 0.05, phase: 0.8, periodDays: 15.945, color: 0xd1933a, roughness: 0.70 },
  { planet: 'saturn', name: 'Rhea',  radiusMul: 0.015, distMul: 2.8, inclination: 0.04, phase: 2.6, periodDays: 4.5182, color: 0xc7c0b2, roughness: 0.85 },
  // Uranus
  { planet: 'uranus', name: 'Titania', radiusMul: 0.030, distMul: 2.4, inclination: 0.06, phase: 1.0, periodDays: 8.7062, color: 0x9fb1b5, roughness: 0.85 },
  { planet: 'uranus', name: 'Oberon',  radiusMul: 0.028, distMul: 3.1, inclination: 0.06, phase: 3.3, periodDays: 13.463, color: 0x8b969a, roughness: 0.85 },
  // Neptune — Triton orbits retrograde
  { planet: 'neptune', name: 'Triton', radiusMul: 0.035, distMul: 2.6, inclination: 0.35, phase: 0.5, periodDays: -5.877, color: 0xd7c5c0, roughness: 0.70 },
  // Pluto — Charon is huge relative to its primary
  { planet: 'pluto', name: 'Charon', radiusMul: 0.50, distMul: 2.9, inclination: 0.20, phase: 1.2, periodDays: 6.3873, color: 0xb3a698, roughness: 0.90 },
];

export interface PlanetMoonsHandle {
  group: THREE.Group;
  /** Pins each planet's moon sub-group to its planet, then places every moon
   *  at its epoch-accurate orbital phase (real sidereal periods). */
  update: (epochMs: number, planetPos: (id: SolarBodyId) => THREE.Vector3 | null | undefined) => void;
  dispose: () => void;
}

export function makePlanetMoons(lite: boolean): PlanetMoonsHandle {
  const group = new THREE.Group();
  group.name = 'planetMoons';
  const segs = lite ? 16 : 24;

  const subgroups = new Map<SolarBodyId, THREE.Group>();
  const recs: { mesh: THREE.Mesh; spec: MoonSpec }[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  for (const spec of MOON_SPECS) {
    let sub = subgroups.get(spec.planet);
    if (!sub) {
      sub = new THREE.Group();
      sub.visible = false;
      subgroups.set(spec.planet, sub);
      group.add(sub);
    }
    const pr = worldRadiusForBody(spec.planet);
    const geom = new THREE.SphereGeometry(pr * spec.radiusMul, segs, segs);
    const mat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness,
      metalness: 0.02,
    });
    geoms.push(geom);
    mats.push(mat);
    const mesh = new THREE.Mesh(geom, mat);
    sub.add(mesh);
    recs.push({ mesh, spec });
  }

  return {
    group,
    update(epochMs, planetPos) {
      subgroups.forEach((sub, id) => {
        const p = planetPos(id);
        if (p) {
          sub.visible = true;
          sub.position.copy(p);
        } else {
          sub.visible = false;
        }
      });
      for (const rec of recs) {
        const theta = rec.spec.phase + (epochMs / (Math.abs(rec.spec.periodDays) * MS_DAY)) * Math.PI * 2 * Math.sign(rec.spec.periodDays);
        const pr = worldRadiusForBody(rec.spec.planet);
        const r = pr * rec.spec.distMul;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const sinI = Math.sin(rec.spec.inclination);
        const cosI = Math.cos(rec.spec.inclination);
        // Tilt the in-plane point about the X axis by the orbital inclination.
        rec.mesh.position.set(x, -z * sinI, z * cosI);
        rec.mesh.rotation.y = -theta; // tidally locked — same face toward the planet
      }
    },
    dispose() {
      geoms.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

/* ───────────────────────── comet ───────────────────────── */
/**
 * A single bright comet on a steep eccentric orbit through the inner system.
 * Nucleus + glowing coma + a two-component (blue ion / cream dust) particle
 * tail. The tail is re-oriented every frame to point directly away from the
 * Sun and grows + brightens near perihelion — both real comet behaviours.
 */
export interface CometHandle {
  group: THREE.Group;
  update: (epochMs: number, sunPos: THREE.Vector3) => void;
  dispose: () => void;
}

function cometGlowSprite(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(224,242,255,0.95)');
  grad.addColorStop(0.3, 'rgba(150,200,255,0.45)');
  grad.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = SRGB;
  return t;
}

export function makeComet(mode: ScaleMode, lite: boolean): CometHandle {
  const group = new THREE.Group();
  group.name = 'comet';

  // Keplerian elements (AU) — a bright short-period comet on a steep orbit.
  const aAu = 2.4;
  const e = 0.74;
  const inc = 0.5;
  const node = 0.9;
  const cosN = Math.cos(node);
  const sinN = Math.sin(node);
  const sinI = Math.sin(inc);
  const cosI = Math.cos(inc);
  const periodMs = Math.pow(aAu, 1.5) * 365.256 * MS_DAY; // Kepler's third law
  const perihelionAu = aAu * (1 - e);
  const a = sceneRadiusFromAu(aAu, mode); // for sizing the tail/coma only

  /** True anomaly at `epochMs` — mean anomaly → Newton-solved eccentric anomaly. */
  const trueAnomalyAt = (epochMs: number): number => {
    const M = ((epochMs % periodMs) / periodMs) * Math.PI * 2;
    let E = M;
    for (let i = 0; i < 6; i++) {
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );
  };

  /** Scene position for true anomaly `theta`; also reports the AU distance. */
  const orbitPos = (theta: number, out: THREE.Vector3): { rAu: number } => {
    const rAu = (aAu * (1 - e * e)) / (1 + e * Math.cos(theta));
    const r = sceneRadiusFromAu(rAu, mode);
    const xp = Math.cos(theta) * r;
    const zp = Math.sin(theta) * r;
    // Tilt about X by inclination, then rotate about Y by the node longitude.
    const y = -zp * sinI;
    const z = zp * cosI;
    out.set(xp * cosN - z * sinN, y, xp * sinN + z * cosN);
    return { rAu };
  };

  // Nucleus — small dim icy body.
  const nucGeo = new THREE.SphereGeometry(Math.max(0.012, a * 0.006), 16, 16);
  const nucMat = new THREE.MeshStandardMaterial({
    color: 0x9fb6c8,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x223344,
    emissiveIntensity: 0.4,
  });
  const nucleus = new THREE.Mesh(nucGeo, nucMat);
  group.add(nucleus);

  // Coma — additive sprite centred on the nucleus.
  const glowTex = cometGlowSprite();
  const coma = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const comaBase = Math.max(0.08, a * 0.05);
  coma.scale.setScalar(comaBase);
  group.add(coma);

  // Two distinct tails, the way real comets carry them: a straight narrow
  // blue ion tail blown directly anti-sunward by the solar wind, and a
  // wider cream dust tail that lags behind along the orbit. Particles are
  // baked along local +X; each group is oriented every frame.
  const baseLen = a * 0.55;
  const tailSprite = diskSprite();
  const makeTail = (
    n: number,
    len: number,
    width: number,
    rgb: [number, number, number],
  ) => {
    const p = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = Math.pow(Math.random(), 0.7); // denser toward the nucleus
      p[i * 3] = t * len;
      p[i * 3 + 1] = (Math.random() - 0.5) * width * (0.2 + t);
      p[i * 3 + 2] = (Math.random() - 0.5) * width * (0.2 + t);
      const fade = (1 - t) * 0.9 + 0.1;
      col[i * 3] = rgb[0] * fade;
      col[i * 3 + 1] = rgb[1] * fade;
      col[i * 3 + 2] = rgb[2] * fade;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: tailSprite,
      size: a * 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });
    const grp = new THREE.Group();
    grp.add(new THREE.Points(geo, mat));
    group.add(grp);
    return { grp, geo, mat };
  };
  const ionTail = makeTail(lite ? 160 : 340, baseLen * 1.15, baseLen * 0.035, [0.5, 0.7, 1.0]);
  const dustTail = makeTail(lite ? 220 : 480, baseLen * 0.85, baseLen * 0.09, [0.95, 0.9, 0.7]);

  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const qDust = new THREE.Quaternion();
  const qLag = new THREE.Quaternion();

  return {
    group,
    update(epochMs, sunPos) {
      const theta = trueAnomalyAt(epochMs);
      const { rAu } = orbitPos(theta, tmp);
      group.position.copy(tmp);

      // Ion tail points dead anti-sunward; the dust tail lags ~14° behind
      // it toward the orbit just travelled. Length + brightness scale with
      // the real heliocentric distance (strongest at perihelion).
      dir.copy(tmp).sub(sunPos).normalize();
      q.setFromUnitVectors(xAxis, dir);
      ionTail.grp.quaternion.copy(q);
      qLag.setFromAxisAngle(yAxis, 0.24);
      qDust.copy(q).multiply(qLag);
      dustTail.grp.quaternion.copy(qDust);

      const lenF = THREE.MathUtils.clamp((perihelionAu / rAu) * 1.1, 0.45, 1.8);
      ionTail.grp.scale.setScalar(lenF);
      dustTail.grp.scale.setScalar(lenF * 0.9);
      const bright = THREE.MathUtils.clamp(perihelionAu / rAu, 0.2, 1.0);
      (coma.material as THREE.SpriteMaterial).opacity = 0.35 + bright * 0.55;
      coma.scale.setScalar(comaBase * (0.7 + bright * 0.7));
      ionTail.mat.opacity = 0.3 + bright * 0.55;
      dustTail.mat.opacity = 0.25 + bright * 0.5;
    },
    dispose() {
      nucGeo.dispose();
      nucMat.dispose();
      (coma.material as THREE.SpriteMaterial).map?.dispose();
      (coma.material as THREE.SpriteMaterial).dispose();
      ionTail.geo.dispose();
      ionTail.mat.dispose();
      dustTail.geo.dispose();
      dustTail.mat.dispose();
      tailSprite.dispose();
    },
  };
}
