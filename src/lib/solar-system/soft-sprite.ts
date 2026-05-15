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

/** Matches `SaturnRingsSvg` in PlanetIcon — gold band + inner shadow. */
export function saturnRingTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.35);
    ctx.strokeStyle = '#f3e2a5';
    ctx.lineWidth = 28;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#695022';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}
