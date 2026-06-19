import * as THREE from 'three';
import { sceneRadiusFromAu, worldRadiusForBody, type ScaleMode, type SolarBodyId } from '@/lib/solar-system/ephemeris';

const SRGB = THREE.SRGBColorSpace;

/* Mean orbital semi-major axes (AU) — used for orbit rings + belt placement. */
export const MEAN_ORBIT_AU: Record<Exclude<SolarBodyId, 'sun'>, number> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1.0,
  mars: 1.524,
  jupiter: 5.203,
  saturn: 9.539,
  uranus: 19.18,
  neptune: 30.06,
  pluto: 39.48,
};

/* ───────────────────────── orbit rings ───────────────────────── */

export function makeOrbitRings(mode: ScaleMode, includePluto: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = 'orbitRings';
  const segments = 256;

  const ids: (keyof typeof MEAN_ORBIT_AU)[] = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  ];
  if (includePluto) ids.push('pluto');

  for (const id of ids) {
    const r = sceneRadiusFromAu(MEAN_ORBIT_AU[id], mode);
    const pos = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(t) * r;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const opacity = id === 'pluto' ? 0.08 : 0.13;
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
  update: (dtSec: number) => void;
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
  const inner = sceneRadiusFromAu(2.15, mode);
  const outer = sceneRadiusFromAu(3.3, mode);
  const thickness = (outer - inner) * 0.06;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const heights = new Float32Array(count);
  const driftRates = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = inner + Math.pow(Math.random(), 0.62) * (outer - inner);
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
    // Kepler-ish: angular rate ∝ r^-1.5; normalised so inner edge ~ 0.045 rad/s
    driftRates[i] = 0.045 * Math.pow(inner / r, 1.5);
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

  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  return {
    group,
    update(dtSec: number) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        angles[i] += driftRates[i] * dtSec;
        const a = angles[i];
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

/* ───────────────────────── kuiper belt ───────────────────────── */

export function makeKuiperBelt(mode: ScaleMode, lite: boolean): BeltHandle {
  const count = lite ? 600 : 1400;
  const inner = sceneRadiusFromAu(30, mode);
  const outer = sceneRadiusFromAu(50, mode);
  const thickness = (outer - inner) * 0.18;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const heights = new Float32Array(count);
  const driftRates = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = inner + Math.random() * (outer - inner);
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
    driftRates[i] = 0.006 * Math.pow(inner / r, 1.5);
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
    update(dtSec: number) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        angles[i] += driftRates[i] * dtSec;
        const a = angles[i];
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
  update: (epochMs: number) => void;
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
  // Cloud layer
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

  const MS_PER_LUNAR_ORBIT = 27.3 * 86400 * 1000;
  const MS_PER_LUNAR_SPIN = MS_PER_LUNAR_ORBIT; // tidally locked
  // Slight inclination 5.14° — set once on the orbiting group.
  moonGroup.rotation.z = 0.0898;

  return {
    cloudMesh,
    atmosphereMesh,
    moonGroup,
    moonMesh,
    update(epochMs: number) {
      // Cloud is a child of spinning Earth; set local rotation to a small drift
      // so world-space cloud motion = earth spin + slight delta (visual drift).
      cloudMesh.rotation.y = (epochMs / (86400 * 1000)) * Math.PI * 2 * 0.04;
      // Lunar orbit phase (moonGroup attached to scene, not Earth).
      moonGroup.rotation.y = (epochMs / MS_PER_LUNAR_ORBIT) * Math.PI * 2;
      // Moon spin (tidally locked) — same period as orbit.
      moonMesh.rotation.y = (epochMs / MS_PER_LUNAR_SPIN) * Math.PI * 2;
    },
    dispose() {
      cloudGeom.dispose();
      cloudMat.dispose();
      cloudsTex.dispose();
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
    },
    dispose() {
      corona.geometry.dispose();
      (corona.material as THREE.Material).dispose();
      (flare.material as THREE.SpriteMaterial).dispose();
      flareTex.dispose();
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
  update: (dtSec: number) => void;
  dispose: () => void;
}

export function makeSaturnParticleRings(saturnRadius: number, lite: boolean): SaturnRingsHandle {
  const RING_COUNT = lite ? 3500 : 11000;
  const innerR = saturnRadius * 1.235;
  const outerR = saturnRadius * 2.352;

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
    const cassini = Math.abs(r - (innerR + (outerR - innerR) * 0.62));
    if (cassini < (outerR - innerR) * 0.03 && Math.random() < 0.85) continue;
    const encke = Math.abs(r - (innerR + (outerR - innerR) * 0.88));
    if (encke < (outerR - innerR) * 0.01 && Math.random() < 0.9) continue;
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

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      uTime: { value: 0 },
      uSpeed: { value: 0.18 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float aRadius;
      attribute float aBaseAngle;
      varying vec3 vColor;
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uSpeed;
      void main() {
        vColor = color;
        float a = aBaseAngle + (uSpeed / sqrt(aRadius)) * uTime;
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
        gl_FragColor = vec4(vColor, alpha * 0.92);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'saturnParticleRings';

  const group = new THREE.Group();
  group.name = 'saturnParticleRingsGroup';
  group.add(points);

  let time = 0;

  return {
    group,
    update(dtSec: number) {
      time += dtSec;
      mat.uniforms.uTime.value = time;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ───────────────────────── earth satellites + debris ───────────────────────── */

export interface EarthOrbitalHandle {
  group: THREE.Group;
  update: (dtSec: number) => void;
  dispose: () => void;
}

interface SatelliteSpec {
  /** Orbit radius as a multiple of Earth's radius. */
  radiusMul: number;
  /** Orbital inclination, radians. */
  inclination: number;
  /** Right ascension of ascending node, radians. */
  raan: number;
  /** Initial mean anomaly, radians. */
  phase: number;
  /** Angular speed, rad/sec. Faster for lower orbits. */
  angularSpeed: number;
  /** Slow self-spin (rad/sec) for visual interest. */
  spinSpeed: number;
  /** Style of satellite mesh. */
  kind: 'iss' | 'hubble' | 'starlink';
}

/** Procedural solar-panel texture — grid of dark blue cells with thin gold gridlines. */
function solarPanelTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  // Base — deep midnight blue with subtle gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#15244a');
  g.addColorStop(0.5, '#1c2c58');
  g.addColorStop(1, '#101a36');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Cells
  const cols = 32;
  const rows = 8;
  const cellW = w / cols;
  const cellH = h / rows;
  ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
  for (let r = 0; r < rows; r++) {
    for (let c2 = 0; c2 < cols; c2++) {
      const x = c2 * cellW;
      const y = r * cellH;
      ctx.fillRect(x + cellW * 0.08, y + cellH * 0.08, cellW * 0.84, cellH * 0.84);
    }
  }
  // Gold conductor grid lines
  ctx.strokeStyle = 'rgba(196, 168, 110, 0.55)';
  ctx.lineWidth = 0.5;
  for (let c2 = 0; c2 <= cols; c2++) {
    ctx.beginPath();
    ctx.moveTo(c2 * cellW, 0);
    ctx.lineTo(c2 * cellW, h);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(w, r * cellH);
    ctx.stroke();
  }
  // Specular highlight band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, h * 0.35, w, h * 0.08);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  tex.anisotropy = 4;
  return tex;
}

/** Procedural MLI (multi-layer insulation) blanket — gold foil look. */
function mliTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#caa056');
  g.addColorStop(0.5, '#e8c987');
  g.addColorStop(1, '#a87f3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Wrinkle highlights
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 240, 200, 0.18)' : 'rgba(80, 56, 24, 0.28)';
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 14, w * 0.6, y + (Math.random() - 0.5) * 14, w, y + (Math.random() - 0.5) * 14);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB;
  return tex;
}

let _solarTex: THREE.CanvasTexture | null = null;
let _mliTex: THREE.CanvasTexture | null = null;
function sharedSolarTex(): THREE.CanvasTexture {
  if (!_solarTex) _solarTex = solarPanelTexture();
  return _solarTex;
}
function sharedMliTex(): THREE.CanvasTexture {
  if (!_mliTex) _mliTex = mliTexture();
  return _mliTex;
}

function disposeSharedTextures() {
  _solarTex?.dispose();
  _solarTex = null;
  _mliTex?.dispose();
  _mliTex = null;
}

/**
 * International Space Station — long central truss running perpendicular to
 * four pairs of large solar arrays, plus the pressurised modules at the
 * centre. `s` is the overall length (along the truss).
 */
function buildIss(s: number): THREE.Group {
  const g = new THREE.Group();
  const solarTex = sharedSolarTex();
  const mliTex = sharedMliTex();

  // ── Central truss (long horizontal bar) ─────────
  const trussLength = s;
  const trussGirth = s * 0.04;
  const truss = new THREE.Mesh(
    new THREE.BoxGeometry(trussLength, trussGirth, trussGirth),
    new THREE.MeshStandardMaterial({ color: 0xb6b1a4, roughness: 0.55, metalness: 0.7 }),
  );
  g.add(truss);

  // ── Solar arrays: 4 pairs along the truss ───────
  const panelW = s * 0.42;
  const panelH = s * 0.13;
  const panelThick = s * 0.008;
  const panelPositions = [-0.42, -0.22, 0.22, 0.42]; // along x (truss axis)
  for (const px of panelPositions) {
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelThick, panelH, panelW),
        new THREE.MeshStandardMaterial({
          map: solarTex,
          color: 0xffffff,
          roughness: 0.35,
          metalness: 0.4,
          emissive: 0x0a1430,
          emissiveIntensity: 0.18,
        }),
      );
      panel.position.set(px * s, 0, side * (panelW / 2 + trussGirth * 0.6));
      g.add(panel);
    }
  }

  // ── Pressurised modules at centre (cylindrical) ─
  const moduleR = s * 0.06;
  const modules = new THREE.Mesh(
    new THREE.CylinderGeometry(moduleR, moduleR, s * 0.36, 16),
    new THREE.MeshStandardMaterial({ map: mliTex, color: 0xf4ecd6, roughness: 0.45, metalness: 0.45 }),
  );
  modules.rotation.x = Math.PI / 2;
  g.add(modules);

  // Smaller perpendicular module
  const perpModule = new THREE.Mesh(
    new THREE.CylinderGeometry(moduleR * 0.85, moduleR * 0.85, s * 0.22, 14),
    new THREE.MeshStandardMaterial({ map: mliTex, color: 0xf0e6cd, roughness: 0.45, metalness: 0.45 }),
  );
  g.add(perpModule);

  // ── Radiators (silver flat plates) ──────────────
  for (const side of [-1, 1]) {
    const radiator = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.08, s * 0.004, s * 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xd6dee0,
        roughness: 0.3,
        metalness: 0.85,
      }),
    );
    radiator.position.set(0, side * s * 0.07, 0);
    g.add(radiator);
  }

  return g;
}

/**
 * Hubble Space Telescope — large white cylindrical body with the dark
 * aperture at one end, two solar arrays flanking the body, antenna dishes,
 * and a gold MLI blanket section.
 */
function buildHubble(s: number): THREE.Group {
  const g = new THREE.Group();
  const solarTex = sharedSolarTex();
  const mliTex = sharedMliTex();

  const bodyLength = s;
  const bodyR = s * 0.18;

  // Main tube (white)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR, bodyR, bodyLength * 0.78, 18),
    new THREE.MeshStandardMaterial({ color: 0xece6d2, roughness: 0.42, metalness: 0.55 }),
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);

  // MLI gold rear section
  const rear = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 0.98, bodyR * 0.96, bodyLength * 0.18, 18),
    new THREE.MeshStandardMaterial({ map: mliTex, color: 0xffffff, roughness: 0.4, metalness: 0.65 }),
  );
  rear.rotation.z = Math.PI / 2;
  rear.position.x = -bodyLength * 0.46;
  g.add(rear);

  // Aperture (dark opening) at the front
  const aperture = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 0.95, bodyR * 0.95, bodyLength * 0.04, 18),
    new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.95, metalness: 0.1 }),
  );
  aperture.rotation.z = Math.PI / 2;
  aperture.position.x = bodyLength * 0.42;
  g.add(aperture);

  // Aperture door (white, slightly open)
  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 1.02, bodyR * 1.02, bodyLength * 0.012, 18, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xf2ecd8, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }),
  );
  door.rotation.z = Math.PI / 2;
  door.rotation.y = -0.45;
  door.position.x = bodyLength * 0.46;
  g.add(door);

  // Two large solar arrays — long thin rectangles flanking the body
  const panelW = bodyLength * 1.05;
  const panelH = bodyLength * 0.32;
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.005, bodyR * 0.18, bodyR * 0.18),
      new THREE.MeshStandardMaterial({ color: 0xb0aa9c, roughness: 0.6, metalness: 0.5 }),
    );
    arm.position.set(0, side * bodyR * 1.05, 0);
    g.add(arm);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, s * 0.008, panelH),
      new THREE.MeshStandardMaterial({
        map: solarTex,
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.4,
        emissive: 0x0a1430,
        emissiveIntensity: 0.18,
      }),
    );
    panel.position.set(0, side * bodyR * 1.45, 0);
    g.add(panel);
  }

  // Antenna dish
  const dishMast = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.005, s * 0.005, s * 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.6, metalness: 0.5 }),
  );
  dishMast.position.set(0, 0, bodyR * 1.4);
  g.add(dishMast);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 0.55, bodyR * 0.55, s * 0.012, 16),
    new THREE.MeshStandardMaterial({ color: 0xe0d8c4, roughness: 0.5, metalness: 0.4 }),
  );
  dish.position.set(0, 0, bodyR * 1.55);
  g.add(dish);

  return g;
}

/**
 * Starlink — flat phased-array spacecraft. Distinctive look: a thin flat
 * rectangular bus with a single long solar panel that unfolds from one
 * edge. We render that "flat panel + folded out solar wing" silhouette.
 */
function buildStarlink(s: number): THREE.Group {
  const g = new THREE.Group();
  const solarTex = sharedSolarTex();

  // Main bus — flat rectangular phased-array antenna
  const busW = s * 0.7;
  const busL = s * 0.7;
  const busH = s * 0.04;
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(busW, busH, busL),
    new THREE.MeshStandardMaterial({
      color: 0xd2cfc6,
      roughness: 0.55,
      metalness: 0.7,
    }),
  );
  g.add(bus);

  // Antenna face (dark phased array on the bottom)
  const arrayFace = new THREE.Mesh(
    new THREE.BoxGeometry(busW * 0.92, s * 0.003, busL * 0.92),
    new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.7,
      metalness: 0.3,
    }),
  );
  arrayFace.position.y = -busH * 0.55;
  g.add(arrayFace);

  // Big single solar panel unfurled to one side
  const panelW = s * 0.06;
  const panelL = s * 0.7;
  const panelH = s * 1.1;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(panelW, s * 0.006, panelH),
    new THREE.MeshStandardMaterial({
      map: solarTex,
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.4,
      emissive: 0x0a1430,
      emissiveIntensity: 0.2,
    }),
  );
  panel.position.set(busW * 0.5 + panelH * 0.5, 0, 0);
  panel.rotation.y = Math.PI / 2;
  g.add(panel);

  // Hinge between bus and panel
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.008, s * 0.008, panelL * 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a9388, roughness: 0.5, metalness: 0.6 }),
  );
  hinge.position.set(busW * 0.52, 0, 0);
  hinge.rotation.x = Math.PI / 2;
  g.add(hinge);

  return g;
}

/** Reusable scratch vector for satellite look-at maths (avoids per-frame alloc). */
const _satTmpTarget = new THREE.Vector3();

function satellitePosition(spec: SatelliteSpec, earthRadius: number, time: number): THREE.Vector3 {
  const r = earthRadius * spec.radiusMul;
  const theta = spec.phase + spec.angularSpeed * time;
  // Orbit in plane defined by inclination + raan
  const cosI = Math.cos(spec.inclination);
  const sinI = Math.sin(spec.inclination);
  const cosO = Math.cos(spec.raan);
  const sinO = Math.sin(spec.raan);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  return new THREE.Vector3(
    r * (cosO * cosT - sinO * cosI * sinT),
    r * (sinI * sinT),
    r * (sinO * cosT + cosO * cosI * sinT),
  );
}

export function makeEarthOrbitals(earthRadius: number, lite: boolean): EarthOrbitalHandle {
  const group = new THREE.Group();
  group.name = 'earthOrbitalsGroup';

  // ── Three named satellites: ISS, Hubble, Starlink ────────
  //
  // Real LEO satellites are ~10⁻⁵ the diameter of Earth — invisible at
  // this scale. We compromise: meshScale ≈ 12% of Earth radius so each
  // satellite is a tiny but recognisable silhouette when the camera
  // orbits in close. Slow angular speeds (~0.018-0.03 rad/sec → one
  // full orbit every 3-6 min real time) keep the motion gentle.
  const sats: { mesh: THREE.Group; spec: SatelliteSpec }[] = [];
  const meshScale = earthRadius * 0.12;

  const specs: SatelliteSpec[] = [
    // ISS: 51.6° inclination, ~400 km altitude → close to Earth.
    { radiusMul: 1.055, inclination: 0.901, raan: 0.6, phase: 0,   angularSpeed: 0.026, spinSpeed: 0.0, kind: 'iss' },
    // Hubble: 28.5° inclination, ~540 km altitude.
    { radiusMul: 1.085, inclination: 0.497, raan: 2.4, phase: 2.1, angularSpeed: 0.022, spinSpeed: 0.0, kind: 'hubble' },
    // Starlink: 53° inclination, ~550 km altitude — different RAAN so it
    // doesn't visually collide with Hubble.
    { radiusMul: 1.10,  inclination: 0.925, raan: 4.4, phase: 4.2, angularSpeed: 0.020, spinSpeed: 0.0, kind: 'starlink' },
  ];

  for (const spec of specs) {
    let mesh: THREE.Group;
    if (spec.kind === 'iss') mesh = buildIss(meshScale);
    else if (spec.kind === 'hubble') mesh = buildHubble(meshScale);
    else mesh = buildStarlink(meshScale);
    group.add(mesh);
    sats.push({ mesh, spec });
  }

  // ── Orbital debris (tiny points cloud) ───────────────────
  const debrisCount = lite ? 80 : 180;
  const debrisPos = new Float32Array(debrisCount * 3);
  const debrisCol = new Float32Array(debrisCount * 3);
  const debrisRadii = new Float32Array(debrisCount);
  const debrisInc = new Float32Array(debrisCount);
  const debrisRaan = new Float32Array(debrisCount);
  const debrisPhase = new Float32Array(debrisCount);
  const debrisSpeed = new Float32Array(debrisCount);

  for (let i = 0; i < debrisCount; i++) {
    const radiusMul = 1.04 + Math.random() * 0.22;
    debrisRadii[i] = earthRadius * radiusMul;
    debrisInc[i] = (Math.random() - 0.5) * Math.PI * 0.7;
    debrisRaan[i] = Math.random() * Math.PI * 2;
    debrisPhase[i] = Math.random() * Math.PI * 2;
    debrisSpeed[i] = (0.014 + Math.random() * 0.024) * (1 / radiusMul);
    const shade = 0.55 + Math.random() * 0.45;
    debrisCol[i * 3] = 0.84 * shade;
    debrisCol[i * 3 + 1] = 0.84 * shade;
    debrisCol[i * 3 + 2] = 0.86 * shade;
  }

  const debrisGeo = new THREE.BufferGeometry();
  debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
  debrisGeo.setAttribute('color', new THREE.BufferAttribute(debrisCol, 3));

  const debrisMat = new THREE.PointsMaterial({
    size: earthRadius * 0.012,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });

  const debris = new THREE.Points(debrisGeo, debrisMat);
  debris.name = 'earthDebris';
  group.add(debris);

  let time = 0;
  const posAttr = debrisGeo.getAttribute('position') as THREE.BufferAttribute;

  return {
    group,
    update(dtSec: number) {
      time += dtSec;
      // Satellites — point each one along its velocity vector. The mesh's
      // local +Z faces along the orbital motion. lookAt() works in world
      // space, so the target has to account for the parent group's
      // current world position (which the canvas keeps in sync with Earth).
      _satTmpTarget.copy(group.position);
      for (const { mesh, spec } of sats) {
        const pos = satellitePosition(spec, earthRadius, time);
        const next = satellitePosition(spec, earthRadius, time + 0.05);
        mesh.position.copy(pos);
        _satTmpTarget.copy(group.position).add(next);
        mesh.lookAt(_satTmpTarget);
        if (spec.spinSpeed !== 0) mesh.rotateY(dtSec * spec.spinSpeed);
      }
      // Debris
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < debrisCount; i++) {
        const r = debrisRadii[i];
        const theta = debrisPhase[i] + debrisSpeed[i] * time;
        const cosI = Math.cos(debrisInc[i]);
        const sinI = Math.sin(debrisInc[i]);
        const cosO = Math.cos(debrisRaan[i]);
        const sinO = Math.sin(debrisRaan[i]);
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        arr[i * 3] = r * (cosO * cosT - sinO * cosI * sinT);
        arr[i * 3 + 1] = r * (sinI * sinT);
        arr[i * 3 + 2] = r * (sinO * cosT + cosO * cosI * sinT);
      }
      posAttr.needsUpdate = true;
    },
    dispose() {
      sats.forEach(({ mesh }) => {
        mesh.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else (m as THREE.Material).dispose();
          }
        });
      });
      debrisGeo.dispose();
      debrisMat.dispose();
      // Solar + MLI textures are shared across builders; dispose once here.
      disposeSharedTextures();
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
  angularSpeed: number; // rad/sec (negative = retrograde)
  color: number;
  roughness: number;
}

const MOON_SPECS: MoonSpec[] = [
  // Mars
  { planet: 'mars', name: 'Phobos', radiusMul: 0.09, distMul: 1.9, inclination: 0.02, phase: 0.0, angularSpeed: 0.55, color: 0x8a7d6e, roughness: 0.95 },
  { planet: 'mars', name: 'Deimos', radiusMul: 0.06, distMul: 2.7, inclination: 0.03, phase: 1.4, angularSpeed: 0.33, color: 0x9b8d7c, roughness: 0.95 },
  // Jupiter — Galilean moons
  { planet: 'jupiter', name: 'Io',       radiusMul: 0.026, distMul: 1.7, inclination: 0.02, phase: 0.3, angularSpeed: 0.42, color: 0xe6d24a, roughness: 0.80 },
  { planet: 'jupiter', name: 'Europa',   radiusMul: 0.022, distMul: 2.1, inclination: 0.02, phase: 2.0, angularSpeed: 0.33, color: 0xd9cebb, roughness: 0.55 },
  { planet: 'jupiter', name: 'Ganymede', radiusMul: 0.037, distMul: 2.8, inclination: 0.03, phase: 3.6, angularSpeed: 0.24, color: 0xa69884, roughness: 0.80 },
  { planet: 'jupiter', name: 'Callisto', radiusMul: 0.034, distMul: 3.7, inclination: 0.04, phase: 5.0, angularSpeed: 0.18, color: 0x726658, roughness: 0.90 },
  // Saturn — moons orbit clear of the rings (outer ring ≈ 2.35× radius)
  { planet: 'saturn', name: 'Titan', radiusMul: 0.040, distMul: 3.4, inclination: 0.05, phase: 0.8, angularSpeed: 0.20, color: 0xd1933a, roughness: 0.70 },
  { planet: 'saturn', name: 'Rhea',  radiusMul: 0.015, distMul: 2.8, inclination: 0.04, phase: 2.6, angularSpeed: 0.27, color: 0xc7c0b2, roughness: 0.85 },
  // Uranus
  { planet: 'uranus', name: 'Titania', radiusMul: 0.030, distMul: 2.4, inclination: 0.06, phase: 1.0, angularSpeed: 0.26, color: 0x9fb1b5, roughness: 0.85 },
  { planet: 'uranus', name: 'Oberon',  radiusMul: 0.028, distMul: 3.1, inclination: 0.06, phase: 3.3, angularSpeed: 0.20, color: 0x8b969a, roughness: 0.85 },
  // Neptune — Triton orbits retrograde
  { planet: 'neptune', name: 'Triton', radiusMul: 0.035, distMul: 2.6, inclination: 0.35, phase: 0.5, angularSpeed: -0.28, color: 0xd7c5c0, roughness: 0.70 },
  // Pluto — Charon is huge relative to its primary
  { planet: 'pluto', name: 'Charon', radiusMul: 0.50, distMul: 2.9, inclination: 0.20, phase: 1.2, angularSpeed: 0.22, color: 0xb3a698, roughness: 0.90 },
];

export interface PlanetMoonsHandle {
  group: THREE.Group;
  /** Pins each planet's moon sub-group to its planet, then advances orbits. */
  update: (dtSec: number, planetPos: (id: SolarBodyId) => THREE.Vector3 | null | undefined) => void;
  dispose: () => void;
}

export function makePlanetMoons(lite: boolean): PlanetMoonsHandle {
  const group = new THREE.Group();
  group.name = 'planetMoons';
  const segs = lite ? 16 : 24;

  const subgroups = new Map<SolarBodyId, THREE.Group>();
  const recs: { mesh: THREE.Mesh; spec: MoonSpec; theta: number }[] = [];
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
    recs.push({ mesh, spec, theta: spec.phase });
  }

  return {
    group,
    update(dtSec, planetPos) {
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
        rec.theta += rec.spec.angularSpeed * dtSec;
        const pr = worldRadiusForBody(rec.spec.planet);
        const r = pr * rec.spec.distMul;
        const x = Math.cos(rec.theta) * r;
        const z = Math.sin(rec.theta) * r;
        const sinI = Math.sin(rec.spec.inclination);
        const cosI = Math.cos(rec.spec.inclination);
        // Tilt the in-plane point about the X axis by the orbital inclination.
        rec.mesh.position.set(x, -z * sinI, z * cosI);
        rec.mesh.rotation.y = rec.theta; // tidally-locked-ish facing
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
  update: (dtSec: number, sunPos: THREE.Vector3) => void;
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

  const a = sceneRadiusFromAu(2.4, mode); // semi-major axis (scene units)
  const e = 0.74;
  const inc = 0.5;
  const node = 0.9;
  const cosN = Math.cos(node);
  const sinN = Math.sin(node);
  const sinI = Math.sin(inc);
  const cosI = Math.cos(inc);
  const perihelion = a * (1 - e);

  const orbitPos = (theta: number, out: THREE.Vector3): THREE.Vector3 => {
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const xp = Math.cos(theta) * r;
    const zp = Math.sin(theta) * r;
    // Tilt about X by inclination, then rotate about Y by the node longitude.
    const y = -zp * sinI;
    const z = zp * cosI;
    const x2 = xp * cosN - z * sinN;
    const z2 = xp * sinN + z * cosN;
    return out.set(x2, y, z2);
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

  // Tail — particles baked along local +X (0..baseLen); the tail group is
  // rotated each frame so +X faces away from the Sun, and scaled by perihelion
  // proximity. ~1/3 blue ion specks, the rest cream dust.
  const N = lite ? 360 : 800;
  const baseLen = a * 0.55;
  const coneW = baseLen * 0.07;
  const tPos = new Float32Array(N * 3);
  const tCol = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = Math.pow(Math.random(), 0.7); // density-biased toward the nucleus
    tPos[i * 3] = t * baseLen;
    tPos[i * 3 + 1] = (Math.random() - 0.5) * coneW * (0.2 + t);
    tPos[i * 3 + 2] = (Math.random() - 0.5) * coneW * (0.2 + t);
    const fade = (1 - t) * 0.9 + 0.1;
    if (Math.random() < 0.32) {
      tCol[i * 3] = 0.50 * fade;
      tCol[i * 3 + 1] = 0.70 * fade;
      tCol[i * 3 + 2] = 1.00 * fade;
    } else {
      tCol[i * 3] = 0.95 * fade;
      tCol[i * 3 + 1] = 0.92 * fade;
      tCol[i * 3 + 2] = 0.72 * fade;
    }
  }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const tailSprite = diskSprite();
  const tMat = new THREE.PointsMaterial({
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
  const tail = new THREE.Points(tGeo, tMat);
  const tailGroup = new THREE.Group();
  tailGroup.add(tail);
  group.add(tailGroup);

  let theta = 0.6;
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const q = new THREE.Quaternion();

  return {
    group,
    update(dtSec, sunPos) {
      theta += dtSec * 0.12;
      if (theta > Math.PI * 2) theta -= Math.PI * 2;
      orbitPos(theta, tmp);
      group.position.copy(tmp);

      const r = Math.max(tmp.distanceTo(sunPos), 1e-4);
      dir.copy(tmp).sub(sunPos).normalize();
      q.setFromUnitVectors(xAxis, dir);
      tailGroup.quaternion.copy(q);

      const lenF = THREE.MathUtils.clamp((perihelion / r) * 1.1, 0.45, 1.8);
      tailGroup.scale.setScalar(lenF);
      const bright = THREE.MathUtils.clamp(perihelion / r, 0.2, 1.0);
      (coma.material as THREE.SpriteMaterial).opacity = 0.35 + bright * 0.55;
      coma.scale.setScalar(comaBase * (0.7 + bright * 0.7));
      tMat.opacity = 0.3 + bright * 0.55;
    },
    dispose() {
      nucGeo.dispose();
      nucMat.dispose();
      (coma.material as THREE.SpriteMaterial).map?.dispose();
      (coma.material as THREE.SpriteMaterial).dispose();
      tGeo.dispose();
      tailSprite.dispose();
      tMat.dispose();
    },
  };
}
