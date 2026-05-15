import * as THREE from 'three';

const SRGB = THREE.SRGBColorSpace;

/** Cassini-style ring color + alpha (2048×125), Solar System Scope / NASA-derived. */
export const SATURN_RING_TEXTURE_URL = '/solar-system/planets/saturn-rings.png';

let ringTexCache: THREE.Texture | null = null;
let ringLoadPromise: Promise<THREE.Texture> | null = null;

export function loadSaturnRingTexture(
  loader: THREE.TextureLoader,
  maxAniso: number,
): Promise<THREE.Texture> {
  if (ringTexCache) return Promise.resolve(ringTexCache);
  if (ringLoadPromise) return ringLoadPromise;

  ringLoadPromise = new Promise((resolve, reject) => {
    loader.load(
      SATURN_RING_TEXTURE_URL,
      (tex) => {
        tex.colorSpace = SRGB;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = Math.min(16, maxAniso);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        ringTexCache = tex;
        resolve(tex);
      },
      undefined,
      (err) => {
        ringLoadPromise = null;
        reject(err);
      },
    );
  });

  return ringLoadPromise;
}

export function getSaturnRingTexture(): THREE.Texture | null {
  return ringTexCache;
}

export function createSaturnRingMaterial(
  ringTex: THREE.Texture,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: ringTex,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.92,
    metalness: 0.04,
    alphaTest: 0.04,
  });
}

export function disposeSaturnRingMaterial(mat: THREE.Material) {
  if (mat instanceof THREE.MeshStandardMaterial && mat.map === ringTexCache) {
    mat.map = null;
  }
  mat.dispose();
}

export function applySaturnRingTexture(mesh: THREE.Object3D, ringTex: THREE.Texture) {
  const mat = createSaturnRingMaterial(ringTex);
  for (const name of ['saturnRing', 'saturnRingBack'] as const) {
    const ring = mesh.getObjectByName(name);
    if (ring instanceof THREE.Mesh) {
      const prev = ring.material;
      if (prev instanceof THREE.Material && prev !== mat) {
        if (Array.isArray(prev)) prev.forEach(disposeSaturnRingMaterial);
        else disposeSaturnRingMaterial(prev);
      }
      ring.material = name === 'saturnRingBack' ? mat.clone() : mat;
    }
  }
}

export function disposeSaturnRingTexture() {
  ringTexCache?.dispose();
  ringTexCache = null;
  ringLoadPromise = null;
}
