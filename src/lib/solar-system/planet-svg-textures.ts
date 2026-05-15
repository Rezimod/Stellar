import * as THREE from 'three';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';
import {
  PLANET_PALETTES,
  hexToRgb,
  mixRgb,
  rgbStr,
  type PlanetPalette,
} from '@/lib/solar-system/planet-palettes';

const SRGB = THREE.SRGBColorSpace;
const W = 1024;
const H = 512;

const LIGHT_DIR = { x: 0.42, y: 0.62, z: 0.66 };

function normalAt(u: number, v: number): { x: number; y: number; z: number } {
  const lon = (u - 0.5) * Math.PI * 2;
  const lat = (0.5 - v) * Math.PI;
  const cl = Math.cos(lat);
  return {
    x: cl * Math.cos(lon),
    y: Math.sin(lat),
    z: cl * Math.sin(lon),
  };
}

function shadedPixel(palette: PlanetPalette, nx: number, ny: number, nz: number): [number, number, number] {
  const d =
    Math.max(0, nx * LIGHT_DIR.x + ny * LIGHT_DIR.y + nz * LIGHT_DIR.z) * 0.72 +
    (1 - Math.abs(ny)) * 0.08 +
    0.12;
  const light = hexToRgb(palette.light);
  const mid = hexToRgb(palette.mid);
  const dark = hexToRgb(palette.dark);
  if (d > 0.62) return mixRgb(mid, light, (d - 0.62) / 0.38);
  return mixRgb(dark, mid, d / 0.62);
}

function fillShadedSphere(ctx: CanvasRenderingContext2D, palette: PlanetPalette) {
  const img = ctx.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const n = normalAt(u, v);
      const c = shadedPixel(palette, n.x, n.y, n.z);
      const i = (y * W + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function addSheen(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(W * 0.28, H * 0.22, 0, W * 0.34, H * 0.28, W * 0.42);
  g.addColorStop(0, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function addAtmosphereRim(ctx: CanvasRenderingContext2D, palette: PlanetPalette) {
  const rim = hexToRgb(palette.rim);
  ctx.strokeStyle = rgbStr(rim, 0.22);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, W * 0.36, H * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function latBand(ctx: CanvasRenderingContext2D, vCenter: number, vHalf: number, color: string) {
  const y0 = (vCenter - vHalf) * H;
  const y1 = (vCenter + vHalf) * H;
  ctx.fillStyle = color;
  ctx.fillRect(0, y0, W, y1 - y0);
}

function drawJupiter(ctx: CanvasRenderingContext2D) {
  const bands = [
    { v: 0.24, h: 0.08, c: 'rgba(150,94,46,0.26)' },
    { v: 0.37, h: 0.1, c: 'rgba(122,69,30,0.18)' },
    { v: 0.51, h: 0.07, c: 'rgba(151,106,73,0.24)' },
    { v: 0.63, h: 0.06, c: 'rgba(96,62,32,0.18)' },
  ];
  for (const b of bands) latBand(ctx, b.v, b.h / 2, b.c);
  ctx.fillStyle = 'rgba(194,120,80,0.36)';
  ctx.beginPath();
  ctx.ellipse(W * 0.62, H * 0.55, W * 0.09, H * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(238,196,164,0.22)';
  ctx.beginPath();
  ctx.ellipse(W * 0.62, H * 0.55, W * 0.055, H * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSaturn(ctx: CanvasRenderingContext2D) {
  const bands = [
    { v: 0.31, h: 0.08, a: 0.18 },
    { v: 0.48, h: 0.07, a: 0.22 },
    { v: 0.61, h: 0.05, a: 0.16 },
  ];
  for (const b of bands) {
    latBand(ctx, b.v, b.h / 2, `rgba(121,86,31,${b.a})`);
  }
}

function drawMars(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(93,38,20,0.28)';
  ctx.beginPath();
  ctx.ellipse(W * 0.38, H * 0.34, W * 0.14, H * 0.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(64,24,13,0.24)';
  ctx.beginPath();
  ctx.ellipse(W * 0.42, H * 0.58, W * 0.12, H * 0.08, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMercury(ctx: CanvasRenderingContext2D) {
  const craters = [
    { u: 0.32, v: 0.44, r: 0.044 },
    { u: 0.44, v: 0.57, r: 0.031 },
    { u: 0.57, v: 0.66, r: 0.038 },
  ];
  for (const c of craters) {
    ctx.fillStyle = 'rgba(72,68,62,0.22)';
    ctx.beginPath();
    ctx.arc(c.u * W, c.v * H, c.r * W, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVenus(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(243,223,173,0.28)';
  latBand(ctx, 0.38, 0.06, 'rgba(243,223,173,0.28)');
  latBand(ctx, 0.58, 0.05, 'rgba(243,223,173,0.24)');
}

function drawEarth(ctx: CanvasRenderingContext2D) {
  const patches = [
    { u: 0.22, v: 0.35, w: 0.18, h: 0.12, c: 'rgba(61,125,90,0.45)' },
    { u: 0.48, v: 0.42, w: 0.22, h: 0.14, c: 'rgba(45,110,75,0.42)' },
    { u: 0.65, v: 0.38, w: 0.14, h: 0.1, c: 'rgba(55,100,70,0.38)' },
    { u: 0.35, v: 0.58, w: 0.2, h: 0.11, c: 'rgba(50,95,68,0.4)' },
    { u: 0.58, v: 0.62, w: 0.16, h: 0.09, c: 'rgba(42,88,62,0.36)' },
  ];
  for (const p of patches) {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.ellipse(p.u * W, p.v * H, p.w * W, p.h * H, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(200,230,255,0.18)';
  latBand(ctx, 0.28, 0.04, 'rgba(200,230,255,0.18)');
}

function drawIceGiant(ctx: CanvasRenderingContext2D, r: number, g: number, b: number, opacity: number) {
  const c = `rgba(${r},${g},${b},${opacity})`;
  for (const v of [0.34, 0.5, 0.63]) latBand(ctx, v, 0.04, c);
}

function drawSun(ctx: CanvasRenderingContext2D, palette: PlanetPalette) {
  fillShadedSphere(ctx, palette);
  ctx.fillStyle = 'rgba(255,248,204,0.18)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,235,145,0.28)';
  ctx.beginPath();
  ctx.ellipse(W * 0.38, H * 0.36, W * 0.12, H * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPluto(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(60,50,45,0.25)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect((0.2 + i * 0.09) * W, (0.35 + (i % 3) * 0.12) * H, W * 0.08, H * 0.05);
  }
}

function drawSurface(ctx: CanvasRenderingContext2D, id: SolarBodyId) {
  switch (id) {
    case 'sun':
      return;
    case 'jupiter':
      drawJupiter(ctx);
      break;
    case 'saturn':
      drawSaturn(ctx);
      break;
    case 'mars':
      drawMars(ctx);
      break;
    case 'mercury':
      drawMercury(ctx);
      break;
    case 'venus':
      drawVenus(ctx);
      break;
    case 'earth':
      drawEarth(ctx);
      break;
    case 'uranus':
      drawIceGiant(ctx, 141, 213, 216, 0.28);
      break;
    case 'neptune':
      drawIceGiant(ctx, 168, 202, 255, 0.22);
      break;
    case 'pluto':
      drawPluto(ctx);
      break;
    default:
      break;
  }
}

const textureCache = new Map<SolarBodyId, THREE.CanvasTexture>();

/** Equirectangular maps matching sky `PlanetIcon` SVG style. */
export function getSvgStylePlanetTexture(id: SolarBodyId): THREE.CanvasTexture {
  const cached = textureCache.get(id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = SRGB;
    textureCache.set(id, empty);
    return empty;
  }

  const palette = PLANET_PALETTES[id];
  if (id === 'sun') drawSun(ctx, palette);
  else {
    fillShadedSphere(ctx, palette);
    drawSurface(ctx, id);
    addSheen(ctx);
    addAtmosphereRim(ctx, palette);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = SRGB;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(id, tex);
  return tex;
}

export function disposeSvgStyleTextures() {
  textureCache.forEach((t) => t.dispose());
  textureCache.clear();
}
