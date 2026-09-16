// The cosmonaut on the surface: the EVA suit from moon-suit-mesh, moved by
// suit-locomotion and posed from what that motion actually did.
//
// Nothing here decides where the crew goes — gravity, grip and the suit do
// that in suit-locomotion. This file puts the body on top of it. The boots
// are wherever the locomotion planted them and the legs are solved onto them
// (two bones, knee and hip limited by the suit), so a planted boot cannot
// slide; the hips ride as high as the planted legs allow, which is where a
// walk's vault and a landing's squat come from. The torso leans into the
// acceleration it is producing, the arms counter-swing the legs and lag on
// springs, the pack lags the bounce, the chest breathes with the effort, and
// a crew that goes down gets up the slow way.

import * as THREE from 'three';
import { MOON_G, type DustBurst, type DustHandle } from '@/lib/solar-system/moon-fx';
import { mergeStatic } from '@/lib/solar-system/moon-batch';
import { buildSuit, HELMET_C, HIP_H, SHIN, THIGH } from '@/lib/solar-system/moon-suit-mesh';
import {
  gaitProfile, makeLocomotion, type Collider, type Foot, type Gait, type GaitProfile, type StepEvent, type WalkInput,
} from '@/lib/solar-system/suit-locomotion';

export type { Collider, StepEvent, WalkInput };

export type SuitAnim =
  | 'idle' | 'idleLook' | 'walk' | 'lope' | 'brake' | 'turn' | 'crouch' | 'crouchMove'
  | 'jump' | 'air' | 'landSoft' | 'landHard' | 'stumble' | 'fallen' | 'getUp' | 'work' | 'climb' | 'enterRover' | 'exitRover';

export interface CosmonautState {
  airborne: boolean;
  grounded: boolean;
  speed: number;
  /** Height above the ground under the boots, m. */
  altitude: number;
  /** Set for one step on a hard landing. */
  landed: boolean;
  /** The touchdown speed this step, m/s, for the camera's jolt (0 when none). */
  impact: number;
  crouched: boolean;
  /** Seconds left of a stumble; the stick barely answers while it runs. */
  stumble: number;
  fallen: boolean;
  /** The grade under the boots in the direction of travel: + is uphill. */
  grade: number;
  sliding: boolean;
  gait: Gait;
  /** The gravity the crew is moving in, m/s². */
  gravity: number;
  /** Last step length, m, and steps a second. */
  stride: number;
  cadence: number;
  /** Effort, 0…1, eased the way breathing follows it. */
  effort: number;
  anim: SuitAnim;
}

export interface CosmonautHandle {
  group: THREE.Group;
  /** The simulated position; the drawn one is interpolated from it. */
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Facing yaw, rad, +Z forward at 0. */
  yaw: number;
  state: CosmonautState;
  profile: GaitProfile;
  /** Where each boot is, and whether it is planted (world space). */
  feet: readonly Foot[];
  /** The ankle groups, for checking the pose against the boots. */
  ankles: readonly THREE.Object3D[];
  /** Change the world under the boots: gravity, and whether the suit is pressurised. */
  setGravity: (g: number, suited: boolean) => void;
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
  /** Take control away for a scripted sequence (a fall, a climb). */
  hold: (on: boolean) => void;
  /** Standing on a floor rather than regolith: no dust off the boots. */
  indoors: boolean;
  dispose: () => void;
}

const MOON = gaitProfile(MOON_G, true);
export const WALK = MOON.walk;
export const RUN = MOON.run;
/** Ankle to the sole's tread, m. */
const SOLE = 0.12;

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const ease = (rate: number, dt: number) => 1 - Math.exp(-dt * rate);
const clamp = THREE.MathUtils.clamp;

const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const hipAt = new THREE.Vector3();

/**
 * Two bones onto a point, in the hip's parent (pelvis) frame. Three's Euler
 * order is XYZ, so a leg point p is rotated Rx(α)·Rz(θ)·p: θ swings the leg
 * out, α swings it fore and aft, and the knee folds back by β.
 */
function solveLeg(tx: number, ty: number, tz: number, kneeMax: number): { alpha: number; theta: number; beta: number } {
  const T = THIGH; const S = SHIN;
  const d = clamp(Math.hypot(tx, ty, tz), 0.25, T + S - 1e-3);
  // The boots sit almost under the hips, so the roll and the swing barely
  // interact: take the roll out, then solve the swing in the leg's plane.
  const theta = clamp(Math.atan2(tx, -ty), -0.35, 0.35);
  const py = -Math.hypot(tx, ty) * (ty > 0 ? -1 : 1);
  const phi = Math.atan2(-tz, -py);
  const alpha = phi - Math.acos(clamp((T * T + d * d - S * S) / (2 * T * d), -1, 1));
  const cosGamma = clamp((T * T + S * S - d * d) / (2 * T * S), -1, 1);
  const beta = clamp(Math.PI - Math.acos(cosGamma), 0.02, kneeMax);
  return { alpha: clamp(alpha, -1.15, 0.65), theta, beta };
}

/** `bareHead`: on a world with air the pilot comes out without the helmet and pack. */
export function makeCosmonaut(dust: DustHandle, lite = false, g = MOON_G, suited = true, bareHead = false): CosmonautHandle {
  const rig = buildSuit(lite, bareHead);
  const { group, body, pelvis, chest, pack, neck, helmet, sides, shoulders, elbows, hands, hips, knees, ankles } = rig;
  // Every joint is a group; everything rigid inside one becomes a draw call per material.
  const merged = mergeStatic(group, { isPivot: (o) => (o as THREE.Group).isGroup === true, minCaster: 0.05 });

  const position = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const prev = new THREE.Vector3();
  let prevYaw = 0;
  const loco = makeLocomotion(position, vel, gaitProfile(g, suited));
  const ls = loco.state;
  const state: CosmonautState = {
    airborne: false, grounded: true, speed: 0, altitude: 0, landed: false, impact: 0, crouched: false, stumble: 0, fallen: false,
    grade: 0, sliding: false, gait: 'stand', gravity: g, stride: 0, cadence: 0, effort: 0, anim: 'idle',
  };
  const puff: DustBurst = { x: 0, y: 0, z: 0, count: 1, speedMin: 0.4, speedMax: 1, cone: 0.7, size: 0.09 };
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
  let fallK = 0;
  let stumbleRoll = 1;
  let squat = 0; let squatVel = 0;
  let packRot = 0; let packVel = 0; let lastBodyVy = 0; let lastBodyY = 0;
  const arm = [0, 0]; const armVel = [0, 0];
  let breath = 0;
  let wasJumping = false;
  let scripted = 0;
  let scriptedKind: 'enterRover' | 'exitRover' | null = null;
  let scriptedLen = 1;
  let held = false;
  let lookYaw = 0; let lookPitch = 0;
  let helmetView = false;
  const eyeLocal = bareHead ? new THREE.Vector3(0, 0.16, 0.1) : new THREE.Vector3(0, HELMET_C, 0.08);

  loco.onStep = (s) => {
    if (!handle.indoors) {
      const k = s.hard;
      puff.x = s.x; puff.y = s.y; puff.z = s.z; puff.count = Math.round(3 + k * 14); puff.speedMin = 0.4; puff.speedMax = 1 + k * 2;
      puff.cone = 0.8 + k * 0.4; puff.size = 0.09 + k * 0.04;
      puff.dirX = -Math.sin(loco.yaw); puff.dirZ = -Math.cos(loco.yaw); puff.bias = 0.5;
      dust.burst(puff);
    }
    handle.onStep?.(s);
  };

  /** Everything the pose needs, in the frame of the drawn (interpolated) suit. */
  const pose = () => {
    const P = loco.profile;
    const cy = Math.cos(group.rotation.y); const sy = Math.sin(group.rotation.y);
    const local = (i: number, out: THREE.Vector3) => {
      const f = loco.feet[i];
      const dx = f.x - group.position.x; const dz = f.z - group.position.z;
      return out.set(dx * cy - dz * sy, f.y - group.position.y, dx * sy + dz * cy);
    };
    // The hips ride as high as the planted legs reach.
    const reach = (THIGH + SHIN + SOLE) * 0.985;
    let top = 0.03;
    for (let i = 0; i < 2; i++) {
      if (!loco.feet[i].planted && !ls.fallen) continue;
      local(i, v);
      const hd = Math.hypot(v.x - sides[i] * 0.125, v.z);
      // A boot out of reach is about to be lifted; it must not drag the hips down.
      if (hd > reach * 0.9) continue;
      const h = v.y + Math.sqrt(reach * reach - hd * hd) - HIP_H;
      top = Math.min(top, h);
    }
    const want = top - squat * 0.16 - crouchK * 0.42 - workK * 0.1 - fallK * 0.5;
    body.position.y = want;
    // Legs, onto the boots.
    q.setFromEuler(e.set(pelvis.rotation.x, pelvis.rotation.y, pelvis.rotation.z)).invert();
    const kneeMax = P.kneeMax + crouchK * 0.7 + fallK * 0.8 + workK * 0.3;
    for (let i = 0; i < 2; i++) {
      local(i, v);
      v.y += SOLE;
      hipAt.set(sides[i] * 0.125, 0, 0).applyEuler(e.set(pelvis.rotation.x, pelvis.rotation.y, pelvis.rotation.z));
      v.x -= hipAt.x; v.y -= body.position.y + HIP_H + hipAt.y; v.z -= hipAt.z;
      v.applyQuaternion(q);
      const sol = solveLeg(v.x, v.y, v.z, kneeMax);
      let hx = sol.alpha; let kx = sol.beta;
      const mount = scriptedKind === 'enterRover' && i === 0 ? Math.sin((1 - scripted / scriptedLen) * Math.PI) : 0;
      hx -= mount * 1.1; kx += mount * 1.4;
      hips[i].rotation.x = hx;
      hips[i].rotation.z = sol.theta;
      knees[i].rotation.x = kx;
      // Boots lie along the ground under them, and toe down a little in the air.
      const pitch = loco.feet[i].planted ? -Math.atan(ls.grade) * 0.8 : 0.25 * Math.min(1, airT * 3);
      ankles[i].rotation.x = clamp(-(pelvis.rotation.x + hx + kx) - pitch, -0.7, 0.7);
    }
  };

  const handle: CosmonautHandle = {
    group, position, velocity: vel, yaw: 0, state, profile: loco.profile, feet: loco.feet, ankles, onStep: null, indoors: false,
    setGravity(gravity, pressurised) {
      loco.setProfile(gaitProfile(gravity, pressurised));
      handle.profile = loco.profile;
      state.gravity = gravity;
    },
    eye(out) {
      group.updateMatrixWorld(true);
      return neck.localToWorld(out.copy(eyeLocal));
    },
    setHelmetView(on) { helmetView = on; helmet.visible = !on; },
    look(y, p) { lookYaw = y; lookPitch = p; },
    play(kind, seconds) { scriptedKind = kind; scripted = scriptedLen = seconds; },
    hold(on) { held = on; },
    settle() {
      loco.yaw = handle.yaw;
      loco.settleFeet();
      prev.copy(position); prevYaw = handle.yaw;
      group.position.copy(position); group.rotation.y = handle.yaw;
      pose();
    },
    present(alpha) {
      group.position.lerpVectors(prev, position, alpha);
      group.rotation.y = prevYaw + wrap(handle.yaw - prevYaw) * alpha;
      pose();
    },
    update(dt, input, heightAt, colliders, walkRadius) {
      prev.copy(position);
      prevYaw = handle.yaw;
      loco.yaw = handle.yaw;
      clock += dt;
      scripted = Math.max(0, scripted - dt);
      if (scripted <= 0) scriptedKind = null;
      const authority = scripted > 0 || held ? 0 : 1;
      loco.update(dt, input, heightAt, colliders, walkRadius, authority);
      handle.yaw = loco.yaw;
      const want = Math.hypot(input.moveX, input.moveZ) * authority;

      state.airborne = ls.airborne;
      state.grounded = ls.grounded;
      state.speed = ls.speed;
      state.altitude = ls.altitude;
      state.landed = ls.landed;
      state.impact = ls.impact;
      state.crouched = ls.crouched;
      state.stumble = ls.stumble;
      state.fallen = ls.fallen;
      state.grade = ls.grade;
      state.sliding = ls.sliding;
      state.gait = ls.gait;
      state.stride = ls.stride;
      state.cadence = ls.cadence;
      state.effort += (ls.effort - state.effort) * ease(ls.effort > state.effort ? 1.2 : 0.25, dt);
      const speed = ls.speed;
      const airborne = ls.airborne;
      airT = airborne ? airT + dt : 0;
      landT += dt;
      if (ls.impact > 0.6) {
        landT = 0;
        landHard = ls.landed;
        squatVel += Math.min(3.4, ls.impact * (ls.gait === 'bound' ? 0.35 : 0.75));
        if (ls.stumble > 0) stumbleRoll = Math.sign(vel.x * Math.cos(handle.yaw) - vel.z * Math.sin(handle.yaw) || 1);
      }
      if (ls.jumping && !wasJumping && !handle.indoors) {
        puff.x = position.x; puff.y = heightAt(position.x, position.z); puff.z = position.z;
        puff.count = 14; puff.speedMin = 0.6; puff.speedMax = 1.8; puff.cone = 0.9; puff.size = 0.12; puff.bias = 0;
        dust.burst(puff);
        squatVel -= 2.2;
      }
      wasJumping = ls.jumping;
      const working = input.work && ls.grounded && want < 0.05 && ls.stumble <= 0 && authority > 0 && !ls.fallen;

      // ── Which state the suit is in. ──
      let anim: SuitAnim;
      if (scriptedKind) anim = scriptedKind;
      else if (ls.fallen) anim = ls.getUp > 0 ? 'getUp' : 'fallen';
      else if (ls.stumble > 0) anim = 'stumble';
      else if (airborne && ls.gait !== 'bound') anim = airT < 0.25 && vel.y > 0 ? 'jump' : 'air';
      else if (landT < 0.35 && ls.gait !== 'bound') anim = landHard ? 'landHard' : 'landSoft';
      else if (working) anim = 'work';
      else if (ls.crouched) anim = speed > 0.3 ? 'crouchMove' : 'crouch';
      else if (want < 0.05 && speed > 0.8) anim = 'brake';
      else if (ls.turning) anim = 'turn';
      else if (speed < 0.2 && ls.gait !== 'bound') anim = idleT > 6 ? 'idleLook' : 'idle';
      else if (ls.grade > 0.22 && ls.gait === 'walk') anim = 'climb';
      else anim = ls.gait === 'bound' ? 'lope' : 'walk';
      state.anim = anim;
      idleT = anim === 'idle' || anim === 'idleLook' ? idleT + dt : 0;

      // ── Blend weights, eased so nothing snaps. ──
      crouchK += ((ls.crouched ? 1 : 0) - crouchK) * ease(7, dt);
      workK += ((anim === 'work' ? 1 : 0) - workK) * ease(5, dt);
      climbK += ((anim === 'climb' ? 1 : 0) - climbK) * ease(4, dt);
      brakeK += ((anim === 'brake' ? 1 : 0) - brakeK) * ease(6, dt);
      lookK += ((anim === 'idleLook' ? 1 : 0) - lookK) * ease(1.5, dt);
      // Down, and back up: getting up is the slow part.
      const down = anim === 'fallen' ? 1 : anim === 'getUp' ? ls.getUp / loco.profile.getUp : 0;
      fallK += (down - fallK) * ease(anim === 'fallen' ? 6 : 3, dt);
      lope += ((ls.gait === 'bound' ? 1 : 0) - lope) * ease(4, dt);
      // Landing compression: a spring that dips and comes back.
      squatVel += (-squat * 48 - squatVel * 9.5) * dt;
      squat += squatVel * dt;
      if (scriptedKind === 'exitRover') squat = Math.max(squat, 0.55 * (scripted / scriptedLen));

      // ── Torso: lean into the push the boots are making, and flail when it fails. ──
      pelvis.rotation.x = clamp(ls.lean, -0.5, 0.9) * 0.55 + squat * 0.25 + crouchK * 0.22 + fallK * 1.05 + (ls.stumble > 0 ? -0.2 : 0);
      chest.rotation.x = clamp(ls.lean, -0.5, 0.9) * 0.35 + workK * 0.2 + climbK * 0.15;
      const phase = ls.stepPhase * Math.PI * ls.stepSide;
      const moving = airborne ? 0 : Math.min(1, speed / 0.6);
      const twist = moving * (1 - lope * 0.6);
      pelvis.rotation.y = Math.sin(phase) * 0.06 * twist;
      chest.rotation.y = -Math.sin(phase) * 0.12 * twist + lookK * Math.sin(clock * 0.3) * 0.08;
      const flailRoll = ls.stumble > 0 ? Math.sin(ls.stumble * 22) * 0.16 * ls.stumble * stumbleRoll : 0;
      pelvis.rotation.z = clamp(ls.leanSide, -0.3, 0.3) * 0.5 + flailRoll + lookK * Math.sin(clock * 0.21) * 0.03;
      // Breathing follows the effort, a little behind it.
      breath += dt * Math.PI * 2 * (0.24 + state.effort * 0.55);
      chest.scale.y = 1 + Math.sin(breath) * (0.005 + state.effort * 0.012);

      // ── Arms: a spring toward swinging against the opposite leg. ──
      const tuck = airborne && ls.gait !== 'bound' ? Math.min(1, airT / 0.35) : 0;
      const flail = airborne ? Math.sin(airT * 2.6) * 0.07 : 0;
      const catchArm = Math.max(ls.stumble > 0 ? ls.stumble : 0, fallK);
      for (let i = 0; i < 2; i++) {
        const s = sides[i];
        const counter = -hips[1 - i].rotation.x * 0.6 - 0.08;
        const lopeArm = -0.3 - clamp(ls.lean, 0, 0.8) * 0.3;
        const target = THREE.MathUtils.lerp(THREE.MathUtils.lerp(counter, lopeArm, lope), -0.95, workK) * (1 - tuck)
          - brakeK * 0.3 + tuck * -0.55 + flail - catchArm * 0.9;
        armVel[i] += ((target - arm[i]) * 110 - armVel[i] * 15) * dt;
        arm[i] += armVel[i] * dt;
        shoulders[i].rotation.x = arm[i];
        shoulders[i].rotation.z = s * (0.2 + tuck * 0.45 + catchArm * 0.7 + workK * 0.08);
        elbows[i].rotation.x = -(0.45 + lope * 0.35 + tuck * 0.3 + workK * 0.55 - fallK * 0.3);
        hands[i].rotation.x = -workK * 0.3 + (workK > 0.5 ? Math.sin(clock * 7 + i) * 0.08 * workK : 0);
      }
      // The pack is heavy and hangs off the shoulders: it lags the bounce.
      const bodyWorldY = position.y + body.position.y;
      const bodyVy = (bodyWorldY - lastBodyY) / dt;
      const bodyAy = clamp((bodyVy - lastBodyVy) / dt, -40, 40);
      lastBodyY = bodyWorldY; lastBodyVy = bodyVy;
      packVel += (-bodyAy * 0.004 - packRot * 85 - packVel * 11) * dt;
      packRot += packVel * dt;
      pack.rotation.x = packRot;
      // The head stays level; idle, the crew looks about.
      if (helmetView) {
        neck.rotation.y = clamp(lookYaw, -1.1, 1.1);
        neck.rotation.x = clamp(-lookPitch, -0.7, 0.7);
        neck.rotation.z = 0;
      } else {
        neck.rotation.y = lookK * Math.sin(clock * 0.42) * 0.6 + (speed < 0.3 ? 0 : Math.sin(clock * 0.8) * 0.05);
        neck.rotation.x = -(pelvis.rotation.x + chest.rotation.x) * 0.55 + (airborne ? -0.1 : 0.04) + workK * 0.35;
        neck.rotation.z = -pelvis.rotation.z * 0.6;
      }
    },
    dispose() {
      rig.dispose();
      for (const geom of merged.geometries) geom.dispose();
    },
  };
  return handle;
}
