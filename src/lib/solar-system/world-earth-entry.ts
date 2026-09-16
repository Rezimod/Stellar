// The last of the way in: the vehicle comes over the Caucasus in the plasma
// off its heat shield, the air shaking it, slows to the speed of a falling
// stone over Tbilisi, drops the shield, and hands over to the powered
// descent at the height the lander starts from. About ten seconds; nobody
// flies it.

import * as THREE from 'three';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';

export const ENTRY_SECONDS = 10;
const SHIELD_DROP = 0.72;

export interface EarthEntry {
  group: THREE.Group;
  /** 0…1 through the entry; 1 when the descent can start. */
  progress: number;
  /** Heating, 0…1: plasma, shake and roar. */
  heat: number;
  done: boolean;
  /** Where the camera should sit and look this frame. */
  cameraFrom: THREE.Vector3;
  cameraAt: THREE.Vector3;
  update: (dt: number) => void;
  skip: () => void;
  dispose: () => void;
}

/**
 * `vehicle` is moved from high up the approach to `handover` (where the
 * powered descent begins), along `approach` (a horizontal unit direction of travel).
 */
export function makeEarthEntry(vehicle: THREE.Object3D, handover: THREE.Vector3, approach: THREE.Vector3): EarthEntry {
  const group = new THREE.Group();
  group.name = 'earth-entry';
  const glowTex = softSpriteTexture();
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.9, metalness: 0.1, emissive: new THREE.Color(1, 0.4, 0.1), emissiveIntensity: 0 });
  const shieldGeom = new THREE.SphereGeometry(3.4, 24, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);
  const shield = new THREE.Mesh(shieldGeom, shieldMat);
  shield.castShadow = true;
  group.add(shield);
  const plasmaMat = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 0.7, 0.35), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const plasma = new THREE.Sprite(plasmaMat);
  plasma.scale.setScalar(22);
  group.add(plasma);
  const trailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.55, 0.25), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const trailGeom = new THREE.ConeGeometry(3.2, 60, 16, 1, true);
  trailGeom.translate(0, 30, 0);
  const trail = new THREE.Mesh(trailGeom, trailMat);
  group.add(trail);

  const start = handover.clone().addScaledVector(approach, -8200).setY(handover.y + 7400);
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const shieldFall = new THREE.Vector3();
  let t = 0;
  let shake = 0;
  const handle: EarthEntry = {
    group, progress: 0, heat: 0, done: false,
    cameraFrom: new THREE.Vector3(), cameraAt: new THREE.Vector3(),
    update(dt) {
      if (handle.done) return;
      t += dt;
      const k = Math.min(1, t / ENTRY_SECONDS);
      handle.progress = k;
      // Fast then slow: the air takes most of the speed in the first half.
      const e = 1 - Math.pow(1 - k, 2.6);
      prev.copy(pos);
      pos.lerpVectors(start, handover, e);
      // The path bows: shallow high up, steeper as it slows.
      pos.y += Math.sin(e * Math.PI) * 900 * (1 - e);
      if (t > dt) vel.subVectors(pos, prev).divideScalar(Math.max(dt, 1e-3));
      handle.heat = THREE.MathUtils.smoothstep(k, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(k, 0.35, 0.68));
      shake += dt * 40;
      const jitter = handle.heat * 1.2;
      vehicle.position.copy(pos);
      vehicle.position.x += Math.sin(shake * 1.3) * jitter;
      vehicle.position.y += Math.sin(shake * 1.7 + 1) * jitter * 0.6;
      // Blunt end first into the air.
      const speed = vel.length();
      if (speed > 1) {
        const dir = vel.clone().divideScalar(speed);
        vehicle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        vehicle.quaternion.slerp(new THREE.Quaternion(), THREE.MathUtils.smoothstep(k, 0.6, 0.95));
        trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      }
      if (k < SHIELD_DROP) {
        shield.position.copy(vehicle.position).add(new THREE.Vector3(0, -0.4, 0).applyQuaternion(vehicle.quaternion));
        shield.quaternion.copy(vehicle.quaternion);
        shieldFall.copy(vel);
      } else {
        // Shield away: it tumbles off below.
        shieldFall.y -= 9.81 * dt;
        shield.position.addScaledVector(shieldFall, dt * 0.55);
        shield.rotation.x += dt * 2.2;
      }
      shieldMat.emissiveIntensity = handle.heat * 3.5;
      plasma.position.copy(vehicle.position).addScaledVector(vel.clone().normalize(), 3);
      plasmaMat.opacity = handle.heat;
      plasma.scale.setScalar(14 + handle.heat * 18);
      trail.position.copy(vehicle.position);
      trailMat.opacity = handle.heat * 0.55;
      // The camera rides above and behind, looking along the way down at the city.
      const back = speed > 1 ? vel.clone().setY(0).normalize() : approach;
      handle.cameraFrom.copy(vehicle.position).addScaledVector(back, -38 - 30 * (1 - k)).add(new THREE.Vector3(0, 14 + 8 * (1 - k), 0));
      handle.cameraAt.copy(vehicle.position).addScaledVector(back, 60).add(new THREE.Vector3(0, -40, 0));
      if (k >= 1) {
        handle.done = true;
        handle.heat = 0;
        vehicle.position.copy(handover);
        vehicle.quaternion.identity();
        group.visible = false;
      }
    },
    skip() {
      t = ENTRY_SECONDS;
      handle.update(0.0001);
    },
    dispose() {
      shieldGeom.dispose(); shieldMat.dispose(); plasmaMat.dispose(); trailGeom.dispose(); trailMat.dispose();
    },
  };
  pos.copy(start);
  return handle;
}
