// Practical lights. Every punctual light in a three.js scene is paid for by
// every lit fragment on screen, whether it is lit or not — so the surface
// keeps a fixed pool of two, and the things that glow hard enough to light
// their surroundings (a habitat ceiling, the descent plume, a meteoroid, the
// craft) ask for one each frame. The strongest requests near the crew win.
// The pool never changes size, so no request ever recompiles a shader.

import * as THREE from 'three';

export interface LightPool {
  lights: THREE.PointLight[];
  /** Ask for a light this frame. Colour as hex; intensity in three's units. */
  request: (x: number, y: number, z: number, color: number, intensity: number, distance: number, decay?: number) => void;
  /** Hand the pool to this frame's strongest requests near the crew. */
  flush: (x: number, y: number, z: number) => void;
}

const MAX_REQUESTS = 12;

export function makeLightPool(count: number): LightPool {
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < count; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 10, 1.6);
    l.castShadow = false;
    lights.push(l);
  }
  const reqs = Array.from({ length: MAX_REQUESTS }, () => ({ x: 0, y: 0, z: 0, color: 0, intensity: 0, distance: 0, decay: 1.6, score: 0 }));
  let n = 0;
  return {
    lights,
    request(x, y, z, color, intensity, distance, decay = 1.6) {
      if (intensity <= 0.001 || n >= MAX_REQUESTS) return;
      const r = reqs[n++];
      r.x = x; r.y = y; r.z = z; r.color = color; r.intensity = intensity; r.distance = distance; r.decay = decay;
    },
    flush(cx, cy, cz) {
      for (let i = 0; i < n; i++) {
        const r = reqs[i];
        const d2 = (r.x - cx) ** 2 + (r.y - cy) ** 2 + (r.z - cz) ** 2;
        r.score = r.intensity / (1 + d2 / (r.distance * r.distance));
      }
      for (let k = 0; k < lights.length; k++) {
        let best = -1;
        for (let i = 0; i < n; i++) if (reqs[i].score >= 0 && (best < 0 || reqs[i].score > reqs[best].score)) best = i;
        const l = lights[k];
        if (best < 0) { l.intensity = 0; continue; }
        const r = reqs[best];
        r.score = -1;
        l.position.set(r.x, r.y, r.z);
        l.color.setHex(r.color);
        l.intensity = r.intensity;
        l.distance = r.distance;
        l.decay = r.decay;
      }
      n = 0;
    },
  };
}
