// What the air does to the ship on the way in, drawn round it in the
// surface scene: a sheath of plasma over the belly and the nose that runs
// from dull orange to white as the heating climbs, the bow shock standing
// off ahead of it as a glowing haze, ribbons of ionised air streaming back
// off the hull, sparks of ablator shed into the wake, and — once the air
// is thick and the ship slow — the white of vapour: a cone of it round the
// hull at the speed of sound, and two contrails behind. Everything is
// additive or alpha over the scene, depth-tested and never depth-written,
// so it sits on the hull and never cuts it. All of it is scaled by the
// numbers orbital-descent.ts puts out, and all of it is off (and costs one
// visibility test) when they are zero.
//
// The group is set up in the flow's frame each frame: +Z along the velocity
// (the way the air comes from, seen from the ship), +Y the planet's up.

import * as THREE from 'three';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';

export interface EntryFxState {
  /** Where the ship is, local metres, and which way it is moving (any length). */
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** The planet's radial at the ship. */
  up: THREE.Vector3;
  /** 0…1: plasma, glow, streaks and sparks. */
  heat: number;
  /** 0…1: contrails (thick air, subsonic). */
  vapour: number;
  /** 0…1: the vapour cone at the speed of sound. */
  transonic: number;
}

export interface EntryFx {
  group: THREE.Group;
  update: (dt: number, state: EntryFxState) => void;
  dispose: () => void;
}

const SHEATH_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// The windward side burns brightest; the rim glows where the camera looks
// through the most of the layer; a flicker runs over it like a flame's.
const SHEATH_FRAG = /* glsl */ `
uniform vec3 uFlow;
uniform float uHeat;
uniform float uTime;
uniform float uGain;
uniform vec3 uHot;
uniform vec3 uWhite;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec3 n = normalize(vN);
  float front = max(0.0, dot(n, uFlow));
  float rim = pow(1.0 - abs(dot(n, normalize(vV))), 2.2);
  float flick = 0.78 + 0.22 * sin(uTime * 41.0 + vP.x * 2.3 + vP.y * 3.1) * sin(uTime * 23.0 + vP.z * 1.7);
  float k = uHeat * (front * front * 1.3 + rim * 0.55 * (0.4 + front)) * flick;
  vec3 col = mix(uHot, uWhite, clamp(uHeat * front * 0.9, 0.0, 1.0));
  gl_FragColor = vec4(col * k * uGain, 1.0);
}`;

// A ribbon along −Z (0 at the hull, 1 at its tail): bright at the root,
// gone by the end, soft across its width.
const STREAK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float along = 1.0 - vUv.y;
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float a = pow(along, 1.6) * smoothstep(0.0, 0.6, across) * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}`;

/** Two quads crossed along −Z, 1 long and 1 wide, uv.y 0 at the root. */
function ribbonGeometry(): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(1, 1, 1, 4);
  a.translate(0, -0.5, 0);
  a.rotateX(Math.PI / 2);
  // After the turn the ribbon lies along −Z with uv.y = 0 at z = 0; flip v
  // so the root is 0.
  const uv = a.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const b = a.clone();
  b.rotateZ(Math.PI / 2);
  const out = new THREE.BufferGeometry();
  const merge = (name: string) => {
    const x = a.getAttribute(name) as THREE.BufferAttribute; const y = b.getAttribute(name) as THREE.BufferAttribute;
    const arr = new Float32Array(x.array.length + y.array.length);
    arr.set(x.array as Float32Array, 0); arr.set(y.array as Float32Array, x.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize));
  };
  merge('position'); merge('uv'); merge('normal');
  const ia = a.getIndex()!; const ib = b.getIndex()!;
  const idx: number[] = [];
  for (let i = 0; i < ia.count; i++) idx.push(ia.getX(i));
  for (let i = 0; i < ib.count; i++) idx.push(ib.getX(i) + a.getAttribute('position').count);
  out.setIndex(idx);
  a.dispose(); b.dispose();
  return out;
}

/**
 * `size` is the hull's radius, m (moon-lander's `hull`): everything is
 * scaled from it so the kestrel and the cruiser both wear the same fire.
 */
export function makeEntryFx(size: number, lite: boolean): EntryFx {
  const group = new THREE.Group();
  group.name = 'entry-fx';
  group.visible = false;
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  // ── The sheath: an egg of glowing air round the hull, longer than it is
  // wide, pushed forward onto the windward side. ──
  const sheathGeom = new THREE.SphereGeometry(1, lite ? 20 : 32, lite ? 14 : 22);
  geoms.push(sheathGeom);
  const sheathMat = new THREE.ShaderMaterial({
    vertexShader: SHEATH_VERT, fragmentShader: SHEATH_FRAG,
    uniforms: {
      uFlow: { value: new THREE.Vector3(0, 0, 1) }, uHeat: { value: 0 }, uTime: { value: 0 }, uGain: { value: 1.25 },
      uHot: { value: new THREE.Color(1.0, 0.3, 0.06) }, uWhite: { value: new THREE.Color(1.0, 0.72, 0.45) },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mats.push(sheathMat);
  const sheath = new THREE.Mesh(sheathGeom, sheathMat);
  sheath.scale.set(size * 1.35, size * 1.05, size * 1.75);
  sheath.position.z = size * 0.35;
  sheath.renderOrder = 12;
  sheath.frustumCulled = false;
  group.add(sheath);

  // ── The bow shock: a cone of haze with its tip standing off ahead of the
  // nose, opening back round the hull. ──
  // Apex ahead at z = 0, open end a unit behind it.
  const shockGeom = new THREE.ConeGeometry(1, 1, lite ? 20 : 32, 1, true);
  shockGeom.rotateX(Math.PI / 2);
  shockGeom.translate(0, 0, -0.5);
  geoms.push(shockGeom);
  const shockMat = new THREE.ShaderMaterial({
    vertexShader: SHEATH_VERT, fragmentShader: SHEATH_FRAG,
    uniforms: {
      uFlow: { value: new THREE.Vector3(0, 0, 1) }, uHeat: { value: 0 }, uTime: { value: 0 }, uGain: { value: 0.35 },
      uHot: { value: new THREE.Color(1.0, 0.42, 0.14) }, uWhite: { value: new THREE.Color(1.0, 0.7, 0.45) },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mats.push(shockMat);
  const shock = new THREE.Mesh(shockGeom, shockMat);
  shock.renderOrder = 11;
  shock.frustumCulled = false;
  group.add(shock);

  // ── The streaks: ribbons off the rim of the sheath, trailing back. ──
  const STREAKS = lite ? 10 : 16;
  const ribbon = ribbonGeometry();
  geoms.push(ribbon);
  const streakMat = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
    uniforms: { uColor: { value: new THREE.Color(1.5, 0.6, 0.22) }, uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mats.push(streakMat);
  const streaks = new THREE.InstancedMesh(ribbon, streakMat, STREAKS);
  streaks.renderOrder = 12;
  streaks.frustumCulled = false;
  group.add(streaks);
  const streakSeed = Array.from({ length: STREAKS }, (_, i) => ({
    a: (i / STREAKS) * Math.PI * 2 + (i % 3) * 0.21,
    r: 0.75 + ((i * 37) % 11) / 30,
    len: 0.7 + ((i * 53) % 13) / 18,
    f: 17 + ((i * 29) % 19),
  }));

  // ── The contrails: two long white trails, and the vapour cone. ──
  const vapourMat = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
    uniforms: { uColor: { value: new THREE.Color(0.95, 0.97, 1.0) }, uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  mats.push(vapourMat);
  const trails = new THREE.InstancedMesh(ribbon, vapourMat, 2);
  trails.renderOrder = 10;
  trails.frustumCulled = false;
  group.add(trails);
  const coneGeom = new THREE.ConeGeometry(1, 1, lite ? 20 : 28, 1, true);
  coneGeom.rotateX(Math.PI / 2);
  coneGeom.translate(0, 0, -0.5);
  geoms.push(coneGeom);
  const coneMat = new THREE.ShaderMaterial({
    vertexShader: SHEATH_VERT,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
        gl_FragColor = vec4(vec3(0.96, 0.98, 1.0), uK * (0.15 + 0.55 * rim));
      }`,
    uniforms: { uK: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  mats.push(coneMat);
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.scale.set(size * 1.7, size * 1.7, size * 1.6);
  cone.position.z = size * 0.2;
  cone.renderOrder = 10;
  cone.frustumCulled = false;
  group.add(cone);

  // ── The sparks: bits of the shield shed into the wake, in the flow's
  // frame, so they stream straight back off the ship. ──
  const SPARKS = lite ? 60 : 140;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeom = new THREE.BufferGeometry();
  sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeom.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  geoms.push(sparkGeom);
  const sparkMat = new THREE.PointsMaterial({
    map: softSpriteTexture(), size: Math.max(0.35, size * 0.09), sizeAttenuation: true, vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  mats.push(sparkMat);
  const sparks = new THREE.Points(sparkGeom, sparkMat);
  sparks.renderOrder = 13;
  sparks.frustumCulled = false;
  group.add(sparks);
  let sparkAcc = 0;
  let nextSpark = 0;
  /** A small deterministic noise, so two runs of the same entry look alike. */
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const flow = new THREE.Vector3();
  const upOrtho = new THREE.Vector3();
  const side = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  let time = 0;

  const update = (dt: number, st: EntryFxState) => {
    time += dt;
    const heat = THREE.MathUtils.clamp(st.heat, 0, 1);
    const vapour = THREE.MathUtils.clamp(st.vapour, 0, 1);
    const trans = THREE.MathUtils.clamp(st.transonic, 0, 1);
    let live = 0;
    for (let i = 0; i < SPARKS; i++) if (sparkLife[i] > 0) live++;
    const on = heat > 0.01 || vapour > 0.01 || trans > 0.01 || live > 0;
    group.visible = on;
    if (!on) return;
    // The flow's frame: +Z the way the ship is going, +Y the planet's up
    // (square to it), +X to the side.
    flow.copy(st.velocity);
    if (flow.lengthSq() < 1e-8) flow.set(0, 0, -1);
    flow.normalize();
    upOrtho.copy(st.up).addScaledVector(flow, -st.up.dot(flow));
    if (upOrtho.lengthSq() < 1e-6) upOrtho.set(0, 1, 0).addScaledVector(flow, -flow.y);
    upOrtho.normalize();
    side.crossVectors(upOrtho, flow).normalize();
    basis.makeBasis(side, upOrtho, flow);
    group.position.copy(st.position);
    group.quaternion.setFromRotationMatrix(basis);

    // The sheath and the shock.
    sheath.visible = heat > 0.01;
    shock.visible = heat > 0.01;
    sheathMat.uniforms.uHeat.value = heat;
    sheathMat.uniforms.uTime.value = time;
    // uFlow is in the world frame: the shader lights the side facing it.
    (sheathMat.uniforms.uFlow.value as THREE.Vector3).copy(flow);
    shockMat.uniforms.uHeat.value = heat * 0.8;
    shockMat.uniforms.uTime.value = time * 0.7;
    (shockMat.uniforms.uFlow.value as THREE.Vector3).copy(flow);
    const puff = 1 + 0.04 * Math.sin(time * 29);
    sheath.scale.set(size * (1.25 + 0.2 * heat) * puff, size * (1.0 + 0.12 * heat) * puff, size * (1.6 + 0.35 * heat));
    shock.position.z = size * (1.2 + 0.4 * heat);
    shock.scale.set(size * (2.2 + 0.8 * heat), size * (2.2 + 0.8 * heat), size * (1.6 + 0.5 * heat));

    // The streaks, from the rim back along the wake.
    streaks.visible = heat > 0.03;
    streakMat.uniforms.uAlpha.value = Math.min(0.8, heat * 0.8);
    if (streaks.visible) {
      for (let i = 0; i < STREAKS; i++) {
        const sd = streakSeed[i];
        const flick = 0.75 + 0.25 * Math.sin(time * sd.f + i * 1.7);
        e.set(Math.cos(sd.a) * size * sd.r * 1.15, Math.sin(sd.a) * size * sd.r * 0.9, size * 0.4);
        q.identity();
        sc.set(size * 0.045 * (0.6 + heat), size * 0.045 * (0.6 + heat), size * (2.5 + 9 * heat) * sd.len * flick);
        m.compose(e, q, sc);
        streaks.setMatrixAt(i, m);
      }
      streaks.instanceMatrix.needsUpdate = true;
    }

    // The vapour.
    trails.visible = vapour > 0.01;
    vapourMat.uniforms.uAlpha.value = vapour * 0.55;
    if (trails.visible) {
      for (let i = 0; i < 2; i++) {
        e.set((i === 0 ? -1 : 1) * size * 0.9, -size * 0.1, -size * 0.6);
        sc.set(size * 0.14, size * 0.14, size * 38 * (0.6 + 0.4 * vapour));
        m.compose(e, q.identity(), sc);
        trails.setMatrixAt(i, m);
      }
      trails.instanceMatrix.needsUpdate = true;
    }
    cone.visible = trans > 0.01;
    coneMat.uniforms.uK.value = trans * (0.75 + 0.25 * Math.sin(time * 13));

    // The sparks: born on the windward face, blown back past the hull.
    sparkAcc += dt * heat * heat * (lite ? 90 : 220);
    while (sparkAcc >= 1) {
      sparkAcc -= 1;
      const i = nextSpark;
      nextSpark = (nextSpark + 1) % SPARKS;
      const a = rnd() * Math.PI * 2; const r = size * (0.2 + 0.9 * rnd());
      sparkPos[i * 3] = Math.cos(a) * r;
      sparkPos[i * 3 + 1] = Math.sin(a) * r * 0.7;
      sparkPos[i * 3 + 2] = size * (0.6 + 0.6 * rnd());
      sparkVel[i * 3] = (rnd() - 0.5) * size * 1.6;
      sparkVel[i * 3 + 1] = (rnd() - 0.5) * size * 1.2;
      sparkVel[i * 3 + 2] = -size * (7 + 14 * rnd());
      sparkLife[i] = 0.35 + 0.5 * rnd();
      const w = rnd();
      sparkCol[i * 3] = 1.6; sparkCol[i * 3 + 1] = 0.55 + 0.6 * w; sparkCol[i * 3 + 2] = 0.15 + 0.4 * w * w;
    }
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) { sparkCol[i * 3] = sparkCol[i * 3 + 1] = sparkCol[i * 3 + 2] = 0; continue; }
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      const fade = Math.min(1, sparkLife[i] * 3);
      sparkCol[i * 3] *= 0.98 + 0.02 * fade; sparkCol[i * 3 + 1] *= 0.96 + 0.04 * fade; sparkCol[i * 3 + 2] *= 0.94 + 0.06 * fade;
    }
    sparkGeom.getAttribute('position').needsUpdate = true;
    sparkGeom.getAttribute('color').needsUpdate = true;
  };

  return {
    group,
    update,
    dispose() {
      for (const g of geoms) g.dispose();
      for (const mt of mats) mt.dispose();
      streaks.dispose();
      trails.dispose();
    },
  };
}
