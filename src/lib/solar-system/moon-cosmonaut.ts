// The cosmonaut on the surface: the EVA suit from moon-suit-mesh, moved by a
// one-sixth-g controller and posed by a small set of blended states.
//
// What the suit will and will not do is the point of the movement. There is
// little grip on regolith, so a stride builds speed over a second rather than
// instantly — but the first step answers at once, turning is quick at a walk
// and only takes a wide arc once there is real momentum, and letting go
// always brings the crew to a stop in a couple of metres. It loses the hill
// going up and gains it coming down; past about thirty degrees it slides.
// Land hard and the crew stumbles, arms out. Crouch and all of it halves.
//
// The pose is built from the motion, never the other way round: stride
// frequency and leg swing follow the ground speed so boots do not skate, the
// chest counter-rotates against the hips, the arms and the pack lag on
// springs, the head stays level, and landings compress and come back.

import * as THREE from 'three';
import { MOON_G, type DustBurst, type DustHandle } from '@/lib/solar-system/moon-fx';
import { mergeStatic } from '@/lib/solar-system/moon-batch';
import { buildSuit, HELMET_C, RUN_SPEED } from '@/lib/solar-system/moon-suit-mesh';

export interface Collider { x: number; z: number; r: number }

export interface WalkInput {
  /** World-space move intent, already camera-relative, |v| ≤ 1. */
  moveX: number;
  moveZ: number;
  /** Edge-triggered: a jump was asked for this step. */
  jump: boolean;
  run: boolean;
  /** Down on one knee: slow, low, and steady. */
  crouch: boolean;
  /** Using a tool at a work site. */
  work: boolean;
}

export type SuitAnim =
  | 'idle' | 'idleLook' | 'walk' | 'lope' | 'brake' | 'turn' | 'crouch' | 'crouchMove'
  | 'jump' | 'air' | 'landSoft' | 'landHard' | 'stumble' | 'work' | 'climb' | 'enterRover' | 'exitRover';

export interface CosmonautState {
  airborne: boolean;
  speed: number;
  /** Height above the ground under the boots, m. */
  altitude: number;
  /** Set for one step on a hard landing. */
  landed: boolean;
  crouched: boolean;
  /** Seconds left of a stumble; the stick barely answers while it runs. */
  stumble: number;
  /** The grade under the boots in the direction of travel: + is uphill. */
  grade: number;
  sliding: boolean;
  anim: SuitAnim;
}

export interface StepEvent { x: number; y: number; z: number; yaw: number; side: number; hard: number }

export interface CosmonautHandle {
  group: THREE.Group;
  /** The simulated position; the drawn one is interpolated from it. */
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Facing yaw, rad, +Z forward at 0. */
  yaw: number;
  state: CosmonautState;
  /** Eye point inside the helmet, world space. */
  eye: (out: THREE.Vector3) => THREE.Vector3;
  setHelmetView: (on: boolean) => void;
  /** Turn the head toward a look direction (helmet view) — yaw relative to the body, pitch. */
  look: (yaw: number, pitch: number) => void;
  onStep: ((e: StepEvent) => void) | null;
  update: (dt: number, input: WalkInput, heightAt: (x: number, z: number) => number, colliders: Collider[], walkRadius: number) => void;
  /** Draw the suit between the last two simulation steps. */
  present: (alpha: number) => void;
  /** Put the drawn suit where the simulated one is (after a teleport). */
  settle: () => void;
  /** A short scripted move: climbing onto the rover, or down off it. */
  play: (kind: 'enterRover' | 'exitRover', seconds: number) => void;
  /** Standing on a floor rather than regolith: no dust off the boots. */
  indoors: boolean;
  dispose: () => void;
}

export const WALK = 2.05;
export const RUN = RUN_SPEED;
const CROUCH = 0.95;
const JUMP_V = 2.7;
/** Getting going: hard for the first metre a second, then a long build. */
const LAUNCH_ACCEL = 8.5;
const CRUISE_ACCEL = 3.4;
const BRAKE = 4.4;
const REVERSE_BRAKE = 7.5;
/** Sideways grip for changing direction, standing and at a run. */
const STEER_STILL = 11;
const STEER_RUN = 3.2;
const AIR_ACCEL = 1.1;
/** How fast the suit turns to face, rad/s, standing and at a run. */
const TURN_STILL = 7;
const TURN_RUN = 2.2;
const COYOTE = 0.1;
const JUMP_BUFFER = 0.15;
const SLIP_GRADE = 0.58;
const SUIT_RADIUS = 0.55;
const LEG = 0.88;

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const ease = (rate: number, dt: number) => 1 - Math.exp(-dt * rate);

export function makeCosmonaut(dust: DustHandle, lite = false): CosmonautHandle {
  const rig = buildSuit(lite);
  const { group, body, pelvis, chest, pack, neck, helmet, sides, shoulders, elbows, hands, hips, knees, ankles } = rig;
  // Every joint is a group; everything rigid inside one becomes a draw call per material.
  const merged = mergeStatic(group, { isPivot: (o) => (o as THREE.Group).isGroup === true, minCaster: 0.05 });

  const position = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const prev = new THREE.Vector3();
  let prevYaw = 0;
  const state: CosmonautState = { airborne: false, speed: 0, altitude: 0, landed: false, crouched: false, stumble: 0, grade: 0, sliding: false, anim: 'idle' };
  const puff: DustBurst = { x: 0, y: 0, z: 0, count: 1, speedMin: 0.4, speedMax: 1, cone: 0.7, size: 0.09 };
  let phase = 0;
  let lastStepPhase = 0;
  let stepSide = 1;
  let clock = 0;
  let idleT = 0;
  let airT = 0;
  let landT = 9;
  let landHard = false;
  let lope = 0;
  let crouchK = 0;
  let workK = 0;
  let climbK = 0;
  let brakeK = 0;
  let lookK = 0;
  let lean = 0;
  let stumble = 0;
  let stumbleRoll = 0;
  let grade = 0;
  let squat = 0; let squatVel = 0;
  let packRot = 0; let packVel = 0; let lastBodyVy = 0; let lastBodyY = 0;
  const arm = [0, 0]; const armVel = [0, 0];
  let coyote = 0;
  let jumpBuffer = 0;
  let jumping = false;
  let turnError = 0;
  let scripted = 0;
  let scriptedKind: 'enterRover' | 'exitRover' | null = null;
  let scriptedLen = 1;
  let lookYaw = 0; let lookPitch = 0;
  let helmetView = false;
  const eyeLocal = new THREE.Vector3(0, HELMET_C, 0.08);

  const handle: CosmonautHandle = {
    group, position, velocity: vel, yaw: 0, state, onStep: null, indoors: false,
    eye(out) {
      group.updateMatrixWorld(true);
      return neck.localToWorld(out.copy(eyeLocal));
    },
    setHelmetView(on) { helmetView = on; helmet.visible = !on; },
    look(y, p) { lookYaw = y; lookPitch = p; },
    play(kind, seconds) { scriptedKind = kind; scripted = scriptedLen = seconds; },
    settle() { prev.copy(position); prevYaw = handle.yaw; group.position.copy(position); group.rotation.y = handle.yaw; },
    present(alpha) {
      group.position.lerpVectors(prev, position, alpha);
      group.rotation.y = prevYaw + wrap(handle.yaw - prevYaw) * alpha;
    },
    update(dt, input, heightAt, colliders, walkRadius) {
      prev.copy(position);
      prevYaw = handle.yaw;
      state.landed = false;
      clock += dt;
      stumble = Math.max(0, stumble - dt);
      state.stumble = stumble;
      scripted = Math.max(0, scripted - dt);
      if (scripted <= 0) scriptedKind = null;
      const authority = scripted > 0 ? 0 : stumble > 0 ? 0.22 : 1;
      const wantX = input.moveX * authority; const wantZ = input.moveZ * authority;
      const want = Math.min(1, Math.hypot(wantX, wantZ));
      const ground = heightAt(position.x, position.z);
      const onGround = position.y <= ground + 0.001 && vel.y <= 0;
      coyote = onGround ? COYOTE : Math.max(0, coyote - dt);
      jumpBuffer = input.jump ? JUMP_BUFFER : Math.max(0, jumpBuffer - dt);
      const wantCrouch = input.crouch && onGround && stumble <= 0;
      const working = input.work && onGround && want < 0.05 && stumble <= 0 && scripted <= 0;
      state.crouched = wantCrouch;

      // ── The hill, a stride ahead along the intent. ──
      if (want > 0.05 && onGround) {
        const ax = position.x + (wantX / want) * 0.9;
        const az = position.z + (wantZ / want) * 0.9;
        grade += ((heightAt(ax, az) - ground) / 0.9 - grade) * ease(6, dt);
      } else {
        grade += (0 - grade) * ease(4, dt);
      }
      state.grade = grade;
      const hill = THREE.MathUtils.clamp(1 - grade * 0.62, 0.42, 1.22);
      const top = (wantCrouch ? CROUCH : input.run ? RUN : WALK) * hill;
      const tx = want > 0 ? (wantX / want) * top * want : 0;
      const tz = want > 0 ? (wantZ / want) * top * want : 0;

      // ── Traction: along the motion and across it are different jobs. ──
      const sp = Math.hypot(vel.x, vel.z);
      const approach = (rate: number) => {
        const dvx = tx - vel.x; const dvz = tz - vel.z;
        const dv = Math.hypot(dvx, dvz);
        if (dv < 1e-6) return;
        const step = Math.min(dv, rate * dt);
        vel.x += dvx / dv * step; vel.z += dvz / dv * step;
      };
      if (!onGround) {
        approach(AIR_ACCEL);
      } else if (want < 0.05) {
        approach(BRAKE * (wantCrouch ? 1.5 : 1));
      } else if (sp < 0.05) {
        approach(LAUNCH_ACCEL);
      } else {
        const ux = vel.x / sp; const uz = vel.z / sp;
        const dvx = tx - vel.x; const dvz = tz - vel.z;
        const along = dvx * ux + dvz * uz;
        const px = dvx - ux * along; const pz = dvz - uz * along;
        const reversing = tx * vel.x + tz * vel.z < 0;
        const alongRate = along < 0 ? (reversing ? REVERSE_BRAKE : BRAKE) : sp < 1.1 ? LAUNCH_ACCEL : CRUISE_ACCEL;
        const perpRate = THREE.MathUtils.lerp(STEER_STILL, STEER_RUN, Math.min(1, sp / RUN));
        const a = THREE.MathUtils.clamp(along, -alongRate * dt, alongRate * dt);
        const pl = Math.hypot(px, pz);
        const pk = pl > 1e-6 ? Math.min(pl, perpRate * dt) / pl : 0;
        vel.x += ux * a + px * pk;
        vel.z += uz * a + pz * pk;
      }

      // ── Jump: buffered a moment before landing, allowed a moment after a ledge. ──
      if ((onGround || coyote > 0) && jumpBuffer > 0 && !wantCrouch && stumble <= 0 && scripted <= 0 && vel.y <= 0.01) {
        vel.y = JUMP_V + (input.run ? 0.4 : 0);
        vel.x *= 1.08; vel.z *= 1.08;
        jumpBuffer = 0; coyote = 0; jumping = true;
        squatVel -= 2.2;
        if (!handle.indoors) {
          puff.x = position.x; puff.y = ground; puff.z = position.z; puff.count = 14; puff.speedMin = 0.6; puff.speedMax = 1.8; puff.cone = 0.9; puff.size = 0.12; puff.bias = 0;
          dust.burst(puff);
        }
      }
      vel.y -= MOON_G * dt;
      position.x += vel.x * dt;
      position.z += vel.z * dt;
      position.y += vel.y * dt;
      const rr = Math.hypot(position.x, position.z);
      if (rr > walkRadius) {
        position.x *= walkRadius / rr; position.z *= walkRadius / rr;
        vel.x *= 0.2; vel.z *= 0.2;
      }
      for (const c of colliders) {
        const dx = position.x - c.x; const dz = position.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + SUIT_RADIUS;
        if (d < min && d > 1e-4) {
          const push = (min - d) / d;
          position.x += dx * push; position.z += dz * push;
          const vn = (vel.x * dx + vel.z * dz) / d;
          if (vn < 0) { vel.x -= vn * dx / d; vel.z -= vn * dz / d; }
        }
      }
      const g2 = heightAt(position.x, position.z);
      if (position.y <= g2) {
        if (vel.y < -1.6) {
          state.landed = true;
          landT = 0;
          landHard = vel.y < -3.0;
          squatVel += Math.min(3.4, -vel.y * 0.75);
          if (vel.y < -3.4) {
            stumble = Math.min(1.5, 0.5 + (-vel.y - 3.4) * 0.28);
            stumbleRoll = Math.sign(vel.x * Math.cos(handle.yaw) - vel.z * Math.sin(handle.yaw) || 1);
            vel.x *= 0.45; vel.z *= 0.45;
          }
          handle.onStep?.({ x: position.x, y: g2, z: position.z, yaw: handle.yaw, side: 1, hard: 1 });
          handle.onStep?.({ x: position.x, y: g2, z: position.z, yaw: handle.yaw, side: -1, hard: 1 });
          if (!handle.indoors) {
            const k = Math.min(1, -vel.y / 4.5);
            puff.x = position.x; puff.y = g2; puff.z = position.z; puff.count = Math.round(10 + k * 40); puff.speedMin = 0.8; puff.speedMax = 2.2 + k * 2; puff.cone = 1.25; puff.size = 0.14; puff.bias = 0;
            dust.burst(puff);
          }
        }
        position.y = g2;
        vel.y = 0;
        jumping = false;
      } else if (onGround && !jumping && position.y - g2 < 0.22) {
        // Walking down a slope or off a step: keep the boots on it.
        position.y = g2;
        vel.y = 0;
      }
      // ── Steep ground: past about thirty degrees the boots stop holding. ──
      const slopeX = (heightAt(position.x + 0.7, position.z) - heightAt(position.x - 0.7, position.z)) / 1.4;
      const slopeZ = (heightAt(position.x, position.z + 0.7) - heightAt(position.x, position.z - 0.7)) / 1.4;
      const steep = Math.hypot(slopeX, slopeZ);
      const sliding = position.y <= g2 + 0.02 && steep > SLIP_GRADE;
      state.sliding = sliding;
      if (sliding) {
        const slip = (steep - SLIP_GRADE) * 7 * dt;
        vel.x -= slopeX / steep * slip;
        vel.z -= slopeZ / steep * slip;
      }
      const speed = Math.hypot(vel.x, vel.z);
      const airborne = position.y > g2 + 0.02;
      state.airborne = airborne;
      state.speed = speed;
      state.altitude = position.y - g2;
      airT = airborne ? airT + dt : 0;
      landT += dt;

      // ── Facing: slow, the suit turns to where the stick points; moving,
      // to where it is going, at a rate that falls off with speed. ──
      turnError = 0;
      if (scripted <= 0) {
        let target: number | null = null;
        if (want > 0.05 && speed < 0.9) target = Math.atan2(wantX, wantZ);
        else if (speed > 0.3) target = Math.atan2(vel.x, vel.z);
        if (target !== null) {
          const d = wrap(target - handle.yaw);
          turnError = d;
          const cap = THREE.MathUtils.lerp(TURN_STILL, TURN_RUN, Math.min(1, speed / RUN)) * (onGround ? 1 : 0.45) * dt;
          handle.yaw += THREE.MathUtils.clamp(d * ease(onGround ? 12 : 3, dt), -cap, cap);
        }
      }

      // ── Which state the suit is in. ──
      let anim: SuitAnim;
      if (scriptedKind) anim = scriptedKind;
      else if (stumble > 0) anim = 'stumble';
      else if (airborne) anim = airT < 0.25 && vel.y > 0 ? 'jump' : 'air';
      else if (landT < 0.35) anim = landHard ? 'landHard' : 'landSoft';
      else if (working) anim = 'work';
      else if (wantCrouch) anim = speed > 0.3 ? 'crouchMove' : 'crouch';
      else if (want < 0.05 && speed > 1.2) anim = 'brake';
      else if (speed < 0.35) anim = want > 0.05 && Math.abs(turnError) > 0.5 ? 'turn' : idleT > 6 ? 'idleLook' : 'idle';
      else if (grade > 0.22) anim = 'climb';
      else anim = lope > 0.5 ? 'lope' : 'walk';
      state.anim = anim;
      idleT = anim === 'idle' || anim === 'idleLook' ? idleT + dt : 0;

      // ── Blend weights, eased so nothing snaps. ──
      crouchK += ((wantCrouch ? 1 : 0) - crouchK) * ease(7, dt);
      workK += ((anim === 'work' ? 1 : 0) - workK) * ease(5, dt);
      climbK += ((anim === 'climb' ? 1 : 0) - climbK) * ease(4, dt);
      brakeK += ((anim === 'brake' ? 1 : 0) - brakeK) * ease(6, dt);
      lookK += ((anim === 'idleLook' ? 1 : 0) - lookK) * ease(1.5, dt);
      const lopeTarget = THREE.MathUtils.smoothstep(speed, WALK * 1.1, RUN * 0.8);
      lope += (lopeTarget - lope) * ease(3, dt);
      const leanTarget = airborne ? 0.08
        : speed / RUN * 0.28 + Math.max(0, grade) * 0.45 - brakeK * 0.16 + workK * 0.22 + (stumble > 0 ? -0.35 : 0);
      lean += (leanTarget - lean) * ease(6, dt);
      // Landing compression: a spring that dips and comes back.
      squatVel += (-squat * 48 - squatVel * 9.5) * dt;
      squat += squatVel * dt;
      if (scriptedKind === 'exitRover') squat = Math.max(squat, 0.55 * (scripted / scriptedLen));

      // ── The gait, tied to the ground so the boots do not skate. One
      // cycle is two steps; the walk's cycle is short, the lope's long. ──
      const moving = airborne ? 0 : Math.min(1, speed / 0.6);
      const cycle = THREE.MathUtils.lerp(1.45, 3.4, lope) * (wantCrouch ? 0.7 : 1);
      if (!airborne) phase += (speed / cycle) * Math.PI * 2 * dt;
      if (anim === 'turn') phase += dt * Math.PI * 2 * 1.4;
      const duty = THREE.MathUtils.lerp(0.62, 0.38, lope);
      const stride = Math.asin(Math.min(0.55, (cycle * duty) / (4 * LEG)));
      const shuffle = anim === 'turn' ? 0.18 : 0;
      const amp = Math.max(stride * moving, shuffle);
      const legLag = THREE.MathUtils.lerp(Math.PI, 0.45, lope);
      const gait = Math.min(1, speed / RUN);
      const bob = airborne ? 0 : THREE.MathUtils.lerp(Math.abs(Math.cos(phase)) * 0.03 * gait, Math.max(0, Math.sin(phase)) * 0.09, lope) * moving;
      body.position.y = bob - squat * 0.16 - crouchK * 0.42 - workK * 0.1 - Math.abs(grade) * 0.04;
      pelvis.rotation.x = lean * 0.6 + squat * 0.25 + crouchK * 0.22;
      chest.rotation.x = lean * 0.4 + workK * 0.2 + lope * 0.05 * Math.cos(phase) * moving;
      // Hips and chest turn against each other through the stride.
      const twist = moving * (1 - lope * 0.6);
      pelvis.rotation.y = Math.sin(phase) * 0.06 * twist;
      chest.rotation.y = -Math.sin(phase) * 0.12 * twist + lookK * Math.sin(clock * 0.3) * 0.08;
      const flailRoll = stumble > 0 ? Math.sin(stumble * 22) * 0.16 * stumble * stumbleRoll : 0;
      pelvis.rotation.z = (airborne ? 0 : -Math.sin(phase) * 0.035 * gait * (1 - lope)) + flailRoll + lookK * Math.sin(clock * 0.21) * 0.03;
      chest.scale.y = 1 + (speed < 0.3 ? Math.sin(clock * 1.5) * 0.008 : 0);
      const tuck = airborne ? Math.min(1, airT / 0.35) : 0;
      const free = 1 - tuck;
      const flail = airborne ? Math.sin(airT * 2.6) * 0.07 : 0;
      const catchArm = stumble > 0 ? stumble : 0;
      for (let i = 0; i < 2; i++) {
        const s = sides[i];
        const p = phase + (i === 0 ? 0 : legLag);
        const swing = Math.sin(p) * amp;
        const flex = 0.1 + Math.max(0, Math.cos(p)) * (0.5 + lope * 0.35 + climbK * 0.35) * Math.max(moving, anim === 'turn' ? 0.4 : 0);
        const kneel = crouchK * (i === 0 ? 1 : 0.7);
        const mount = scriptedKind === 'enterRover' && i === 0 ? Math.sin((1 - scripted / scriptedLen) * Math.PI) : 0;
        hips[i].rotation.x = -swing * free + tuck * (-0.6 - i * 0.12) - squat * 0.8 - kneel * 0.95 - workK * 0.35 - mount * 1.1;
        hips[i].rotation.z = s * (0.035 + crouchK * 0.12);
        knees[i].rotation.x = flex * free + tuck * (1.0 + i * 0.15) + squat * 1.45 + kneel * 1.7 + workK * 0.6 + mount * 1.4;
        // Boots stay close to level, and lie along the slope under them.
        ankles[i].rotation.x = -(hips[i].rotation.x + knees[i].rotation.x) * 0.8 - Math.atan(grade) * 0.6 * free;
        // Arms: a spring toward the gait's own swing, so they carry momentum.
        const walkArm = swing * 0.5 - 0.08;
        const lopeArm = -0.32 + Math.sin(phase) * 0.08 * moving;
        const target = THREE.MathUtils.lerp(THREE.MathUtils.lerp(walkArm, lopeArm, lope), -0.95, workK) * free
          - brakeK * 0.3 + tuck * -0.55 + flail - catchArm * 0.9 - mount * 0.5;
        armVel[i] += ((target - arm[i]) * 110 - armVel[i] * 15) * dt;
        arm[i] += armVel[i] * dt;
        shoulders[i].rotation.x = arm[i];
        shoulders[i].rotation.z = s * (0.2 + tuck * 0.45 + catchArm * 0.7 + workK * 0.08);
        elbows[i].rotation.x = -(0.45 + lope * 0.35 + tuck * 0.3 + Math.max(0, -swing) * 0.25 + workK * 0.55);
        hands[i].rotation.x = -workK * 0.3 + (workK > 0.5 ? Math.sin(clock * 7 + i) * 0.08 * workK : 0);
      }
      // The pack is heavy and hangs off the shoulders: it lags the bounce.
      const bodyVy = (body.position.y - lastBodyY) / dt;
      const bodyAy = THREE.MathUtils.clamp((bodyVy - lastBodyVy) / dt, -40, 40);
      lastBodyY = body.position.y; lastBodyVy = bodyVy;
      packVel += (-bodyAy * 0.006 - packRot * 85 - packVel * 11) * dt;
      packRot += packVel * dt;
      pack.rotation.x = packRot;
      // The head stays level; idle, the crew looks about.
      if (helmetView) {
        neck.rotation.y = THREE.MathUtils.clamp(lookYaw, -1.1, 1.1);
        neck.rotation.x = THREE.MathUtils.clamp(-lookPitch, -0.7, 0.7);
        neck.rotation.z = 0;
      } else {
        neck.rotation.y = lookK * Math.sin(clock * 0.42) * 0.6 + (speed < 0.3 ? 0 : Math.sin(clock * 0.8) * 0.05);
        neck.rotation.x = -(pelvis.rotation.x + chest.rotation.x) * 0.55 + (airborne ? -0.1 : 0.04) + workK * 0.35;
        neck.rotation.z = -pelvis.rotation.z * 0.6;
      }
      // Footfalls: a print and a little dust off the boot.
      if (!airborne && speed > 0.8 && stumble <= 0) {
        const stepPhase = Math.sin(phase) * stepSide;
        if (lastStepPhase > 0 && stepPhase <= 0) {
          stepSide = -stepSide;
          const fx = position.x - Math.sin(handle.yaw) * 0.1;
          const fz = position.z - Math.cos(handle.yaw) * 0.1;
          if (!handle.indoors) {
            puff.x = fx; puff.y = g2; puff.z = fz; puff.count = Math.round(3 + gait * 6); puff.speedMin = 0.4; puff.speedMax = 1 + gait * 1.4; puff.cone = 0.7; puff.size = 0.09;
            puff.dirX = -Math.sin(handle.yaw); puff.dirZ = -Math.cos(handle.yaw); puff.bias = 0.6;
            dust.burst(puff);
          }
          handle.onStep?.({ x: fx, y: g2, z: fz, yaw: handle.yaw, side: stepSide, hard: gait });
        }
        lastStepPhase = stepPhase;
      }
    },
    dispose() {
      rig.dispose();
      for (const g of merged.geometries) g.dispose();
    },
  };
  return handle;
}
