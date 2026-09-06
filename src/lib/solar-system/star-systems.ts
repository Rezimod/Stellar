// The next star over: Alpha Centauri, built at its real place in the sky
// (the nearby-star catalogue puts it 1.34 pc from the Sun) so the hyperdrive
// has somewhere to go. A is a Sun twin and borrows the Sun's photosphere
// shader and corona; B is the orange K1 companion; Proxima is the red dwarf
// out on the far side, carrying the rocky Proxima b. Sizes use the same
// radius law as the planets, so the stars dwarf the fighter the way the
// Sun does.

import * as THREE from 'three';
import { nearbyStarPosition } from '@/lib/solar-system/galactic-scene';
import { makeSunExtras, type SunExtrasHandle } from '@/lib/solar-system/scene-extras';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import type { FlightAnchor, FlightBody } from '@/lib/solar-system/player-ship';

const R_SUN_KM = 696_000;
const R_EARTH_KM = 6371;
/** Same law as `worldRadiusForBody`, taking a radius in km. */
const sceneRadius = (km: number) => 0.028 * Math.pow(km / R_EARTH_KM, 0.36);

export interface StarSystemHandle {
  group: THREE.Group;
  center: THREE.Vector3;
  bodies: FlightBody[];
  /** Where a jump drops out: a few radii short of A, nose on the star. */
  arrival: FlightAnchor;
  update: (dtSec: number, cameraPos: THREE.Vector3, camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}

export function makeAlphaCentauri(sunMaterial: THREE.Material, lite: boolean): StarSystemHandle {
  const group = new THREE.Group();
  group.name = 'alphaCentauri';
  const center = nearbyStarPosition('rigil') ?? new THREE.Vector3(-14, -25, 8);
  group.position.copy(center);

  const segs = lite ? 48 : 80;
  const glowTex = softSpriteTexture();
  const owned: THREE.Material[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  const bodies: FlightBody[] = [];

  const addBody = (
    id: string, local: THREE.Vector3, radiusKm: number, surfaceG: number, atmosphere: number,
    material: THREE.Material, glow: { color: THREE.Color; scale: number } | null,
  ) => {
    const r = sceneRadius(radiusKm);
    const geom = new THREE.SphereGeometry(r, segs, segs);
    geoms.push(geom);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(local);
    group.add(mesh);
    if (glow) {
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: glow.color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      owned.push(mat);
      const s = new THREE.Sprite(mat);
      s.position.copy(local);
      s.scale.setScalar(r * glow.scale);
      group.add(s);
    }
    const body: FlightBody = {
      id,
      position: local.clone().add(center),
      radius: r,
      radiusKm,
      surfaceG,
      atmosphere,
    };
    bodies.push(body);
    return { mesh, body };
  };

  // Alpha Centauri A — G2V, 1.22 R☉. Same shader as the Sun, same corona.
  const a = addBody('alphaCenA', new THREE.Vector3(0, 0, 0), 1.22 * R_SUN_KM, 274, 1.5, sunMaterial, null);
  const coronaA: SunExtrasHandle = makeSunExtras(a.body.radius);
  group.add(coronaA.group);
  coronaA.group.position.set(0, 0, 0);
  const lightA = new THREE.PointLight(0xfff4e0, 5.4, 14, 1.1);
  group.add(lightA);

  // Alpha Centauri B — K1V, 0.86 R☉, orange. The pair's 23 AU mean
  // separation is compressed the way the planets' orbits are.
  const matB = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.15, 0.5) });
  owned.push(matB);
  addBody('alphaCenB', new THREE.Vector3(1.15, 0.06, 0.42), 0.86 * R_SUN_KM, 274, 1.5, matB, {
    color: new THREE.Color(1.0, 0.62, 0.3), scale: 7,
  });

  // Proxima Centauri — M5.5V red dwarf, 0.154 R☉, well out from the pair.
  const matP = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.5, 0.28) });
  owned.push(matP);
  const proximaLocal = new THREE.Vector3(-2.6, -0.5, 1.6);
  addBody('proxima', proximaLocal, 0.154 * R_SUN_KM, 274, 1.5, matP, {
    color: new THREE.Color(1.0, 0.4, 0.22), scale: 6,
  });
  const lightP = new THREE.PointLight(0xff7a48, 2.4, 2.2, 1.1);
  lightP.position.copy(proximaLocal);
  group.add(lightP);

  // Proxima b — a rocky world of 1.07 R⊕ in an 11-day orbit, tidally close.
  const matPb = new THREE.MeshStandardMaterial({ color: 0x8c5e4c, roughness: 0.92, metalness: 0.05 });
  owned.push(matPb);
  const PB_ORBIT = 0.24;
  const pbLocal = proximaLocal.clone().add(new THREE.Vector3(PB_ORBIT, 0, 0));
  const pb = addBody('proximaB', pbLocal, 1.07 * R_EARTH_KM, 11.2, 1.2, matPb, null);
  let pbAngle = 0;

  // Drop out of hyperspace twelve radii short of A on the side away from B,
  // nose on the star, so the pair reads as A in front and B beyond it.
  const awayFromB = new THREE.Vector3(1.15, 0.06, 0.42).normalize().negate();
  const arrival: FlightAnchor = {
    position: center.clone().addScaledVector(awayFromB, a.body.radius * 12).add(new THREE.Vector3(0, a.body.radius * 2, 0)),
    lookAt: center.clone(),
    yaw: 0.3,
  };

  return {
    group,
    center,
    bodies,
    arrival,
    update(dtSec, cameraPos, camera) {
      coronaA.update(cameraPos, center, dtSec, camera);
      // The corona group is a child here, so undo the world position it sets.
      coronaA.group.position.set(0, 0, 0);
      pbAngle += dtSec * 0.06;
      pb.mesh.position.set(
        proximaLocal.x + Math.cos(pbAngle) * PB_ORBIT,
        proximaLocal.y,
        proximaLocal.z + Math.sin(pbAngle) * PB_ORBIT,
      );
      pb.mesh.rotation.y = pbAngle;
      pb.body.position.copy(pb.mesh.position).add(center);
    },
    dispose() {
      coronaA.dispose();
      lightA.dispose();
      lightP.dispose();
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
    },
  };
}
