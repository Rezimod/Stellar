// Real models come in as glTF: one loader, one decoded copy per URL, and a
// count of who is using it, so a surface that leaves takes its models' GPU
// memory with it and a surface that stays keeps them. Files are meshopt
// compressed with WebP textures (see assets-src/README.md).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface ModelHandle {
  /** The shared scene; clone it before changing transforms or materials. */
  scene: THREE.Group;
  release: () => void;
}

interface Entry {
  promise: Promise<THREE.Group>;
  users: number;
}

const cache = new Map<string, Entry>();
let loader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

function disposeTree(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m);
  });
  for (const m of materials) {
    for (const v of Object.values(m)) if ((v as THREE.Texture)?.isTexture) (v as THREE.Texture).dispose();
    m.dispose();
  }
}

/** Quantised files carry their scale on the nodes; bake every node's
 *  transform into its geometry so a mesh can be instanced on its own. */
function flatten(scene: THREE.Group): THREE.Group {
  scene.updateMatrixWorld(true);
  const flat = new THREE.Group();
  flat.name = scene.name;
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const mesh of meshes) {
    mesh.geometry.applyMatrix4(mesh.matrixWorld);
    mesh.geometry.computeBoundingSphere();
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    flat.add(mesh);
  }
  return flat;
}

/** Load (or share) a model. Every `acquire` must be matched by one `release`.
 *  `keepNodes` leaves the node tree as exported: skinned meshes, and named
 *  empties a caller reads positions from, need it. */
export function acquireModel(url: string, keepNodes = false): Promise<ModelHandle> {
  const key = keepNodes ? `${url}#nodes` : url;
  let entry = cache.get(key);
  if (!entry) {
    entry = { users: 0, promise: getLoader().loadAsync(url).then((g) => (keepNodes ? g.scene : flatten(g.scene))) };
    cache.set(key, entry);
  }
  const e = entry;
  e.users += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    e.users -= 1;
    if (e.users > 0) return;
    cache.delete(key);
    e.promise.then(disposeTree, () => undefined);
  };
  return e.promise.then((scene) => ({ scene, release }), (err: unknown) => { release(); throw err; });
}

/** How many models are held right now; the memory test reads it. */
export function loadedModelCount(): number {
  return cache.size;
}

/** The full-detail mesh of a model (the one not named as a LOD), for an instanced prop. */
export function firstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => { if (!found && (o as THREE.Mesh).isMesh && !/_LOD\d$/.test(o.name)) found = o as THREE.Mesh; });
  return found;
}
