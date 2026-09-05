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
const CAM_BACK = 27 * U;
const CAM_UP = 7.5 * U;
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
/** Hull integrity floors here — hits hurt and slow you down, but the ship
 *  is never destroyed. This is a sightseeing craft, not a life you can lose. */
const MIN_HP = 15;
const HP_REGEN_PER_SEC = 4.5;
const HP_REGEN_DELAY = 4;
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
  strobeMat: THREE.MeshBasicMaterial;
  /** Materials shared across meshes — disposed once, by hand. */
  owned: THREE.Material[];
}

/**
 * Fighter built from primitives, detailed the way a real airframe reads at
 * distance: a long tapered fuselage, a recessed canopy, swept wings with
 * thickness and hard leading edges, engine nacelles whose nozzles glow from
 * inside a dark shroud, and navigation lights on aviation convention —
 * red to port, green to starboard, a white strobe on the spine.
 * Forward is +Z, matching the alien ships.
 */
function buildShip(): ShipParts {
  const group = new THREE.Group();
  group.name = 'playerShip';

  // Three hull tones: a light dorsal skin, a darker ventral/panel grey, and
  // near-black for shrouds and the canopy. Real spacecraft read as panelled
  // metal, not one flat colour.
  const skin = new THREE.MeshStandardMaterial({ color: 0xc6cedb, roughness: 0.38, metalness: 0.72 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x76808f, roughness: 0.52, metalness: 0.6 });
  const shroud = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.66, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a2634, roughness: 0.08, metalness: 0.9,
    emissive: new THREE.Color(0x0d2233), emissiveIntensity: 0.5,
  });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0xbdeeff,
    emissive: new THREE.Color(0x49ddff),
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0,
  });
  const owned: THREE.Material[] = [skin, panel, shroud, glass, engineMat];

  // ── Fuselage: tapered spine, not a plain tube ──
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * U, 0.44 * U, 2.7 * U, 16), skin);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3 * U, 1.7 * U, 16), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 2.2 * U;
  group.add(nose);
  // Sensor tip — the one bright point on the nose.
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055 * U, 8, 8), shroud);
  tip.position.z = 3.06 * U;
  group.add(tip);
  // Ventral panel running the length of the belly: breaks the silhouette.
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.42 * U, 0.14 * U, 2.4 * U), panel);
  belly.position.set(0, -0.3 * U, 0.1 * U);
  group.add(belly);
  // Dorsal spine strake.
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.16 * U, 0.16 * U, 1.9 * U), panel);
  spine.position.set(0, 0.32 * U, -0.15 * U);
  group.add(spine);

  // ── Canopy: sunk into a dark coaming so it reads as glass in a frame ──
  const coaming = new THREE.Mesh(new THREE.SphereGeometry(0.3 * U, 14, 10), shroud);
  coaming.scale.set(1, 0.62, 1.9);
  coaming.position.set(0, 0.26 * U, 0.62 * U);
  group.add(coaming);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.26 * U, 14, 10), glass);
  canopy.scale.set(1, 0.6, 1.85);
  canopy.position.set(0, 0.3 * U, 0.66 * U);
  group.add(canopy);

  // ── Wings: swept 30°, with thickness, a hard leading edge and end plates ──
  const wingGeom = new THREE.BoxGeometry(2.9 * U, 0.075 * U, 1.0 * U);
  const edgeGeom = new THREE.BoxGeometry(2.9 * U, 0.055 * U, 0.16 * U);
  const plateGeom = new THREE.BoxGeometry(0.07 * U, 0.42 * U, 0.72 * U);
  const pylonGeom = new THREE.BoxGeometry(0.16 * U, 0.2 * U, 0.9 * U);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeom, skin);
    wing.position.set(side * 1.6 * U, -0.04 * U, -0.4 * U);
    wing.rotation.y = side * (Math.PI / 6);
    // A few degrees of dihedral — flat wings look like cardboard.
    wing.rotation.z = side * -0.06;
    group.add(wing);
    const edge = new THREE.Mesh(edgeGeom, panel);
    edge.position.set(side * 1.6 * U, -0.04 * U, -0.4 * U);
    edge.rotation.y = side * (Math.PI / 6);
    edge.rotation.z = side * -0.06;
    edge.translateZ(0.42 * U);
    group.add(edge);
    const plate = new THREE.Mesh(plateGeom, panel);
    plate.position.set(side * 2.92 * U, 0.06 * U, -1.12 * U);
    group.add(plate);
    const pylon = new THREE.Mesh(pylonGeom, panel);
    pylon.position.set(side * 0.82 * U, -0.02 * U, -0.5 * U);
    group.add(pylon);
  }

  // ── Tail fins, canted outward ──
  const finGeom = new THREE.BoxGeometry(0.06 * U, 0.8 * U, 0.8 * U);
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeom, skin);
    fin.position.set(side * 0.3 * U, 0.42 * U, -1.15 * U);
    fin.rotation.z = side * 0.28;
    group.add(fin);
  }

  // ── Engines: a dark shroud with the glowing nozzle recessed inside ──
  const nacelleGeom = new THREE.CylinderGeometry(0.3 * U, 0.34 * U, 1.5 * U, 14);
  const shroudGeom = new THREE.CylinderGeometry(0.34 * U, 0.34 * U, 0.34 * U, 14, 1, true);
  const nozzleGeom = new THREE.CylinderGeometry(0.25 * U, 0.2 * U, 0.12 * U, 14);
  const glowTex = softSpriteTexture();
  const glowMats: THREE.SpriteMaterial[] = [];
  const glowSprites: THREE.Sprite[] = [];
  for (const side of [-1, 1]) {
    const x = side * 0.8 * U;
    const nacelle = new THREE.Mesh(nacelleGeom, panel);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(x, -0.06 * U, -1.1 * U);
    group.add(nacelle);
    const ring = new THREE.Mesh(shroudGeom, shroud);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, -0.06 * U, -1.84 * U);
    group.add(ring);
    const nozzle = new THREE.Mesh(nozzleGeom, engineMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(x, -0.06 * U, -1.9 * U);
    group.add(nozzle);
    // Exhaust bloom, sitting just behind the nozzle mouth.
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x5fe0ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, -0.06 * U, -2.06 * U);
    sprite.scale.setScalar(1.1 * U);
    group.add(sprite);
    glowMats.push(mat);
    glowSprites.push(sprite);
  }

  // ── Navigation lights: red to port, green to starboard, white on the
  // spine. Tiny unlit-looking basic materials so they read at any distance. ──
  const navGeom = new THREE.SphereGeometry(0.075 * U, 8, 8);
  const navMats: THREE.MeshBasicMaterial[] = [];
  // Forward is +Z with +Y up, so the pilot's left (port) is +X.
  const navSpecs: [number, number][] = [[1, 0xff3b30], [-1, 0x30ff6a]];
  for (const [side, colour] of navSpecs) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(1.6) });
    const light = new THREE.Mesh(navGeom, m);
    light.position.set(side * 2.92 * U, 0.28 * U, -1.12 * U);
    group.add(light);
    navMats.push(m);
    owned.push(m);
  }
  const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const strobe = new THREE.Mesh(navGeom, strobeMat);
  strobe.position.set(0, 0.46 * U, -0.6 * U);
  group.add(strobe);
  owned.push(strobeMat);

  return { group, engineMat, glowMats, glowSprites, strobeMat, owned };
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
  ) => void;
  dispose: () => void;
}

interface Bolt {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  life: number; // <0 idle
}

export function createPlayerShip(session: FlightSession): PlayerShipHandle {
  const { group, engineMat, glowMats, glowSprites, strobeMat, owned } = buildShip();
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
  let sinceHit = 99;
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
    sinceHit = 99;
    group.visible = true;
    snapCamera = true;
    tel.hp = hp;
  };

  return {
    group,
    boltGroup,
    spawn,
    takeDamage(amount) {
      hp = Math.max(MIN_HP, hp - amount);
      sinceHit = 0;
      tel.hp = hp;
      tel.hitFlash = 1;
    },
    update(dt, timeSec, camera, aliens) {
      // Hull recharges once nobody has landed a hit for a few seconds.
      sinceHit += dt;
      if (hp < MAX_HP && sinceHit > HP_REGEN_DELAY) {
        hp = Math.min(MAX_HP, hp + HP_REGEN_PER_SEC * dt);
        tel.hp = hp;
      }
      const boost = input.boost && input.thrust > 0;

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

      // Engine glow answers the throttle: idle shimmer, a hard step under
      // thrust, and a longer plume on boost.
      const pulse = 0.8 + 0.08 * Math.sin(timeSec * 7) + (input.thrust > 0 ? 0.55 : 0) + (boost ? 1.0 : 0);
      engineMat.emissiveIntensity = 1.5 * pulse;
      for (let i = 0; i < glowMats.length; i++) {
        glowMats[i].opacity = Math.min(1, 0.5 * pulse);
        glowSprites[i].scale.set(
          (0.9 + 0.35 * (pulse - 0.8)) * U,
          (0.9 + 0.35 * (pulse - 0.8)) * U,
          1,
        );
      }
      // Anti-collision strobe: a double flash roughly once a second, the
      // rhythm every real aircraft and spacecraft carries.
      const beat = timeSec % 1.4;
      const flashing = beat < 0.07 || (beat > 0.18 && beat < 0.25);
      strobeMat.color.setScalar(flashing ? 2.4 : 0.05);

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
      // Geometries and materials are shared across meshes here, so collect
      // them before disposing — traversing blind would free each many times.
      const geoms = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) geoms.add(o.geometry);
        else if (o instanceof THREE.Sprite) mats.add(o.material as THREE.SpriteMaterial);
      });
      for (const g of geoms) g.dispose();
      for (const m of owned) mats.add(m);
      for (const m of mats) m.dispose();
    },
  };
}
