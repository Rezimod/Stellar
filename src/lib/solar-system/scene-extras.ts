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
  /** Style of satellite mesh. */
  kind: 'iss' | 'hubble' | 'cube' | 'rocket-stage';
}

function buildIssLikeSatellite(scale: number): THREE.Group {
  const g = new THREE.Group();
  // Main truss
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55 * scale, 0.16 * scale, 0.16 * scale),
    new THREE.MeshStandardMaterial({ color: 0xd5d2c8, roughness: 0.45, metalness: 0.7 }),
  );
  g.add(body);
  // Two solar panel wings
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 * scale, 0.08 * scale, 0.85 * scale),
      new THREE.MeshStandardMaterial({
        color: 0x2c4870,
        roughness: 0.25,
        metalness: 0.55,
        emissive: 0x0a1530,
        emissiveIntensity: 0.35,
      }),
    );
    wing.position.x = side * 0.32 * scale;
    g.add(wing);
  }
  return g;
}

function buildHubbleLike(scale: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.48 * scale, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8e3d2, roughness: 0.4, metalness: 0.6 }),
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.135 * scale, 0.13 * scale, 0.06 * scale, 12),
    new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.2, metalness: 0.3 }),
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.27 * scale;
  g.add(lens);
  // Solar panels
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 * scale, 0.06 * scale, 0.7 * scale),
      new THREE.MeshStandardMaterial({
        color: 0x1f3866,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0x081024,
        emissiveIntensity: 0.4,
      }),
    );
    panel.position.x = side * 0.22 * scale;
    g.add(panel);
  }
  return g;
}

function buildCubeSat(scale: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18 * scale, 0.18 * scale, 0.18 * scale),
    new THREE.MeshStandardMaterial({
      color: 0xb89776,
      roughness: 0.55,
      metalness: 0.55,
    }),
  );
  g.add(body);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005 * scale, 0.005 * scale, 0.35 * scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 }),
  );
  antenna.position.y = 0.22 * scale;
  g.add(antenna);
  return g;
}

function buildRocketStage(scale: number): THREE.Group {
  // Spent upper stage: dented metallic cylinder + a charred nozzle.
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.55 * scale, 14),
    new THREE.MeshStandardMaterial({
      color: 0x8a8378,
      roughness: 0.85,
      metalness: 0.45,
    }),
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.12 * scale, 0.18 * scale, 14),
    new THREE.MeshStandardMaterial({
      color: 0x35302a,
      roughness: 0.9,
      metalness: 0.3,
    }),
  );
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.x = -0.36 * scale;
  g.add(nozzle);
  return g;
}

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

  // ── Named satellites ─────────────────────────────────────
  const sats: { mesh: THREE.Group; spec: SatelliteSpec }[] = [];
  const meshScale = earthRadius * 1.4;

  const specs: SatelliteSpec[] = [
    { radiusMul: 1.045, inclination: 0.9,  raan: 0.6, phase: 0,    angularSpeed: 0.6, kind: 'iss' },
    { radiusMul: 1.062, inclination: 1.71, raan: 2.1, phase: 1.2,  angularSpeed: 0.46, kind: 'hubble' },
    { radiusMul: 1.085, inclination: 0.35, raan: 3.4, phase: 2.4,  angularSpeed: 0.32, kind: 'cube' },
    { radiusMul: 1.115, inclination: 1.34, raan: 4.7, phase: 3.5,  angularSpeed: 0.27, kind: 'rocket-stage' },
    { radiusMul: 1.038, inclination: 0.58, raan: 5.5, phase: 0.9,  angularSpeed: 0.68, kind: 'cube' },
  ];

  for (const spec of specs) {
    let mesh: THREE.Group;
    if (spec.kind === 'iss') mesh = buildIssLikeSatellite(meshScale);
    else if (spec.kind === 'hubble') mesh = buildHubbleLike(meshScale);
    else if (spec.kind === 'rocket-stage') mesh = buildRocketStage(meshScale);
    else mesh = buildCubeSat(meshScale);
    group.add(mesh);
    sats.push({ mesh, spec });
  }

  // ── Orbital debris (tiny points cloud) ───────────────────
  const debrisCount = lite ? 220 : 520;
  const debrisPos = new Float32Array(debrisCount * 3);
  const debrisCol = new Float32Array(debrisCount * 3);
  const debrisRadii = new Float32Array(debrisCount);
  const debrisInc = new Float32Array(debrisCount);
  const debrisRaan = new Float32Array(debrisCount);
  const debrisPhase = new Float32Array(debrisCount);
  const debrisSpeed = new Float32Array(debrisCount);

  for (let i = 0; i < debrisCount; i++) {
    const radiusMul = 1.03 + Math.random() * 0.18;
    debrisRadii[i] = earthRadius * radiusMul;
    debrisInc[i] = (Math.random() - 0.5) * Math.PI * 0.7;
    debrisRaan[i] = Math.random() * Math.PI * 2;
    debrisPhase[i] = Math.random() * Math.PI * 2;
    debrisSpeed[i] = (0.18 + Math.random() * 0.7) * (1 / radiusMul);
    const shade = 0.55 + Math.random() * 0.45;
    debrisCol[i * 3] = 0.84 * shade;
    debrisCol[i * 3 + 1] = 0.84 * shade;
    debrisCol[i * 3 + 2] = 0.86 * shade;
  }

  const debrisGeo = new THREE.BufferGeometry();
  debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
  debrisGeo.setAttribute('color', new THREE.BufferAttribute(debrisCol, 3));

  const debrisMat = new THREE.PointsMaterial({
    size: earthRadius * 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
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
      // Satellites
      for (const { mesh, spec } of sats) {
        const pos = satellitePosition(spec, earthRadius, time);
        mesh.position.copy(pos);
        // Orient body along velocity direction for the cylindrical sats.
        if (spec.kind === 'hubble' || spec.kind === 'rocket-stage') {
          const next = satellitePosition(spec, earthRadius, time + 0.05);
          mesh.lookAt(next);
        }
        mesh.rotation.x += dtSec * 0.6;
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
    },
  };
}
