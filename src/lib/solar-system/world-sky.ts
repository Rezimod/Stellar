// The sky over another world. A dome shaded by where the sun is — the
// world's own colours at the zenith and the horizon, and a glow round the
// sun that on Mars is blue and on Proxima b is a wide orange wash — with
// the star's disc and halo drawn in it, the moons crossing it, any second
// suns, the starfield showing through by however much the sky lets it, and,
// where the star flares, aurora curtains rolling overhead.

import * as THREE from 'three';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import { starfield } from '@/lib/solar-system/moon-surface';
import type { WorldProfile } from '@/lib/solar-system/world-profiles';

export interface WorldSky {
  group: THREE.Group;
  /** The image the visor and the metal reflect. */
  environment: THREE.Texture;
  update: (dt: number, cameraPos: THREE.Vector3) => void;
  dispose: () => void;
}

const DOME = 1800;

const SkyShader = {
  vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w; }`,
  fragmentShader: `
    uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGlow; uniform vec3 uSun; uniform float uGlowPower;
    varying vec3 vDir;
    void main() {
      float y = clamp(vDir.y, -0.05, 1.0);
      // The horizon band is thin: most of the sky is the zenith colour.
      float h = pow(1.0 - y, 2.6);
      vec3 col = mix(uZenith, uHorizon, h);
      float s = max(dot(normalize(vDir), uSun), 0.0);
      float glow = pow(s, uGlowPower);
      col = mix(col, uGlow, glow * (0.55 + 0.45 * h));
      // Below the ground line the dome is the horizon colour, dimmer.
      col = mix(col, uHorizon * 0.55, smoothstep(0.02, -0.05, vDir.y));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const AuroraShader = {
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime; uniform float uSeed; varying vec2 vUv;
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float a = hash(i.x + i.y * 57.0 + uSeed), b = hash(i.x + 1.0 + i.y * 57.0 + uSeed), c = hash(i.x + (i.y + 1.0) * 57.0 + uSeed), d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0 + uSeed);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
    void main() {
      float x = vUv.x * 9.0 + uTime * 0.05;
      float ray = noise(vec2(x, uTime * 0.12)) * 0.6 + noise(vec2(x * 3.1, uTime * 0.3)) * 0.4;
      float band = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
      float a = ray * ray * band * 0.9 * smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
      // Green at the foot, magenta and teal higher up — an oxygen sky under a flaring star.
      vec3 col = mix(vec3(0.3, 1.0, 0.45), vec3(0.95, 0.35, 0.9), smoothstep(0.15, 0.6, vUv.y));
      col = mix(col, vec3(0.35, 0.9, 1.0), smoothstep(0.55, 0.95, vUv.y) * 0.8);
      gl_FragColor = vec4(col * a * 2.4, a);
    }`,
};

function lumpyMoon(size: number, color: number, lumpy: boolean): THREE.Mesh {
  const g = new THREE.IcosahedronGeometry(size, 3);
  if (lumpy) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = 1 + Math.sin(v.x * 2.1) * Math.cos(v.z * 1.7) * 0.16 + Math.sin(v.y * 3.3 + v.x) * 0.1;
      v.multiplyScalar(n);
      v.x *= 1.25; v.z *= 0.85;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, fog: false }));
  return m;
}

export function makeWorldSky(renderer: THREE.WebGLRenderer, profile: WorldProfile, lite: boolean): WorldSky {
  const group = new THREE.Group();
  const S = profile.sky;
  const owned: THREE.Material[] = [];
  const geoms: THREE.BufferGeometry[] = [];

  const domeGeom = new THREE.SphereGeometry(DOME, 48, 24);
  const domeMat = new THREE.ShaderMaterial({
    ...SkyShader,
    uniforms: {
      uZenith: { value: S.zenith }, uHorizon: { value: S.horizon }, uGlow: { value: S.glow },
      uSun: { value: profile.sunDir.clone() }, uGlowPower: { value: S.glowPower },
    },
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  });
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);
  geoms.push(domeGeom); owned.push(domeMat);

  const stars = starfield(lite ? 2200 : 4200, lite ? 4000 : 9000);
  (stars.material as THREE.PointsMaterial).opacity = 0.9 * S.stars;
  stars.visible = S.stars > 0;
  stars.renderOrder = -9;
  group.add(stars);

  const glowTex = softSpriteTexture();
  const sprite = (color: THREE.Color | number, opacity: number, dir: THREE.Vector3, dist: number, scale: number) => {
    const mat = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    owned.push(mat);
    const sp = new THREE.Sprite(mat);
    sp.position.copy(dir).multiplyScalar(dist);
    sp.scale.setScalar(scale);
    sp.renderOrder = -8;
    group.add(sp);
    return sp;
  };
  sprite(profile.sun.disc, 1, profile.sunDir, 1700, profile.sun.discScale);
  sprite(profile.sun.halo, profile.sun.haloOpacity, profile.sunDir, 1700, profile.sun.haloScale);
  for (const st of S.stars2) {
    sprite(st.color, 1, st.dir, 1750, st.scale);
    sprite(st.color, 0.25, st.dir, 1750, st.scale * 4);
  }

  const moons = S.moons.map((mn) => {
    const mesh = lumpyMoon(mn.size, mn.color, mn.lumpy);
    geoms.push(mesh.geometry); owned.push(mesh.material as THREE.Material);
    mesh.renderOrder = -7;
    group.add(mesh);
    return { mesh, dir: mn.dir.clone(), axis: mn.axis, rate: mn.rate, spin: Math.random() * 6 };
  });

  const curtains: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  if (S.aurora) {
    for (let i = 0; i < (lite ? 2 : 4); i++) {
      const mat = new THREE.ShaderMaterial({
        ...AuroraShader, uniforms: { uTime: { value: 0 }, uSeed: { value: i * 17.3 } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      });
      const geom = new THREE.PlaneGeometry(1500, 480, 1, 1);
      const mesh = new THREE.Mesh(geom, mat);
      const a = i * 1.7 + 0.6;
      mesh.position.set(Math.cos(a) * 560, 560 + i * 40, Math.sin(a) * 560);
      mesh.lookAt(0, 380, 0);
      mesh.renderOrder = -6;
      mesh.frustumCulled = false;
      group.add(mesh);
      curtains.push({ mesh, mat });
      geoms.push(geom); owned.push(mat);
    }
  }

  // The visor's environment: this sky, this ground, this sun.
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.ShaderMaterial({ ...SkyShader, uniforms: domeMat.uniforms, side: THREE.BackSide }));
  envScene.add(envSky);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(...profile.ground.plain) }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  envScene.add(ground);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), new THREE.MeshBasicMaterial({ color: profile.sun.disc.clone().multiplyScalar(5) }));
  sun.position.copy(profile.sunDir).multiplyScalar(40);
  envScene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, 0.03);
  const environment = envTarget.texture;
  pmrem.dispose();
  for (const o of [envSky, ground, sun]) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }

  let t = 0;
  const q = new THREE.Quaternion();
  return {
    group,
    environment,
    update(dt, cameraPos) {
      t += dt;
      group.position.copy(cameraPos);
      for (const mn of moons) {
        q.setFromAxisAngle(mn.axis, mn.rate * dt);
        mn.dir.applyQuaternion(q);
        mn.mesh.position.copy(mn.dir).multiplyScalar(1500);
        mn.mesh.rotation.y = mn.spin + t * 0.02;
      }
      for (const c of curtains) c.mat.uniforms.uTime.value = t;
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      envTarget.dispose();
    },
  };
}
