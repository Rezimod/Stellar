import * as THREE from 'three';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';
import { bodyColor } from '@/lib/solar-system/ephemeris';

const SRGB = THREE.SRGBColorSpace;

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 512,
  h = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = SRGB;
    return t;
  }
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = SRGB;
  tex.anisotropy = 4;
  return tex;
}

function noiseRoughness(ctx: CanvasRenderingContext2D, w: number, h: number, grain: number) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * grain + 0.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.floor(n * 255);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Procedural diffuse (+ optional hero equirectangular texture like homepage). */
export function createPlanetMaterial(
  id: SolarBodyId,
  lite: boolean,
  diffuseTexture?: THREE.Texture | null,
): THREE.MeshStandardMaterial {
  if (diffuseTexture) {
    if (id === 'sun') {
      return new THREE.MeshStandardMaterial({
        map: diffuseTexture,
        emissive: new THREE.Color(0xf6c15c),
        emissiveMap: diffuseTexture,
        emissiveIntensity: lite ? 1.02 : 1.25,
        roughness: 0.9,
        metalness: 0,
      });
    }
    const rough =
      id === 'moon' ? 0.93 :
      id === 'earth' ? 0.7 :
      id === 'mars' ? 0.86 :
      id === 'jupiter' || id === 'saturn' ? 0.8 :
      0.76;
    const metal =
      id === 'earth' ? 0.07 :
      id === 'jupiter' || id === 'saturn' ? 0.045 :
      0.03;
    return new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      roughness: rough,
      metalness: metal,
    });
  }

  const base = bodyColor(id);
  const hex = `#${base.toString(16).padStart(6, '0')}`;

  if (id === 'sun') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.35, h * 0.35, 0, w * 0.5, h * 0.5, w * 0.65);
      g.addColorStop(0, '#fff9e6');
      g.addColorStop(0.35, '#ffe08a');
      g.addColorStop(0.7, '#f5a623');
      g.addColorStop(1, '#c76a10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    return new THREE.MeshStandardMaterial({
      map,
      emissive: new THREE.Color(0xf6c15c),
      emissiveMap: map,
      emissiveIntensity: lite ? 1.15 : 1.4,
      roughness: 0.9,
      metalness: 0,
    });
  }

  if (id === 'jupiter' || id === 'saturn') {
    const map = canvasTexture((ctx, w, h) => {
      const bands = id === 'jupiter' ? 22 : 16;
      for (let i = 0; i < bands; i++) {
        const y0 = (i / bands) * h;
        const y1 = ((i + 1) / bands) * h;
        const t = i / bands;
        const shade = 0.55 + 0.45 * Math.sin(t * Math.PI * 3.2);
        const drift = id === 'jupiter' ? 0.08 * Math.sin(t * 12) : 0.05 * Math.sin(t * 9);
        ctx.fillStyle = `rgb(${200 * shade * (1 - drift)},${170 * shade},${120 * shade})`;
        ctx.fillRect(0, y0, w, y1 - y0);
      }
      ctx.globalAlpha = id === 'jupiter' ? 0.1 : 0.12;
      for (let x = 0; x < w; x += 5) {
        const u = (x / w) * Math.PI * 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(
          x,
          (Math.sin(u * 4 + (id === 'jupiter' ? 0.7 : 0.2)) * 0.5 + 0.5) * h * 0.22,
          2,
          h * 0.48,
        );
      }
      ctx.globalAlpha = 1;
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.82,
      metalness: 0.04,
    });
  }

  if (id === 'earth') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1a4a7a');
      g.addColorStop(0.35, '#2d6aab');
      g.addColorStop(0.55, '#3d7d6a');
      g.addColorStop(0.72, '#2d6aab');
      g.addColorStop(1, '#1a3d6a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(200,220,255,0.35)';
      for (let i = 0; i < 40; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const rw = 8 + Math.random() * 40;
        const rh = 6 + Math.random() * 20;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.72,
      metalness: 0.05,
    });
  }

  if (id === 'mars') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#9e3d28';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(${40 + Math.random() * 40},${20 + Math.random() * 25},${15 + Math.random() * 20},0.4)`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 30, 3 + Math.random() * 20);
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0.02 });
  }

  if (id === 'venus') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#e8dcc8');
      g.addColorStop(0.5, '#d4c4a8');
      g.addColorStop(1, '#c8b898');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.15;
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#a09078';
        ctx.fillRect(0, y, w, 2);
      }
      ctx.globalAlpha = 1;
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.02 });
  }

  if (id === 'mercury' || id === 'moon' || id === 'callisto') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.35);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.94, metalness: 0.01 });
  }

  if (id === 'titan') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h * 0.7);
      g.addColorStop(0, '#c9a06a');
      g.addColorStop(0.45, '#8a6a3d');
      g.addColorStop(1, '#4a3828');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.12);
      ctx.fillStyle = 'rgba(40,55,70,0.18)';
      for (let i = 0; i < 24; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, w * 0.35, 2 + Math.random() * 3);
      }
    }, 384, 192);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0.02 });
  }

  if (id === 'rhea' || id === 'dione') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = id === 'dione' ? '#d8e4f0' : '#c8ccd4';
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.1);
      ctx.fillStyle = 'rgba(90,100,115,0.2)';
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 256, 128);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.03 });
  }

  if (id === 'iapetus') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#6a5a52';
      ctx.fillRect(0, 0, w * 0.52, h);
      ctx.fillStyle = '#dcd8d4';
      ctx.fillRect(w * 0.48, 0, w * 0.52, h);
      noiseRoughness(ctx, w, h, 0.08);
      ctx.strokeStyle = 'rgba(50,45,40,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
    }, 256, 128);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0.02 });
  }

  if (id === 'uranus' || id === 'neptune') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.55);
      if (id === 'uranus') {
        g.addColorStop(0, '#b8dfe8');
        g.addColorStop(1, '#4a8a9a');
      } else {
        g.addColorStop(0, '#6a8ce0');
        g.addColorStop(1, '#1a2a70');
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.08);
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.06 });
  }

  if (id === 'pluto') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#a89888';
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.2);
      ctx.fillStyle = 'rgba(60,50,45,0.25)';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 20, 12);
      }
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
  }

  if (id === 'io' || id === 'europa' || id === 'ganymede') {
    const map = canvasTexture((ctx, w, h) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      noiseRoughness(ctx, w, h, 0.22);
    }, 256, 128);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0.02 });
  }

  if (id === 'comet') {
    const map = canvasTexture((ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.48);
      g.addColorStop(0, '#f8f8ff');
      g.addColorStop(0.25, '#c8d8f0');
      g.addColorStop(0.55, '#7890b0');
      g.addColorStop(1, '#303848');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, 128, 128);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.45,
      metalness: 0.1,
      emissive: new THREE.Color(0x223344),
      emissiveIntensity: 0.15,
    });
  }

  /* default rocky / small */
  const map = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
    noiseRoughness(ctx, w, h, 0.18);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0.03 });
}

export function disposePlanetMaterial(mat: THREE.Material) {
  if (!(mat instanceof THREE.MeshStandardMaterial)) {
    mat.dispose();
    return;
  }
  if (mat.emissiveMap && mat.emissiveMap === mat.map) {
    mat.emissiveMap = null;
  }
  mat.map?.dispose();
  mat.emissiveMap?.dispose();
  mat.normalMap?.dispose();
  mat.roughnessMap?.dispose();
  mat.dispose();
}
