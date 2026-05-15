import * as THREE from 'three';

let cached: THREE.CanvasTexture | null = null;

/** Soft circular sprite for THREE.Points — avoids square GL_POINTS on mobile. */
export function softSpriteTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  cached = new THREE.CanvasTexture(canvas);
  cached.colorSpace = THREE.SRGBColorSpace;
  return cached;
}

export function saturnRingTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    const bands = [
      { y0: 0, y1: 18, a: 0.05, c: '#8a7a68' },
      { y0: 18, y1: 32, a: 0.35, c: '#c4b090' },
      { y0: 32, y1: 48, a: 0.55, c: '#e8dcc4' },
      { y0: 48, y1: 62, a: 0.42, c: '#d8c8a8' },
      { y0: 62, y1: 78, a: 0.28, c: '#a89878' },
      { y0: 78, y1: 96, a: 0.18, c: '#908070' },
      { y0: 96, y1: h, a: 0.08, c: '#706050' },
    ];
    for (const b of bands) {
      ctx.fillStyle = b.c;
      ctx.globalAlpha = b.a;
      ctx.fillRect(0, b.y0, w, b.y1 - b.y0);
    }
    ctx.globalAlpha = 0.12;
    for (let x = 0; x < w; x += 6) {
      const n = 0.85 + Math.sin(x * 0.08) * 0.15;
      ctx.fillStyle = `rgba(255,248,235,${n})`;
      ctx.fillRect(x, 28, 3, 44);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}
