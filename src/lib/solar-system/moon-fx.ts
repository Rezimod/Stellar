// Regolith in motion: one pooled particle system for boot puffs, landing
// splashes and meteor ejecta. Every grain is a ballistic point under lunar
// gravity — no air, so no drift and no lingering cloud: it goes up, it
// comes down, it stops.

import * as THREE from 'three';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';

export const MOON_G = 1.62;

export interface DustBurst {
  x: number; y: number; z: number;
  count: number;
  /** Speed range, m/s, and the cone half-angle from straight up (rad). */
  speedMin: number; speedMax: number; cone: number;
  size: number;
  /** Optional horizontal bias (a boot pushing back, an oblique impact). */
  dirX?: number; dirZ?: number; bias?: number;
  brightness?: number;
}

export interface DustHandle {
  points: THREE.Points;
  burst: (b: DustBurst) => void;
  update: (dt: number, heightAt: (x: number, z: number) => number) => void;
  dispose: () => void;
}

/** `g` is the surface gravity the grains fall under; `tint` the colour of the ground they came off. */
export function makeMoonDust(max: number, g = MOON_G, tint: [number, number, number] = [0.62, 0.61, 0.59]): DustHandle {
  const pos = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const sizes = new Float32Array(max);
  const shade = new Float32Array(max);
  const geom = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  const sizeAttr = new THREE.BufferAttribute(sizes, 1);
  const shadeAttr = new THREE.BufferAttribute(shade, 1);
  geom.setAttribute('position', posAttr);
  geom.setAttribute('aSize', sizeAttr);
  geom.setAttribute('aShade', shadeAttr);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: softSpriteTexture() }, uScale: { value: 600 }, uTint: { value: new THREE.Vector3(...tint) } },
    vertexShader: `
      attribute float aSize; attribute float aShade; varying float vShade;
      uniform float uScale;
      void main() {
        // Grains right at the lens fade out rather than filling the screen:
        // a capped size keeps a spray behind the wheels from costing a frame.
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vShade = aShade * smoothstep(0.6, 2.2, -mv.z);
        gl_PointSize = min(aSize * uScale / max(1.0, -mv.z), 40.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; varying float vShade;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a;
        if (vShade <= 0.0) discard;
        gl_FragColor = vec4(uTint * vShade, a * 0.9);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  points.name = 'moon-dust';
  let head = 0;
  let alive = 0;

  const burst = (b: DustBurst) => {
    const bias = b.bias ?? 0;
    for (let n = 0; n < b.count; n++) {
      const i = head;
      head = (head + 1) % max;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * b.cone;
      const sp = b.speedMin + Math.random() * (b.speedMax - b.speedMin);
      const sx = Math.sin(phi) * Math.cos(theta);
      const sz = Math.sin(phi) * Math.sin(theta);
      vel[i * 3] = (sx + (b.dirX ?? 0) * bias) * sp;
      vel[i * 3 + 1] = Math.cos(phi) * sp;
      vel[i * 3 + 2] = (sz + (b.dirZ ?? 0) * bias) * sp;
      pos[i * 3] = b.x + sx * 0.15;
      pos[i * 3 + 1] = b.y + 0.05;
      pos[i * 3 + 2] = b.z + sz * 0.15;
      life[i] = 1;
      sizes[i] = b.size * (0.6 + Math.random() * 0.8);
      shade[i] = (b.brightness ?? 1) * (0.85 + Math.random() * 0.3);
    }
    alive = max;
    sizeAttr.needsUpdate = true;
  };

  return {
    points,
    burst,
    update(dt, heightAt) {
      if (alive === 0) return;
      let any = false;
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        any = true;
        vel[i * 3 + 1] -= g * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const ground = heightAt(pos[i * 3], pos[i * 3 + 2]);
        if (pos[i * 3 + 1] <= ground && vel[i * 3 + 1] < 0) {
          // Settled: it is regolith again.
          life[i] = 0;
          shade[i] = 0;
          pos[i * 3 + 1] = ground - 1;
        }
      }
      if (!any) { alive = 0; return; }
      posAttr.needsUpdate = true;
      shadeAttr.needsUpdate = true;
    },
    dispose() {
      geom.dispose();
      mat.dispose();
    },
  };
}
