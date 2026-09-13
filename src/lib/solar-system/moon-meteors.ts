// Meteoroids. Every minute or so one comes in fast and low from a random
// bearing, hits open ground well away from the cosmonaut and the base, and
// leaves a crater that stays. Flash, ejecta, a ground thump through the
// boots (you cannot hear it — there is no air — so the sound is felt more
// than heard), and the HUD names the distance.

import * as THREE from 'three';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';
import type { DustHandle } from '@/lib/solar-system/moon-fx';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';

export interface MeteorEvent {
  x: number;
  z: number;
  distance: number;
}

export interface MeteorHandle {
  group: THREE.Group;
  /** Camera shake amplitude this frame, 0..1. */
  shake: number;
  nudge: () => void;
  update: (dt: number, playerX: number, playerZ: number) => MeteorEvent | null;
  dispose: () => void;
}

interface Params {
  heightAt: (x: number, z: number) => number;
  stampCrater: (x: number, z: number, r: number, depth: number) => void;
  dust: DustHandle;
  colliders: Collider[];
  walkRadius: number;
  /** First impact after this many seconds, then every `every` ± spread. */
  first: number;
  every: number;
}

const SPEED = 160;
const SAFE_FROM_PLAYER = 26;
const SAFE_FROM_BASE = 14;

export function makeMeteors(p: Params): MeteorHandle {
  const group = new THREE.Group();
  group.name = 'meteors';
  const glowTex = softSpriteTexture();
  const headMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1cf, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const head = new THREE.Sprite(headMat);
  head.scale.setScalar(2.4);
  group.add(head);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const trailGeom = new THREE.CylinderGeometry(0.08, 0.5, 26, 8, 1, true);
  trailGeom.translate(0, 13, 0);
  const trail = new THREE.Mesh(trailGeom, trailMat);
  group.add(trail);
  const flashMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Sprite(flashMat);
  group.add(flash);
  const light = new THREE.PointLight(0xffd9a0, 0, 60, 1.6);
  group.add(light);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9 }));
  rock.visible = false;
  group.add(rock);

  let timer = p.first;
  let flying = false;
  let flightT = 0;
  let flightDur = 0;
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let flashT = -1;
  let craterR = 3;
  let audioCtx: AudioContext | null = null;

  const thump = (distance: number) => {
    try {
      if (!audioCtx) audioCtx = new AudioContext();
      const c = audioCtx;
      if (c.state === 'suspended') void c.resume();
      const gain = c.createGain();
      const g = 0.16 * Math.max(0.08, 1 - distance / 160);
      gain.gain.setValueAtTime(g, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.4);
      gain.connect(c.destination);
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(58, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(24, c.currentTime + 1.2);
      osc.connect(gain);
      osc.start();
      osc.stop(c.currentTime + 1.4);
      const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      noise.connect(lp);
      lp.connect(gain);
      noise.start();
    } catch {
      // No audio — the ground still shakes.
    }
  };

  const pickTarget = (px: number, pz: number): boolean => {
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = SAFE_FROM_PLAYER + 6 + Math.random() * 90;
      const x = px + Math.sin(a) * d;
      const z = pz + Math.cos(a) * d;
      if (Math.hypot(x, z) > p.walkRadius - 8) continue;
      let clear = true;
      for (const c of p.colliders) {
        if (Math.hypot(x - c.x, z - c.z) < c.r + SAFE_FROM_BASE) { clear = false; break; }
      }
      if (!clear) continue;
      to.set(x, p.heightAt(x, z), z);
      return true;
    }
    return false;
  };

  const handle: MeteorHandle = {
    group,
    shake: 0,
    nudge() { timer = 0; },
    update(dt, px, pz) {
      handle.shake *= Math.exp(-dt * 3);
      let event: MeteorEvent | null = null;
      if (flashT >= 0) {
        flashT += dt;
        const k = Math.max(0, 1 - flashT / 0.55);
        flashMat.opacity = k * k;
        flash.scale.setScalar(6 + (1 - k) * 22);
        light.intensity = 900 * k * k;
        if (flashT > 0.6) { flashT = -1; flashMat.opacity = 0; light.intensity = 0; }
      }
      if (!flying) {
        timer -= dt;
        if (timer <= 0) {
          if (pickTarget(px, pz)) {
            // Come in from a random bearing, 35–60° above the horizon.
            const a = Math.random() * Math.PI * 2;
            const el = 0.6 + Math.random() * 0.45;
            const range = 420;
            from.set(to.x + Math.sin(a) * Math.cos(el) * range, to.y + Math.sin(el) * range, to.z + Math.cos(a) * Math.cos(el) * range);
            dir.copy(to).sub(from).normalize();
            flightDur = range / SPEED;
            flightT = 0;
            flying = true;
            craterR = 2.2 + Math.random() * 2.2;
            headMat.opacity = 1;
            trailMat.opacity = 0.7;
            rock.visible = true;
            trail.quaternion.setFromUnitVectors(up, dir.clone().negate());
          }
          timer = p.every * (0.7 + Math.random() * 0.6);
        }
      } else {
        flightT += dt;
        const t = Math.min(1, flightT / flightDur);
        pos.copy(from).lerp(to, t);
        head.position.copy(pos);
        trail.position.copy(pos);
        rock.position.copy(pos);
        rock.rotation.x += dt * 9;
        rock.rotation.y += dt * 7;
        light.position.copy(pos);
        light.intensity = 60;
        if (t >= 1) {
          flying = false;
          headMat.opacity = 0;
          trailMat.opacity = 0;
          rock.visible = false;
          flash.position.set(to.x, to.y + 1.2, to.z);
          light.position.set(to.x, to.y + 2, to.z);
          flashT = 0;
          const depth = craterR * 0.3;
          p.stampCrater(to.x, to.z, craterR, depth);
          p.dust.burst({ x: to.x, y: to.y, z: to.z, count: 240, speedMin: 5, speedMax: 19, cone: 0.9, size: 0.34, brightness: 1.15 });
          p.dust.burst({ x: to.x, y: to.y, z: to.z, count: 120, speedMin: 2, speedMax: 6, cone: 1.4, size: 0.5, brightness: 0.9 });
          const distance = Math.hypot(to.x - px, to.z - pz);
          handle.shake = Math.max(0.1, 1 - distance / 130);
          thump(distance);
          event = { x: to.x, z: to.z, distance };
        }
      }
      return event;
    },
    dispose() {
      headMat.dispose(); trailMat.dispose(); trailGeom.dispose(); flashMat.dispose();
      rock.geometry.dispose(); (rock.material as THREE.Material).dispose();
      if (audioCtx) void audioCtx.close();
    },
  };
  return handle;
}
