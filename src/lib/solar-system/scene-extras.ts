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

/* ───────────────────────── comets ───────────────────────── */

export interface CometHandle {
  group: THREE.Group;
  update: (epochMs: number) => void;
  dispose: () => void;
}

interface CometSpec {
  semiMajorAu: number;
  eccentricity: number;
  periodMs: number;
  argPeriRad: number;
  inclinationRad: number;
  phaseMs: number;
  hue: { r: number; g: number; b: number };
  tailCount: number;
}

function cometTailSprite(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(170,210,255,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = SRGB;
  return t;
}

function solveOrbit(spec: CometSpec, epochMs: number, mode: ScaleMode): THREE.Vector3 {
  const meanAnomaly = ((epochMs - spec.phaseMs) / spec.periodMs) * Math.PI * 2;
  let E = meanAnomaly;
  for (let i = 0; i < 6; i++) {
    E = E - (E - spec.eccentricity * Math.sin(E) - meanAnomaly) / (1 - spec.eccentricity * Math.cos(E));
  }
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xOrbit = spec.semiMajorAu * (cosE - spec.eccentricity);
  const yOrbit = spec.semiMajorAu * Math.sqrt(1 - spec.eccentricity * spec.eccentricity) * sinE;
  const ap = spec.argPeriRad;
  let x = xOrbit * Math.cos(ap) - yOrbit * Math.sin(ap);
  let z = xOrbit * Math.sin(ap) + yOrbit * Math.cos(ap);
  const y = z * Math.sin(spec.inclinationRad);
  z = z * Math.cos(spec.inclinationRad);
  const v = new THREE.Vector3(x, y, z);
  const au = v.length();
  if (au < 1e-9) return new THREE.Vector3(0, 0, 0);
  v.normalize().multiplyScalar(sceneRadiusFromAu(au, mode));
  return v;
}

export function makeComets(mode: ScaleMode, lite: boolean): CometHandle {
  const specs: CometSpec[] = [
    {
      semiMajorAu: 17.8,
      eccentricity: 0.967,
      periodMs: 75 * 365.25 * 86400 * 1000,
      argPeriRad: 1.85,
      inclinationRad: 0.28,
      phaseMs: Date.UTC(2026, 4, 1),
      hue: { r: 0.78, g: 0.92, b: 1.0 },
      tailCount: lite ? 110 : 220,
    },
    {
      semiMajorAu: 11.4,
      eccentricity: 0.93,
      periodMs: 38 * 365.25 * 86400 * 1000,
      argPeriRad: 4.1,
      inclinationRad: 0.45,
      phaseMs: Date.UTC(2026, 1, 15),
      hue: { r: 0.95, g: 0.82, b: 0.6 },
      tailCount: lite ? 90 : 170,
    },
  ];

  const group = new THREE.Group();
  group.name = 'cometsGroup';

  const sprite = cometTailSprite();

  type CometState = {
    spec: CometSpec;
    head: THREE.Mesh;
    coma: THREE.Mesh;
    tail: THREE.Points;
    tailGeo: THREE.BufferGeometry;
    tailMat: THREE.PointsMaterial;
    headMat: THREE.MeshBasicMaterial;
    comaMat: THREE.MeshBasicMaterial;
  };

  const states: CometState[] = specs.map((spec) => {
    const headGeom = new THREE.SphereGeometry(0.026, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.hue.r, spec.hue.g, spec.hue.b),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const head = new THREE.Mesh(headGeom, headMat);

    const comaGeom = new THREE.SphereGeometry(0.07, 18, 18);
    const comaMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.hue.r, spec.hue.g, spec.hue.b),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coma = new THREE.Mesh(comaGeom, comaMat);

    const tailPos = new Float32Array(spec.tailCount * 3);
    const tailCol = new Float32Array(spec.tailCount * 3);
    for (let i = 0; i < spec.tailCount; i++) {
      const fade = 1 - i / spec.tailCount;
      tailCol[i * 3] = spec.hue.r * fade;
      tailCol[i * 3 + 1] = spec.hue.g * fade;
      tailCol[i * 3 + 2] = spec.hue.b * fade;
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
    tailGeo.setAttribute('color', new THREE.BufferAttribute(tailCol, 3));
    const tailMat = new THREE.PointsMaterial({
      map: sprite,
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
      alphaTest: 0.02,
      blending: THREE.AdditiveBlending,
    });
    const tail = new THREE.Points(tailGeo, tailMat);

    group.add(head);
    group.add(coma);
    group.add(tail);

    return { spec, head, coma, tail, tailGeo, tailMat, headMat, comaMat };
  });

  const sunDir = new THREE.Vector3();
  const lateral = new THREE.Vector3();

  return {
    group,
    update(epochMs: number) {
      for (const st of states) {
        const pos = solveOrbit(st.spec, epochMs, mode);
        st.head.position.copy(pos);
        st.coma.position.copy(pos);

        // Tail points anti-sunward, with slight curvature.
        sunDir.copy(pos).normalize().multiplyScalar(-1);
        // Perp vector for curvature.
        if (Math.abs(sunDir.y) < 0.9) lateral.set(0, 1, 0).cross(sunDir).normalize();
        else lateral.set(1, 0, 0).cross(sunDir).normalize();

        const arr = st.tailGeo.getAttribute('position').array as Float32Array;
        const distFromSun = pos.length();
        // Brighter near sun.
        const closeness = Math.max(0, 1 - distFromSun / 6.5);
        const tailLen = 0.5 + closeness * 2.4;
        st.tailMat.opacity = 0.25 + closeness * 0.7;
        st.comaMat.opacity = 0.12 + closeness * 0.4;
        st.headMat.opacity = 0.55 + closeness * 0.45;

        for (let i = 0; i < st.spec.tailCount; i++) {
          const u = i / st.spec.tailCount;
          const t = u * tailLen;
          const curve = Math.sin(u * Math.PI) * 0.35 * tailLen * closeness;
          arr[i * 3] = pos.x + sunDir.x * t + lateral.x * curve;
          arr[i * 3 + 1] = pos.y + sunDir.y * t + lateral.y * curve;
          arr[i * 3 + 2] = pos.z + sunDir.z * t + lateral.z * curve;
        }
        (st.tailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }
    },
    dispose() {
      for (const st of states) {
        st.head.geometry.dispose();
        st.coma.geometry.dispose();
        st.headMat.dispose();
        st.comaMat.dispose();
        st.tailGeo.dispose();
        st.tailMat.dispose();
      }
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
