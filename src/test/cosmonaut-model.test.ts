import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

// A stand-in for cosmonaut.glb: one skinned vertex on the right forearm and
// one rigid helmet vertex, both in rest-pose space as the Blender export is.
vi.mock('@/game/models', () => ({
  acquireModel: async () => {
    const scene = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0.34, 1.0, 0.05], 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
    const bone = new THREE.Bone();
    bone.name = 'elbow1';
    const body = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial());
    body.name = 'Body';
    body.bind(new THREE.Skeleton([bone]));
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.89, 0.2], 3));
    const helmet = new THREE.Mesh(hg, new THREE.MeshStandardMaterial());
    helmet.name = 'Helmet';
    scene.add(body, helmet);
    return { scene, release: () => undefined };
  },
}));

describe('the cosmonaut model on the rig', () => {
  it('moves a skinned vertex with its joint and the helmet with the neck', async () => {
    const { buildSuit } = await import('@/lib/solar-system/moon-suit-mesh');
    const rig = buildSuit(false);
    await rig.ready;
    rig.group.position.set(5, 2, -3);
    rig.group.rotation.y = 0.7;
    rig.elbows[1].rotation.x = -0.9;
    rig.shoulders[1].rotation.z = 0.3;
    rig.neck.rotation.set(-0.2, 0.5, 0);
    rig.group.updateMatrixWorld(true);

    let skinned: THREE.SkinnedMesh | undefined;
    let helmet: THREE.Mesh | undefined;
    rig.group.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
      else if ((o as THREE.Mesh).isMesh && o.parent === rig.helmet) helmet = o as THREE.Mesh;
    });
    skinned!.skeleton.update();
    const got = skinned!.getVertexPosition(0, new THREE.Vector3()).applyMatrix4(skinned!.matrixWorld);
    // Rest elbow pivot: chest 1.11 + shoulder 0.4 − 0.34 = 1.17, at x 0.34.
    const want = rig.elbows[1].localToWorld(new THREE.Vector3(0, 1.0 - 1.17, 0.05));
    expect(got.distanceTo(want)).toBeLessThan(1e-5);

    const h = new THREE.Vector3(0, 1.89, 0.2).applyMatrix4(helmet!.matrixWorld);
    const hw = rig.neck.localToWorld(new THREE.Vector3(0, 1.89 - 1.69, 0.2 - 0.01));
    expect(h.distanceTo(hw)).toBeLessThan(1e-5);
    rig.dispose();
  });
});
