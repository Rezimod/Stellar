import * as THREE from 'three';

const SRGB = THREE.SRGBColorSpace;

let ringTexCache: THREE.CanvasTexture | null = null;

/**
 * Radial slice for RingGeometry (v = inner→outer). Cassini + Encke gaps, A/B ring tones.
 * Based on Cassini mission appearance (NASA).
 */
export function saturnRingTexture(): THREE.CanvasTexture {
  if (ringTexCache) return ringTexCache;

  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let y = 0; y < h; y++) {
      const t = y / h;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (t < 0.08) {
        a = 0;
      } else if (t < 0.22) {
        const u = (t - 0.08) / 0.14;
        r = 210 + u * 25;
        g = 175 + u * 35;
        b = 120 + u * 40;
        a = 0.35 + u * 0.45;
      } else if (t < 0.48) {
        const u = (t - 0.22) / 0.26;
        r = 235 - u * 15;
        g = 210 - u * 20;
        b = 165 - u * 25;
        a = 0.78 + Math.sin(u * Math.PI * 8) * 0.08;
      } else if (t < 0.56) {
        a = 0.04;
      } else if (t < 0.78) {
        const u = (t - 0.56) / 0.22;
        r = 200 + u * 20;
        g = 170 + u * 25;
        b = 130 + u * 20;
        a = 0.55 + u * 0.25;
      } else if (t < 0.86) {
        a = 0.06;
      } else if (t < 0.98) {
        const u = (t - 0.86) / 0.12;
        r = 180 + u * 30;
        g = 150 + u * 25;
        b = 110 + u * 20;
        a = 0.25 + u * 0.2;
      }

      ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a.toFixed(3)})`;
      ctx.fillRect(0, y, w, 1);
    }

    ctx.globalAlpha = 0.12;
    for (let x = 0; x < w; x += 8) {
      const n = 0.85 + Math.sin(x * 0.04) * 0.15;
      ctx.fillStyle = `rgba(255,248,235,${n})`;
      ctx.fillRect(x, h * 0.35, 4, h * 0.35);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = SRGB;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  ringTexCache = tex;
  return tex;
}

export function disposeSaturnRingTexture() {
  ringTexCache?.dispose();
  ringTexCache = null;
}
