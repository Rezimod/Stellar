// Player fighter for Explore Mode — arcade flight through the solar system,
// green lasers, and a follow camera. Everything here is scene-scale: the
// spec's flight numbers (15-unit camera offset, 2.5 u/s cruise, 8 u/s bolts)
// are expressed in "flight units" of FLIGHT_UNIT scene units, because the
// ephemeris scene is tiny (Earth radius ≈ 0.028, alien saucer ≈ 0.012).
// Earth → Mars at full boost still takes ~45 s at typical separations.

import * as THREE from 'three';
import type { AlienHandle } from '@/lib/solar-system/aliens';
import { softSpriteTexture } from '@/lib/solar-system/soft-sprite';

export const FLIGHT_UNIT = 0.006;
const U = FLIGHT_UNIT;

const MAX_SPEED = 2.5 * U;
const BOOST_SPEED = 5.0 * U;
const THRUST_ACCEL = 14 * U;
const DRAG_PER_FRAME = 0.92; // at 60 fps; applied as pow(0.92, dt·60)
const CAM_BACK = 15 * U;
const CAM_UP = 4 * U;
const CAM_LERP = 0.08; // per 60 fps frame
const YAW_RATE = 1.5;
const PITCH_RATE = 1.3;
const ROLL_RATE = 2.2;
const MOUSE_SENS = 0.0022; // rad per px
// Spec: 8 u/s for 0.4 s — that's a 3.2-unit reach, shorter than the camera
// offset, so nothing past the nose could ever be hit. Bolts fly faster and
// live a little longer so the alien attack tracks (6–15 flight units out)
// are inside range.
const BOLT_SPEED = 24 * U;
const BOLT_LIFE = 0.8;
const BOLT_POOL = 12;
const FIRE_INTERVAL = 0.16;
const MAX_HP = 100;
const RESPAWN_DELAY = 1.6;
const RADAR_RANGE = 60 * U;
export const RADAR_MAX = 16;

export interface FlightInput {
  /** -1..1, forward positive. */
  thrust: number;
  /** -1..1, right positive (keys / left stick). */
  yaw: number;
  /** -1..1, right positive (right stick). */
  lookYaw: number;
  /** -1..1, nose-up positive. */
  pitch: number;
  /** -1..1, roll-right positive. */
  roll: number;
  boost: boolean;
  fire: boolean;
  /** Accumulated pointer deltas (px) since the last frame. */
  mouseDX: number;
  mouseDY: number;
}

export interface FlightTelemetry {
  /** Flight units per second. */
  speed: number;
  hp: number;
  maxHp: number;
  boost: boolean;
  /** Radar contacts as (x, y) pairs in [-1, 1] — right / ahead positive. */
  radar: Float32Array;
  radarCount: number;
  /** 1 right after taking damage, decays to 0. */
  hitFlash: number;
  kills: number;
  /** Seconds left until respawn; 0 while flying. */
  respawnIn: number;
}

export interface FlightSession {
  /** Set by the overlay; the canvas spawns / tears down the ship on change. */
  active: boolean;
  input: FlightInput;
  telemetry: FlightTelemetry;
}

export function clearFlightInput(input: FlightInput) {
  input.thrust = 0;
  input.yaw = 0;
  input.lookYaw = 0;
  input.pitch = 0;
  input.roll = 0;
  input.boost = false;
  input.fire = false;
  input.mouseDX = 0;
  input.mouseDY = 0;
}

export function createFlightSession(): FlightSession {
  return {
    active: false,
    input: {
      thrust: 0, yaw: 0, lookYaw: 0, pitch: 0, roll: 0,
      boost: false, fire: false, mouseDX: 0, mouseDY: 0,
    },
    telemetry: {
      speed: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      boost: false,
      radar: new Float32Array(RADAR_MAX * 2),
      radarCount: 0,
      hitFlash: 0,
      kills: 0,
      respawnIn: 0,
    },
  };
}

/* ───────────────────────── desktop controls ───────────────────────── */

const HANDLED_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
]);

/**
 * Keyboard + pointer-lock mouse. Must be called from a user gesture so the
 * lock request is honoured; returns the detach function. `onExit` fires on
 * ESC / X, or when a held pointer lock is released by the browser.
 */
export function attachDesktopControls(
  session: FlightSession,
  lockTarget: HTMLElement,
  onExit: () => void,
): () => void {
  const input = session.input;
  const pressed = new Set<string>();
  const sync = () => {
    const has = (c: string) => pressed.has(c);
    input.thrust = (has('KeyW') || has('ArrowUp') ? 1 : 0) - (has('KeyS') || has('ArrowDown') ? 1 : 0);
    input.yaw = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
    input.roll = (has('KeyE') ? 1 : 0) - (has('KeyQ') ? 1 : 0);
    input.boost = has('ShiftLeft') || has('ShiftRight');
    input.fire = has('Space');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyX') {
      onExit();
      return;
    }
    if (!HANDLED_KEYS.has(e.code)) return;
    e.preventDefault();
    pressed.add(e.code);
    sync();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!pressed.delete(e.code)) return;
    sync();
  };
  const onMouseMove = (e: MouseEvent) => {
    input.mouseDX += e.movementX;
    input.mouseDY += e.movementY;
  };
  const onBlur = () => {
    pressed.clear();
    sync();
  };
  let lockHeld = false;
  const onLockChange = () => {
    if (document.pointerLockElement === lockTarget) {
      lockHeld = true;
    } else if (lockHeld) {
      lockHeld = false;
      onExit();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('blur', onBlur);
  document.addEventListener('pointerlockchange', onLockChange);
  try {
    const req = lockTarget.requestPointerLock() as unknown;
    if (req instanceof Promise) req.catch(() => undefined);
  } catch {
    // Pointer lock is optional — movementX/Y still steer without it.
  }
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('pointerlockchange', onLockChange);
    lockHeld = false;
    if (document.pointerLockElement === lockTarget) document.exitPointerLock();
    clearFlightInput(input);
  };
}

/* ───────────────────────── ship geometry ───────────────────────── */

interface ShipParts {
  group: THREE.Group;
  engineMat: THREE.MeshStandardMaterial;
  glowMats: THREE.SpriteMaterial[];
  glowSprites: THREE.Sprite[];
}

/** Sleek fighter from primitives. Forward is +Z (same as the alien ships). */
function buildShip(): ShipParts {
  const group = new THREE.Group();
  group.name = 'playerShip';
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xb4c0ce, roughness: 0.42, metalness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.6, metalness: 0.4 });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x9fe8ff,
    emissive: new THREE.Color(0x3fd8ff),
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * U, 0.46 * U, 2.6 * U, 14), hullMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34 * U, 1.5 * U, 14), hullMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 2.05 * U;
  group.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.26 * U, 12, 8), darkMat);
  canopy.scale.set(1, 0.7, 1.8);
  canopy.position.set(0, 0.3 * U, 0.5 * U);
  group.add(canopy);

  const wingGeom = new THREE.BoxGeometry(2.7 * U, 0.06 * U, 0.95 * U);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeom, hullMat);
    wing.position.set(side * 1.5 * U, -0.05 * U, -0.35 * U);
    // Swept back 30°: the outer tip trails behind the root.
    wing.rotation.y = side * (Math.PI / 6);
    group.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08 * U, 0.34 * U, 0.6 * U), darkMat);
    tip.position.set(side * 2.75 * U, 0.08 * U, -1.05 * U);
    group.add(tip);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06 * U, 0.75 * U, 0.85 * U), darkMat);
  fin.position.set(0, 0.45 * U, -1.0 * U);
  group.add(fin);

  const podGeom = new THREE.CylinderGeometry(0.27 * U, 0.32 * U, 1.3 * U, 12);
  const glowGeom = new THREE.SphereGeometry(0.25 * U, 12, 10);
  const glowTex = softSpriteTexture();
  const glowMats: THREE.SpriteMaterial[] = [];
  const glowSprites: THREE.Sprite[] = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(podGeom, darkMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.78 * U, -0.08 * U, -1.15 * U);
    group.add(pod);
    const glow = new THREE.Mesh(glowGeom, engineMat);
    glow.position.set(side * 0.78 * U, -0.08 * U, -1.82 * U);
    group.add(glow);
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x5fe0ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(glow.position);
    sprite.scale.setScalar(1.1 * U);
    group.add(sprite);
    glowMats.push(mat);
    glowSprites.push(sprite);
  }
  return { group, engineMat, glowMats, glowSprites };
}

/* ───────────────────────── laser audio ───────────────────────── */

function makeLaserAudio() {
  let ctx: AudioContext | null = null;
  return {
    play() {
      try {
        if (!ctx) ctx = new AudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.16, t0);
        gain.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(t0);
        osc.stop(t0 + 0.085);
      } catch {
        // No audio available (autoplay policy, missing API) — lasers stay silent.
      }
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}

/* ───────────────────────── ship runtime ───────────────────────── */

export interface PlayerShipHandle {
  group: THREE.Group;
  /** Bolts fly in world space — add this to the scene beside `group`. */
  boltGroup: THREE.Group;
  /** Place the ship a few Earth radii out with the planet framed ahead. */
  spawn: (earthPos: THREE.Vector3 | null) => void;
  takeDamage: (amount: number) => void;
  update: (
    dtSec: number,
    timeSec: number,
    camera: THREE.PerspectiveCamera,
    aliens: AlienHandle,
    earthPos: THREE.Vector3 | null,
  ) => void;
  dispose: () => void;
}

interface Bolt {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  life: number; // <0 idle
}

export function createPlayerShip(session: FlightSession): PlayerShipHandle {
  const { group, engineMat, glowMats, glowSprites } = buildShip();
  const tel = session.telemetry;
  const input = session.input;
  const audio = makeLaserAudio();

  // Pooled bolts — HDR green so the bloom pass lights them up.
  const boltGeom = new THREE.CylinderGeometry(0.06 * U, 0.06 * U, 1.8 * U, 6);
  boltGeom.rotateX(Math.PI / 2); // along +Z
  const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 2.4, 0.7) });
  const bolts: Bolt[] = [];
  const boltGroup = new THREE.Group();
  boltGroup.name = 'playerBolts';
  for (let i = 0; i < BOLT_POOL; i++) {
    const mesh = new THREE.Mesh(boltGeom, boltMat);
    mesh.visible = false;
    boltGroup.add(mesh);
    bolts.push({ mesh, dir: new THREE.Vector3(), life: -1 });
  }

  const vel = new THREE.Vector3();
  const angVel = new THREE.Vector3();
  const angTarget = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camUp = new THREE.Vector3(0, 1, 0);
  const lookPt = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const invQ = new THREE.Quaternion();
  let pendYaw = 0;
  let pendPitch = 0;
  let fireAcc = 0;
  let fireSide = 1;
  let hp = MAX_HP;
  let respawnIn = 0;
  let snapCamera = true;

  const fire = () => {
    const b = bolts.find((x) => x.life < 0);
    if (!b) return;
    fireSide = -fireSide;
    right.set(1, 0, 0).applyQuaternion(group.quaternion);
    b.mesh.position.copy(group.position)
      .addScaledVector(right, fireSide * 1.7 * U)
      .addScaledVector(fwd, 1.2 * U);
    b.mesh.quaternion.copy(group.quaternion);
    b.dir.copy(fwd);
    b.life = 0;
    b.mesh.visible = true;
    audio.play();
  };

  const spawn = (earthPos: THREE.Vector3 | null) => {
    const anchor = earthPos ?? tmp.set(1, 0, 0);
    // Tangential offset a few Earth radii out, slightly above the ecliptic.
    right.copy(anchor).normalize();
    up.set(0, 1, 0);
    fwd.crossVectors(up, right).normalize();
    group.position.copy(anchor).addScaledVector(fwd, 0.14).addScaledVector(up, 0.03);
    group.lookAt(anchor);
    group.rotateY(0.45); // Earth sits ahead and to one side of the nose
    vel.set(0, 0, 0);
    angVel.set(0, 0, 0);
    pendYaw = pendPitch = 0;
    // Pointer deltas that piled up during the countdown must not jerk the nose.
    input.mouseDX = 0;
    input.mouseDY = 0;
    hp = MAX_HP;
    respawnIn = 0;
    group.visible = true;
    snapCamera = true;
    tel.hp = hp;
    tel.respawnIn = 0;
  };

  return {
    group,
    boltGroup,
    spawn,
    takeDamage(amount) {
      if (respawnIn > 0) return;
      hp = Math.max(0, hp - amount);
      tel.hp = hp;
      tel.hitFlash = 1;
      if (hp <= 0) {
        respawnIn = RESPAWN_DELAY;
        tel.respawnIn = respawnIn;
        group.visible = false;
        vel.set(0, 0, 0);
      }
    },
    update(dt, timeSec, camera, aliens, earthPos) {
      if (respawnIn > 0) {
        respawnIn -= dt;
        tel.respawnIn = Math.max(0, respawnIn);
        if (respawnIn <= 0) spawn(earthPos);
      }
      const flying = respawnIn <= 0;
      const boost = flying && input.boost && input.thrust > 0;

      if (flying) {
        // ── Attitude: keys / sticks drive smoothed angular rates; the mouse
        // adds a pending angle that eases out over a few frames. ──
        const yawIn = THREE.MathUtils.clamp(input.yaw + input.lookYaw, -1, 1);
        angTarget.set(-input.pitch * PITCH_RATE, -yawIn * YAW_RATE, input.roll * ROLL_RATE);
        angVel.lerp(angTarget, 1 - Math.exp(-dt * 7));
        pendYaw += -input.mouseDX * MOUSE_SENS;
        pendPitch += input.mouseDY * MOUSE_SENS;
        input.mouseDX = 0;
        input.mouseDY = 0;
        const mk = 1 - Math.exp(-dt * 14);
        const dYaw = pendYaw * mk;
        const dPitch = pendPitch * mk;
        pendYaw -= dYaw;
        pendPitch -= dPitch;
        group.rotateY(angVel.y * dt + dYaw);
        group.rotateX(angVel.x * dt + dPitch);
        group.rotateZ(angVel.z * dt);

        // ── Arcade thrust + per-frame drag, frame-rate independent. ──
        fwd.set(0, 0, 1).applyQuaternion(group.quaternion);
        vel.addScaledVector(fwd, input.thrust * THRUST_ACCEL * (boost ? 2 : 1) * dt);
        vel.multiplyScalar(Math.pow(DRAG_PER_FRAME, dt * 60));
        const max = boost ? BOOST_SPEED : MAX_SPEED;
        const sp = vel.length();
        if (sp > max) vel.multiplyScalar(max / sp);
        group.position.addScaledVector(vel, dt);

        // ── Lasers. ──
        fireAcc -= dt;
        if (input.fire && fireAcc <= 0) {
          fireAcc = FIRE_INTERVAL;
          fire();
        }
      } else {
        fwd.set(0, 0, 1).applyQuaternion(group.quaternion);
      }

      // Engine glow pulses, brightens under thrust and boost.
      const pulse = 0.85 + 0.15 * Math.sin(timeSec * 9) + (input.thrust > 0 ? 0.5 : 0) + (boost ? 0.9 : 0);
      engineMat.emissiveIntensity = 1.6 * pulse;
      for (let i = 0; i < glowMats.length; i++) {
        glowMats[i].opacity = Math.min(1, 0.55 * pulse);
        glowSprites[i].scale.setScalar((1.0 + 0.5 * (pulse - 0.85)) * U);
      }

      // Bolts advance in world space and hit-test against the live enemies.
      const enemies = aliens.enemies;
      for (const b of bolts) {
        if (b.life < 0) continue;
        b.life += dt;
        if (b.life > BOLT_LIFE) {
          b.life = -1;
          b.mesh.visible = false;
          continue;
        }
        b.mesh.position.addScaledVector(b.dir, BOLT_SPEED * dt);
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          const r = e.radius + 0.3 * U;
          if (b.mesh.position.distanceToSquared(e.group.position) < r * r) {
            aliens.spawnSparks(b.mesh.position, 0.034);
            if (aliens.damage(e, 15)) tel.kills += 1;
            b.life = -1;
            b.mesh.visible = false;
            break;
          }
        }
      }

      // ── Follow camera: 15 units back, 4 up, eased. ──
      up.set(0, 1, 0).applyQuaternion(group.quaternion);
      camTarget.copy(group.position).addScaledVector(fwd, -CAM_BACK).addScaledVector(up, CAM_UP);
      if (snapCamera) {
        snapCamera = false;
        camera.position.copy(camTarget);
        camUp.copy(up);
      } else {
        const k = 1 - Math.pow(1 - CAM_LERP, dt * 60);
        camera.position.lerp(camTarget, k);
        camUp.lerp(up, k).normalize();
      }
      camera.up.copy(camUp);
      lookPt.copy(group.position).addScaledVector(fwd, 6 * U);
      camera.lookAt(lookPt);

      // ── Telemetry for the HUD (no allocations). ──
      tel.speed = vel.length() / U;
      tel.boost = boost;
      tel.hitFlash = Math.max(0, tel.hitFlash - dt * 2.5);
      invQ.copy(group.quaternion).invert();
      let n = 0;
      for (let i = 0; i < enemies.length && n < RADAR_MAX; i++) {
        tmp.copy(enemies[i].group.position).sub(group.position).applyQuaternion(invQ);
        // Local +X is the ship's left (forward is +Z), so mirror for the screen.
        let x = -tmp.x / RADAR_RANGE;
        let y = tmp.z / RADAR_RANGE;
        const len = Math.hypot(x, y);
        if (len > 1) {
          x /= len;
          y /= len;
        }
        tel.radar[n * 2] = x;
        tel.radar[n * 2 + 1] = y;
        n += 1;
      }
      tel.radarCount = n;
    },
    dispose() {
      audio.dispose();
      boltGeom.dispose();
      boltMat.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        } else if (o instanceof THREE.Sprite) {
          (o.material as THREE.SpriteMaterial).dispose();
        }
      });
    },
  };
}
