// The lunar surface under the cosmonaut's boots: a heightfield in metres
// built from layered noise, a rim ridge, a few dozen old craters and a
// levelled pad for the base, skinned with procedural regolith (albedo +
// normal + roughness, all drawn on canvas — no texture downloads). The
// heightfield stays authoritative after build so a meteor can dig a fresh
// crater into it and the geometry, the boots and the rocks all agree.

import * as THREE from 'three';

export const TERRAIN_SIZE = 360;
/** Playable radius — the cosmonaut is kept inside this. */
export const TERRAIN_WALK_RADIUS = 165;
/** Base pad: level ground so the habitats sit square. */
export const PAD_CENTER = new THREE.Vector2(0, -6);
export const PAD_RADIUS = 46;

function hash(ix: number, iy: number, seed: number): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = smooth(x - ix); const fy = smooth(y - iy);
  const a = hash(ix, iy, seed); const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed); const d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) + ((c - a) + (a - b - c + d) * fx) * fy;
}
export function fbm(x: number, y: number, octaves: number, seed: number, gain = 0.5): number {
  let amp = 1; let sum = 0; let norm = 0; let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * f, y * f, seed + i * 17) * 2 - 1) * amp;
    norm += amp;
    amp *= gain;
    f *= 2.03;
  }
  return sum / norm;
}
function ridged(x: number, y: number, seed: number): number {
  let amp = 1; let sum = 0; let f = 1;
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(valueNoise(x * f, y * f, seed + i * 31) * 2 - 1);
    sum += n * n * amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum;
}

interface Crater { x: number; z: number; r: number; depth: number }

/** A bowl with a raised rim: −depth at the centre, +rim at r, fading out by 1.5r. */
function craterProfile(d: number, c: Crater): number {
  const q = d / c.r;
  if (q >= 1.55) return 0;
  const rim = c.depth * 0.42;
  if (q < 1) {
    const bowl = 1 - q * q;
    return -c.depth * bowl * bowl + rim * smooth(Math.max(0, (q - 0.55) / 0.45));
  }
  const t = (q - 1) / 0.55;
  return rim * (1 - smooth(t));
}

export interface TerrainHandle {
  mesh: THREE.Mesh;
  rocks: THREE.Group;
  heightAt: (x: number, z: number) => number;
  /** Surface normal by finite difference — for boot tilt and rock seating. */
  normalAt: (x: number, z: number, out: THREE.Vector3) => THREE.Vector3;
  /** Dig a fresh crater and re-light the ground around it. */
  stampCrater: (x: number, z: number, r: number, depth: number) => void;
  /** Sun direction in view space, updated by the scene each frame. */
  setSunView: (v: THREE.Vector3) => void;
  dispose: () => void;
}

/** Fine regolith: grain, a few tiny pits, small bright clasts. */
function regolithMaps(size: number): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const h = new Float32Array(size * size);
  const S = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size; const v = y / size;
      // Periodic so the tile wraps: sample the noise on a torus via four blends.
      let n = 0;
      let w = 0;
      for (let k = 0; k < 4; k++) {
        const ox = k & 1 ? 1 : 0; const oy = k & 2 ? 1 : 0;
        const wx = ox ? u : 1 - u; const wy = oy ? v : 1 - v;
        const ww = wx * wy;
        n += fbm((u + ox) * 38, (v + oy) * 38, 5, S, 0.55) * ww;
        w += ww;
      }
      n /= w;
      h[y * size + x] = n;
    }
  }
  // Tiny pits stamped in (wrapping).
  const pits = 140;
  for (let i = 0; i < pits; i++) {
    const cx = hash(i, 3, S) * size; const cy = hash(i, 7, S) * size;
    const r = 3 + hash(i, 11, S) * 14;
    const dpt = 0.35 + hash(i, 13, S) * 0.5;
    for (let y = -r * 1.6; y <= r * 1.6; y++) {
      for (let x = -r * 1.6; x <= r * 1.6; x++) {
        const d = Math.hypot(x, y);
        const q = d / r;
        if (q > 1.6) continue;
        const px = ((Math.round(cx + x) % size) + size) % size;
        const py = ((Math.round(cy + y) % size) + size) % size;
        const bowl = q < 1 ? -(1 - q * q) * (1 - q * q) : 0;
        const rim = q > 0.6 && q < 1.6 ? 0.28 * (1 - Math.abs(q - 1.05) / 0.55) : 0;
        h[py * size + px] += dpt * (bowl + Math.max(0, rim));
      }
    }
  }
  const map = document.createElement('canvas');
  map.width = map.height = size;
  const nrm = document.createElement('canvas');
  nrm.width = nrm.height = size;
  const rgh = document.createElement('canvas');
  rgh.width = rgh.height = size;
  const mc = map.getContext('2d')!; const nc = nrm.getContext('2d')!; const rc = rgh.getContext('2d')!;
  const mi = mc.createImageData(size, size); const ni = nc.createImageData(size, size); const ri = rc.createImageData(size, size);
  const at = (x: number, y: number) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = at(x, y);
      const grain = hash(x, y, 91) - 0.5;
      const clast = hash(x, y, 97) > 0.9965 ? 0.45 : 0;
      // Albedo: mid grey, a little warmer in the dips, sparkly clasts.
      const base = 0.74 + v * 0.14 + grain * 0.12 + clast;
      const g = Math.max(0, Math.min(1, base));
      mi.data[i] = Math.round(g * 255 * 1.0);
      mi.data[i + 1] = Math.round(g * 255 * 0.985);
      mi.data[i + 2] = Math.round(g * 255 * 0.975);
      mi.data[i + 3] = 255;
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.6 + grain * 0.3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.6 + (hash(x, y, 93) - 0.5) * 0.3;
      const len = Math.hypot(dx, dy, 1);
      ni.data[i] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      ni.data[i + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      ni.data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      ni.data[i + 3] = 255;
      const r = Math.max(0, Math.min(1, 0.9 - clast * 0.8 + grain * 0.1));
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = Math.round(r * 255);
      ri.data[i + 3] = 255;
    }
  }
  mc.putImageData(mi, 0, 0); nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(map, true), normal: tex(nrm, false), rough: tex(rgh, false) };
}

function rockGeometry(seed: number, detail: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const sx = 0.7 + hash(seed, 1, 5) * 0.6; const sy = 0.55 + hash(seed, 2, 5) * 0.4; const sz = 0.7 + hash(seed, 3, 5) * 0.6;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 1 + fbm(v.x * 1.7 + seed, v.y * 1.7 + v.z * 0.9, 4, seed + 40) * 0.42;
    v.multiplyScalar(n);
    // Flatten the underside so it sits in the dust rather than on a point.
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.25;
    v.x *= sx; v.y *= sy; v.z *= sz;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Beyond the playable square: a ring of hills out to the horizon, sharing
 * the terrain's material, sitting just under the square where they overlap
 * so the near ground always wins, and rising into mountains past it.
 */
export function makeMoonHorizon(terrain: TerrainHandle, lite: boolean): THREE.Mesh {
  const inner = 172;
  const outer = 1500;
  const geom = new THREE.RingGeometry(inner, outer, lite ? 96 : 160, lite ? 10 : 18);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const seed = 2026;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const near = terrain.heightAt(x, z) - 0.08;
    const hills = fbm(x / 260, z / 260, 4, seed + 71) * 34 + ridged(x / 520 + 9, z / 520, seed + 77) * 46 * Math.min(1, (r - 300) / 600);
    const k = r <= 250 ? 0 : Math.min(1, (r - 250) / 90);
    const t = k * k * (3 - 2 * k);
    pos.setY(i, near * (1 - t) + hills * t);
    const v = 0.95 + fbm(x / 120, z / 120, 3, seed + 33) * 0.1;
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = v;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  // Tile the regolith off world position, at the same six metres a tile the
  // near ground uses: anything else puts a visible seam where the two meet,
  // and from a hundred metres up on the way down you look straight at it.
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 6, pos.getZ(i) / 6);
  const mesh = new THREE.Mesh(geom, terrain.mesh.material);
  mesh.receiveShadow = true;
  mesh.name = 'moon-horizon';
  return mesh;
}

export function makeMoonTerrain(lite: boolean): TerrainHandle {
  const N = lite ? 160 : 320;
  const size = TERRAIN_SIZE;
  const half = size / 2;
  const cell = size / N;
  const heights = new Float32Array((N + 1) * (N + 1));
  const seed = 2026;

  // Old craters, none on the pad.
  const craters: Crater[] = [];
  for (let i = 0; i < 46; i++) {
    const r = 2.5 + Math.pow(hash(i, 21, seed), 2.2) * 26;
    const x = (hash(i, 22, seed) - 0.5) * size * 0.92;
    const z = (hash(i, 23, seed) - 0.5) * size * 0.92;
    if (Math.hypot(x - PAD_CENTER.x, z - PAD_CENTER.y) < PAD_RADIUS + r * 1.6) continue;
    craters.push({ x, z, r, depth: r * (0.14 + hash(i, 24, seed) * 0.1) });
  }
  const rawHeight = (x: number, z: number): number => {
    let h = fbm(x / 95, z / 95, 4, seed) * 7.5;
    // A long rim ridge across the western side — the horizon in the reference.
    const ridgeD = Math.abs((x + 0.55 * z) / 1.14 + 68);
    const ridgeMask = Math.exp(-(ridgeD * ridgeD) / (2 * 28 * 28));
    h += ridged(x / 60 + 3.1, z / 60, seed + 5) * 7.5 * ridgeMask;
    h += fbm(x / 9, z / 9, 3, seed + 9) * 0.55;
    h += fbm(x / 2.2, z / 2.2, 2, seed + 13) * 0.11;
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r * 1.55) h += craterProfile(d, c);
    }
    for (const c of small) {
      const dx = x - c.x; if (dx > 6 || dx < -6) continue;
      const dz = z - c.z; if (dz > 6 || dz < -6) continue;
      const d = Math.hypot(dx, dz);
      if (d < c.r * 1.55) h += craterProfile(d, c);
    }
    return h;
  };
  // Small craters — the ground is pocked at every scale.
  const small: Crater[] = [];
  for (let i = 0; i < 420; i++) {
    const r = 0.9 + Math.pow(hash(i, 61, seed), 1.6) * 3.6;
    const x = (hash(i, 62, seed) - 0.5) * size * 0.96;
    const z = (hash(i, 63, seed) - 0.5) * size * 0.96;
    if (Math.hypot(x - PAD_CENTER.x, z - PAD_CENTER.y) < 14) continue;
    small.push({ x, z, r, depth: r * (0.16 + hash(i, 64, seed) * 0.12) });
  }
  const padHeight = rawHeight(PAD_CENTER.x, PAD_CENTER.y) * 0.3;
  const heightFn = (x: number, z: number): number => {
    const h = rawHeight(x, z);
    const d = Math.hypot(x - PAD_CENTER.x, z - PAD_CENTER.y);
    if (d >= PAD_RADIUS + 22) return h;
    const t = d <= PAD_RADIUS ? 0 : smooth((d - PAD_RADIUS) / 22);
    const flat = padHeight + fbm(x / 2.2, z / 2.2, 2, seed + 13) * 0.05;
    return flat + (h - flat) * t;
  };
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      heights[j * (N + 1) + i] = heightFn(-half + i * cell, -half + j * cell);
    }
  }

  const heightAt = (x: number, z: number): number => {
    const fx = THREE.MathUtils.clamp((x + half) / cell, 0, N - 1e-6);
    const fz = THREE.MathUtils.clamp((z + half) / cell, 0, N - 1e-6);
    const i = Math.floor(fx); const j = Math.floor(fz);
    const tx = fx - i; const tz = fz - j;
    const h00 = heights[j * (N + 1) + i]; const h10 = heights[j * (N + 1) + i + 1];
    const h01 = heights[(j + 1) * (N + 1) + i]; const h11 = heights[(j + 1) * (N + 1) + i + 1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  };
  const normalAt = (x: number, z: number, out: THREE.Vector3): THREE.Vector3 => {
    const e = 0.6;
    const dx = heightAt(x + e, z) - heightAt(x - e, z);
    const dz = heightAt(x, z + e) - heightAt(x, z - e);
    return out.set(-dx, 2 * e, -dz).normalize();
  };

  const geom = new THREE.PlaneGeometry(size, size, N, N);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const writeVertex = (i: number) => {
    const x = pos.getX(i); const z = pos.getZ(i);
    const gi = Math.round((x + half) / cell); const gj = Math.round((z + half) / cell);
    pos.setY(i, heights[gj * (N + 1) + gi]);
  };
  for (let i = 0; i < pos.count; i++) {
    writeVertex(i);
    const x = pos.getX(i); const z = pos.getZ(i);
    // Macro albedo: darker maria patches, brighter crater floors, a faint
    // bright halo on the pad where the landers have scattered dust.
    let v = 0.96 + fbm(x / 40, z / 40, 3, seed + 33) * 0.12;
    const d = Math.hypot(x - PAD_CENTER.x, z - PAD_CENTER.y);
    if (d < PAD_RADIUS + 10) v += 0.06 * (1 - d / (PAD_RADIUS + 10));
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = THREE.MathUtils.clamp(v, 0.7, 1.1);
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  const uv = geom.attributes.uv as THREE.BufferAttribute;
  const repeat = size / 6;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repeat, uv.getY(i) * repeat);

  const maps = regolithMaps(lite ? 512 : 1024);
  const mat = new THREE.MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: maps.rough,
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    color: 0xe2e0dc,
  });
  // Regolith is retro-reflective: it brightens sharply when the Sun is
  // behind the viewer (the opposition surge — why the ground round your own
  // shadow glows in Apollo photographs). A second, finer normal sample
  // breaks the tiling so the same grain never lines up twice.
  const sunView = { value: new THREE.Vector3(0, 1, 0) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunView = sunView;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunView;')
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
        vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 6.37 + vec2(0.31, 0.77) ).xyz * 2.0 - 1.0;
        mapN = normalize( vec3( mapN.xy * normalScale + mapN2.xy * normalScale * 0.55, mapN.z * mapN2.z ) );
        normal = normalize( tbn * mapN );`)
      .replace('#include <lights_fragment_begin>', `
        {
          vec3 V = normalize( -vViewPosition );
          float surge = pow( max( dot( V, uSunView ), 0.0 ), 10.0 );
          diffuseColor.rgb *= 1.0 + 0.42 * surge;
        }
        #include <lights_fragment_begin>`);
  };
  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'moon-terrain';

  // Rocks: three cuts, a few hundred seats. Small stuff everywhere, boulders
  // only out on the plain and up the ridge.
  const rockGeoms = [rockGeometry(1, lite ? 1 : 2), rockGeometry(2, lite ? 1 : 2), rockGeometry(3, lite ? 1 : 3)];
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xa8a5a0, roughness: 0.92, metalness: 0.02, normalMap: maps.normal, normalScale: new THREE.Vector2(0.5, 0.5) });
  const perCut = lite ? 90 : 180;
  const rocks = new THREE.Group();
  rocks.name = 'moon-rocks';
  const instanced: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const spin = new THREE.Quaternion();
  const s = new THREE.Vector3(); const p = new THREE.Vector3();
  const nrm = new THREE.Vector3(); const up = new THREE.Vector3(0, 1, 0);
  rockGeoms.forEach((rg, cut) => {
    const im = new THREE.InstancedMesh(rg, rockMat, perCut);
    im.castShadow = true;
    im.receiveShadow = true;
    let placed = 0;
    for (let i = 0; i < perCut * 5 && placed < perCut; i++) {
      const k = i + cut * 1000;
      const x = (hash(k, 51, seed) - 0.5) * size * 0.95;
      const z = (hash(k, 52, seed) - 0.5) * size * 0.95;
      const d = Math.hypot(x - PAD_CENTER.x, z - PAD_CENTER.y);
      const big = Math.pow(hash(k, 53, seed), 3);
      const scale = 0.18 + big * 2.6;
      if (d < PAD_RADIUS && scale > 0.5) continue;
      if (d < 12) continue;
      p.set(x, heightAt(x, z) - scale * 0.22, z);
      normalAt(x, z, nrm);
      q.setFromUnitVectors(up, nrm);
      spin.setFromAxisAngle(up, hash(k, 54, seed) * Math.PI * 2);
      q.multiply(spin);
      s.set(scale * (0.8 + hash(k, 55, seed) * 0.5), scale * (0.7 + hash(k, 56, seed) * 0.5), scale * (0.8 + hash(k, 57, seed) * 0.5));
      m.compose(p, q, s);
      im.setMatrixAt(placed, m);
      placed += 1;
    }
    im.count = placed;
    im.instanceMatrix.needsUpdate = true;
    rocks.add(im);
    instanced.push(im);
  });

  const stampCrater = (cx: number, cz: number, r: number, depth: number) => {
    const c: Crater = { x: cx, z: cz, r, depth };
    const i0 = Math.max(0, Math.floor((cx - r * 1.6 + half) / cell));
    const i1 = Math.min(N, Math.ceil((cx + r * 1.6 + half) / cell));
    const j0 = Math.max(0, Math.floor((cz - r * 1.6 + half) / cell));
    const j1 = Math.min(N, Math.ceil((cz + r * 1.6 + half) / cell));
    const col = geom.attributes.color as THREE.BufferAttribute;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = -half + i * cell; const z = -half + j * cell;
        const d = Math.hypot(x - cx, z - cz);
        if (d >= r * 1.55) continue;
        const k = j * (N + 1) + i;
        heights[k] += craterProfile(d, c);
        pos.setY(k, heights[k]);
        // Fresh ejecta is brighter than the weathered surface.
        const bright = 1 + 0.12 * (1 - d / (r * 1.55));
        col.setXYZ(k, Math.min(1.1, col.getX(k) * bright), Math.min(1.1, col.getY(k) * bright), Math.min(1.1, col.getZ(k) * bright));
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geom.computeVertexNormals();
  };

  return {
    mesh, rocks, heightAt, normalAt, stampCrater,
    setSunView(v) { sunView.value.copy(v); },
    dispose() {
      geom.dispose(); mat.dispose();
      maps.map.dispose(); maps.normal.dispose(); maps.rough.dispose();
      for (const g of rockGeoms) g.dispose();
      rockMat.dispose();
      for (const im of instanced) im.dispose();
    },
  };
}
