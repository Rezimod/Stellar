// How a person moves over ground, from the physics up — no meshes here.
//
// Gravity decides almost everything. The walk is an inverted pendulum, and a
// pendulum cannot be walked faster than about √(½·g·leg): 2.1 m/s on Earth,
// 0.85 m/s on the Moon. Past that the body has to leave the ground, so on the
// Moon the suit lopes — short real ballistic bounds with a stance between
// them — and on Earth the same machinery is an ordinary run with a brief
// flight. The boots can only push as hard as friction on the ground allows
// (μ · g · how hard the stance leg is loaded), and a person only leans as far
// as they dare, so in one-sixth g getting going takes a second and stopping
// takes a couple of bounds; nothing pushes in the air. A voluntary stop never
// over-leans; hauling the stick round at a full lope does, and downhill that
// is a fall. The feet are placed, not animated: a planted foot does not move
// until it is lifted, and the next one lands where the body will be.
//
// Two deliberate departures from all of that, because a sixth of a g is a
// beautiful thing to watch and a miserable thing to steer. The body is given
// Mars underfoot on any world lighter than that, and the boots are given the
// grip and the legs the push of a game character rather than a pressure
// garment: the stick is answered in a stride, a turn is a step, a stop is a
// plant. What the crew throws into the air is the one thing still answering
// to the lighter gravity, which is exactly where the low-gravity feel
// belongs: the running is a run, and the jump hangs.

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

export interface GaitProfile {
  /** The world's gravity, m/s². */
  g: number;
  /** What the crew's own body falls under: `g`, floored at Mars. */
  bodyG: number;
  /** Pressurised suit (stiff, heavy) or not. */
  suited: boolean;
  /** Hip to sole, m. */
  leg: number;
  /** The fastest a walk can go before the body must leave the ground, m/s. */
  walkLimit: number;
  walk: number;
  run: number;
  crouch: number;
  /** Boot on ground friction. */
  grip: number;
  /** Stance-leg loading, in body weights, walking and bounding. */
  walkLoad: number;
  boundLoad: number;
  /** What the muscles can add horizontally regardless of grip, m/s². */
  muscle: number;
  /** The furthest a person leans on purpose, rad; past it they stumble. */
  leanMax: number;
  /** How hard a stop is allowed to be, m/s²: a plant, not a wall. */
  brake: number;
  /** A standing hop's take-off speed, and what a full run adds, m/s. */
  hop: number;
  runHop: number;
  /** Bound flight time at speed v: flightBase + flightPerSpeed·v, s; stance time, s. */
  flightBase: number;
  flightPerSpeed: number;
  stance: number;
  /** Both boots land together (the lunar skip) or one at a time (a run). */
  skip: boolean;
  /** Facing turn rate standing and at a run, rad/s; the most a standing step turns, rad; its length, s. */
  turnStill: number;
  turnRun: number;
  turnChunk: number;
  turnStep: number;
  /** Knee flexion the suit allows, rad. */
  kneeMax: number;
  /** Step length the legs can reach, m. */
  reach: number;
  /** Steering from arm swing and lean while in the air, m/s². */
  air: number;
  /** Landing speeds that compress hard and that knock the crew down, m/s. */
  hardLand: number;
  stumbleLand: number;
  /** Getting up off the ground, s. */
  getUp: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const EARTH_G = 9.81;
export const LUNAR_G = 1.62;
export const MARS_G = 3.72;

/**
 * A profile for any gravity. `suited` is the pressurised EVA suit: about 157 kg
 * with the person in it, stiff at the knee and hip. Unsuited is a person in a
 * depressurised, soft suit with no pack or helmet — near enough ordinary.
 */
export function gaitProfile(g: number, suited = true): GaitProfile {
  // The body's footing: never lighter than Mars, so the crew always has
  // something to push against, and every one of the numbers below is worked
  // from that rather than from the world's own gravity.
  const bodyG = Math.max(g, MARS_G);
  const k = clamp((bodyG - LUNAR_G) / (EARTH_G - LUNAR_G), 0, 1.2);
  const leg = 0.9;
  // The pendulum's own limit, or a game walk's — whichever is higher, so an
  // ordinary 1.4 m/s walk is a walk and not the bottom of a run.
  const walkLimit = Math.max(Math.sqrt(0.5 * bodyG * leg), 1.6);
  // Take-off speed. Not the suit's own push — a stiff pressure garment gives
  // a few centimetres of travel and next to nothing with it — but the push
  // the crew is given, chosen so a jump clears most of a metre on a light
  // world and about a third of one on a heavy one.
  const hop = suited ? 2.6 : 2.75;
  return {
    g, bodyG, suited, leg, walkLimit,
    walk: clamp(walkLimit * 1.4, 1.2, 1.4),
    run: clamp(1.7 * Math.sqrt(bodyG * leg), 2.2, suited ? 3.2 : 3.8),
    crouch: suited ? 0.55 : 0.8,
    // Grip and push are a game character's, not a pressure suit's: the
    // stick is answered within a stride.
    grip: 1.15,
    walkLoad: 1.6,
    boundLoad: 3.6,
    muscle: 13,
    // Far enough that no amount of steering trips the crew; only a hard
    // landing does.
    leanMax: 1.3,
    brake: 8,
    hop,
    runHop: suited ? 0.4 : 0.5,
    // Short flights between strides: a run, not a lope.
    flightBase: lerp(0.09, 0.02, Math.min(1, k)),
    flightPerSpeed: lerp(0.06, 0.045, Math.min(1, k)),
    stance: lerp(0.24, 0.2, Math.min(1, k)),
    // Both boots together is the true one-sixth-g skip; with the body's
    // footing floored at Mars nothing reaches it any more, and the crew runs.
    skip: k < 0.2,
    // A turn is a step, taken at once.
    turnStill: 9,
    turnRun: 6,
    turnChunk: Math.PI,
    turnStep: 0.22,
    kneeMax: suited ? 1.25 : 2.1,
    reach: suited ? 0.78 : 1.0,
    air: 1.6,
    hardLand: Math.sqrt(2 * bodyG * (suited ? 1.8 : 1.0)),
    stumbleLand: Math.sqrt(2 * bodyG * (suited ? 3.2 : 1.8)),
    getUp: suited ? 1.6 : 0.9,
  };
}

export type Gait = 'stand' | 'walk' | 'bound' | 'air' | 'fallen';

export interface Foot {
  side: number;
  x: number; y: number; z: number;
  planted: boolean;
  /** Where it lifted from and where it is going. */
  fromX: number; fromY: number; fromZ: number;
  toX: number; toZ: number;
}

export interface LocoState {
  gait: Gait;
  grounded: boolean;
  airborne: boolean;
  speed: number;
  /** Height above the ground under the boots, m. */
  altitude: number;
  /** Set for one step on a landing that compresses the legs hard. */
  landed: boolean;
  /** The last touchdown's vertical speed, m/s (0 when there was none this step). */
  impact: number;
  crouched: boolean;
  /** Seconds left of a stumble; the stick barely answers while it runs. */
  stumble: number;
  /** Down on the ground; > 0 is the time left getting up. */
  fallen: boolean;
  getUp: number;
  /** The grade under the boots in the direction of travel: + is uphill. */
  grade: number;
  sliding: boolean;
  /** Body lean the motion asks for, rad: forward +, and to the side. */
  lean: number;
  leanSide: number;
  /** The last step's length, m, and steps a second. */
  stride: number;
  cadence: number;
  /** 0…1 through the current step, and which boot is stepping. */
  stepPhase: number;
  stepSide: number;
  /** How hard the body is working, 0…1, instantaneous. */
  effort: number;
  /** A standing turn step is under way. */
  turning: boolean;
  /** A jump is in the air (not a bound). */
  jumping: boolean;
}

export interface StepEvent { x: number; y: number; z: number; yaw: number; side: number; hard: number }

export interface Vec3 { x: number; y: number; z: number }

export interface Locomotion {
  profile: GaitProfile;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  feet: [Foot, Foot];
  state: LocoState;
  onStep: ((e: StepEvent) => void) | null;
  setProfile: (p: GaitProfile) => void;
  /** Put the boots under the body where it stands now. */
  settleFeet: () => void;
  /** authority: 0 scripted (no control) … 1 full. */
  update: (dt: number, input: WalkInput, heightAt: (x: number, z: number) => number, colliders: Collider[], walkRadius: number, authority?: number) => void;
}

const SUIT_RADIUS = 0.55;
const HIP_W = 0.13;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.2;
/** How quickly the body tries to close the gap to the wanted velocity, s. */
const TAU = 0.09;
/** What boots standing still on regolith can hold against a slope. */
const SLIP_GRIP = 0.55;

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const smooth = (t: number) => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };

export function makeLocomotion(position: Vec3, velocity: Vec3, initial: GaitProfile): Locomotion {
  let P = initial;
  const foot = (side: number): Foot => ({ side, x: 0, y: 0, z: 0, planted: true, fromX: 0, fromY: 0, fromZ: 0, toX: 0, toZ: 0 });
  const feet: [Foot, Foot] = [foot(-1), foot(1)];
  const state: LocoState = {
    gait: 'stand', grounded: true, airborne: false, speed: 0, altitude: 0, landed: false, impact: 0, crouched: false,
    stumble: 0, fallen: false, getUp: 0, grade: 0, sliding: false, lean: 0, leanSide: 0, stride: 0, cadence: 0,
    stepPhase: 0, stepSide: 1, effort: 0, turning: false, jumping: false,
  };
  let coyote = 0;
  let jumpBuffer = 0;
  let stanceT = 0;
  let flightT = 0;
  let flightLen = 0.5;
  let walkDist = 0;
  let stepLen = 0.5;
  let swing = 0;
  let overLean = 0;
  let fallenT = 0;
  let turnT = 0;
  let turnFrom = 0;
  let turnTo = 0;
  let stepClock = 0;
  let lead = 1;

  const loco: Locomotion = {
    profile: P, position, velocity, yaw: 0, feet, state, onStep: null,
    setProfile(p) { P = p; loco.profile = p; },
    settleFeet() {
      const c = Math.cos(loco.yaw); const s = Math.sin(loco.yaw);
      for (const f of feet) {
        f.x = position.x + c * f.side * HIP_W; f.z = position.z - s * f.side * HIP_W; f.y = position.y;
        f.planted = true;
        f.fromX = f.toX = f.x; f.fromZ = f.toZ = f.z; f.fromY = f.y;
      }
      walkDist = 0; stanceT = 0; flightT = 0; turnT = 0;
      state.gait = 'stand';
    },
    update(dt, input, heightAt, colliders, walkRadius, authority = 1) {
      const g = P.bodyG;
      state.landed = false;
      state.impact = 0;
      state.stumble = Math.max(0, state.stumble - dt);
      if (state.getUp > 0) {
        state.getUp = Math.max(0, state.getUp - dt);
        if (state.getUp === 0) { state.fallen = false; state.gait = 'stand'; loco.settleFeet(); }
      }
      const auth = authority * (state.fallen ? 0 : state.stumble > 0 ? 0.2 : 1);
      const wantX = input.moveX * auth; const wantZ = input.moveZ * auth;
      const want = Math.min(1, Math.hypot(wantX, wantZ));
      const ground = heightAt(position.x, position.z);
      const wasGrounded = position.y <= ground + 1e-3 && velocity.y <= 0;
      coyote = wasGrounded ? COYOTE : Math.max(0, coyote - dt);
      if (input.jump && authority > 0) {
        // Asked mid-bound, the hop waits for the next touchdown.
        jumpBuffer = Math.max(JUMP_BUFFER, !wasGrounded && state.gait === 'bound' ? flightLen - flightT + 0.05 : 0);
      } else {
        jumpBuffer = Math.max(0, jumpBuffer - dt);
      }

      // ── Down: lie there until the stick or the jump asks to get up. ──
      if (state.fallen) {
        fallenT += dt;
        if (state.getUp === 0 && fallenT > 0.8 && authority > 0 && (Math.hypot(input.moveX, input.moveZ) > 0.3 || input.jump)) state.getUp = P.getUp;
      }

      // ── The ground: its slope, and the grade a stride ahead along the intent. ──
      const sx = (heightAt(position.x + 0.5, position.z) - heightAt(position.x - 0.5, position.z));
      const sz = (heightAt(position.x, position.z + 0.5) - heightAt(position.x, position.z - 0.5));
      const steep2 = sx * sx + sz * sz;
      if (want > 0.05 && wasGrounded) {
        const ax = position.x + (wantX / want) * 0.9;
        const az = position.z + (wantZ / want) * 0.9;
        state.grade += ((heightAt(ax, az) - ground) / 0.9 - state.grade) * (1 - Math.exp(-dt * 6));
      } else {
        state.grade += (0 - state.grade) * (1 - Math.exp(-dt * 4));
      }
      const crouched = input.crouch && wasGrounded && state.stumble <= 0 && !state.fallen;
      state.crouched = crouched;
      const hill = clamp(1 - state.grade * 0.9, 0.35, 1.15);
      const top = (crouched ? P.crouch : input.run ? P.run : P.walk) * hill;
      const tx = want > 0 ? (wantX / want) * top * want : 0;
      const tz = want > 0 ? (wantZ / want) * top * want : 0;
      const speed0 = Math.hypot(velocity.x, velocity.z);

      // ── Traction. Gravity pulls down the slope; the boots push back with
      // whatever friction the stance leg's loading gives, and the body only
      // leans so far on purpose. In the air there is almost nothing. ──
      const norm = 1 / Math.sqrt(1 + steep2);
      const gax = -g * sx * norm * norm; const gaz = -g * sz * norm * norm;
      let effort = 0;
      let leanWant = 0; let leanSide = 0;
      if (wasGrounded && !state.fallen) {
        const bounding = state.gait === 'bound';
        const load = bounding ? P.boundLoad : P.walkLoad;
        const grip = Math.min(P.muscle, P.grip * load * g * norm);
        const reversing = want > 0.3 && tx * velocity.x + tz * velocity.z < -0.2 * speed0 * top;
        const voluntary = Math.min(grip, g * Math.tan(P.leanMax));
        const stopping = want < 0.05;
        const cap = reversing ? grip : stopping ? Math.min(voluntary, P.brake) : voluntary;
        let cx = (tx - velocity.x) / TAU - gax;
        let cz = (tz - velocity.z) / TAU - gaz;
        const want2 = Math.hypot(cx, cz);
        // Starting off, the suit has to come round to the push first.
        if (speed0 < 0.5 && want > 0.05) {
          const err = Math.abs(wrap(Math.atan2(wantX, wantZ) - loco.yaw));
          const k = Math.max(0.75, Math.cos(Math.min(err, Math.PI / 2)));
          cx *= k; cz *= k;
        }
        // Along the motion the lean limits it; across it, the boot edges do.
        if (speed0 > 0.3) {
          const ux = velocity.x / speed0; const uz = velocity.z / speed0;
          const a = clamp(cx * ux + cz * uz, -cap, cap);
          let px = cx - ux * (cx * ux + cz * uz); let pz = cz - uz * (cx * ux + cz * uz);
          const pl = Math.hypot(px, pz);
          if (pl > grip) { px *= grip / pl; pz *= grip / pl; }
          cx = ux * a + px; cz = uz * a + pz;
        }
        const got = Math.hypot(cx, cz);
        if (got > grip) { cx *= grip / got; cz *= grip / got; }
        else if (speed0 <= 0.3 && got > cap) { cx *= cap / got; cz *= cap / got; }
        velocity.x += (cx + gax) * dt;
        velocity.z += (cz + gaz) * dt;
        // Standing still is a job too: past thirty degrees friction loses.
        state.sliding = Math.hypot(gax, gaz) > SLIP_GRIP * g * norm;
        const fx = Math.sin(loco.yaw); const fz = Math.cos(loco.yaw);
        const along = (cx * fx + cz * fz);
        leanWant = Math.atan2(along, g);
        leanSide = Math.atan2(cx * fz - cz * fx, g) * 0.5;
        // Hauling the stick round at a lope asks for more lean than a person has.
        const asked = Math.atan2(Math.min(want2, grip), g);
        if (reversing && speed0 > 0.6 * P.run && asked > P.leanMax) overLean += dt;
        else overLean = Math.max(0, overLean - dt * 2);
        if (overLean > 0.25 && state.stumble <= 0) {
          overLean = 0;
          const downhill = (sx * velocity.x + sz * velocity.z) / Math.max(0.01, speed0) < -0.2;
          if (downhill) fall();
          else state.stumble = 0.9;
        }
        effort = Math.min(1, got / Math.max(1, P.muscle) * 0.6 + speed0 / P.run * 0.45);
      } else if (!state.fallen) {
        const dvx = tx - velocity.x; const dvz = tz - velocity.z;
        const dv = Math.hypot(dvx, dvz);
        if (dv > 1e-6) { const step = Math.min(dv, P.air * dt); velocity.x += dvx / dv * step; velocity.z += dvz / dv * step; }
        state.sliding = false;
      } else {
        // On the ground: friction takes what is left of the motion.
        const sp = Math.hypot(velocity.x, velocity.z);
        const k = sp > 1e-6 ? Math.max(0, sp - P.grip * g * dt * 2) / sp : 0;
        velocity.x *= k; velocity.z *= k;
      }
      state.lean += (leanWant - state.lean) * (1 - Math.exp(-dt * 7));
      state.leanSide += (leanSide - state.leanSide) * (1 - Math.exp(-dt * 7));

      // ── Gait: a walk below the pendulum's limit, bounds above it. ──
      const speedNow = Math.hypot(velocity.x, velocity.z);
      if (wasGrounded && !state.fallen && !state.jumping) {
        if (state.gait === 'bound') {
          if (speedNow < P.walkLimit * 0.75 && top * want < P.walkLimit) { state.gait = speedNow > 0.08 ? 'walk' : 'stand'; beginWalk(); }
        } else if (!crouched && (speedNow > P.walkLimit || (top * want > P.walkLimit * 1.05 && speedNow > P.walkLimit * 0.7))) {
          state.gait = 'bound';
          stanceT = P.stance;
        } else {
          state.gait = speedNow > 0.08 || want > 0.05 ? 'walk' : 'stand';
        }
      }

      // ── Take-off: a hop, or the end of a bound's stance. ──
      let launched = false;
      if ((wasGrounded || coyote > 0) && jumpBuffer > 0 && !crouched && state.stumble <= 0 && !state.fallen && authority > 0.5 && velocity.y <= 0.01 && !state.jumping) {
        velocity.y = P.hop + P.runHop * Math.min(1, speedNow / P.run);
        jumpBuffer = 0; coyote = 0;
        state.jumping = true;
        state.gait = 'air';
        launched = true;
        effort = 1;
        liftAll();
      } else if (wasGrounded && state.gait === 'bound') {
        stanceT += dt;
        const braking = top * want < speedNow - 0.3;
        if (stanceT >= P.stance * (braking ? 1.8 : 1)) {
          // Turning, the bounds shorten so the boots are down more of the time.
          const align = want > 0.1 && speedNow > 0.1 ? Math.max(0, (tx * velocity.x + tz * velocity.z) / (top * want * speedNow)) : 1;
          flightLen = Math.max(0.05, (P.flightBase + P.flightPerSpeed * speedNow) * (0.35 + 0.65 * align));
          state.stride = speedNow * (flightLen + P.stance);
          velocity.y = g * flightLen / 2;
          flightT = 0;
          stanceT = 0;
          launched = true;
          effort = Math.max(effort, Math.min(1, velocity.y / 1.2));
          lead = -lead;
          liftAll();
        }
      }

      velocity.y -= g * dt;
      position.x += velocity.x * dt;
      position.z += velocity.z * dt;
      position.y += velocity.y * dt;
      const rr = Math.hypot(position.x, position.z);
      if (rr > walkRadius) {
        position.x *= walkRadius / rr; position.z *= walkRadius / rr;
        velocity.x *= 0.2; velocity.z *= 0.2;
      }
      for (const c of colliders) {
        const dx = position.x - c.x; const dz = position.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + SUIT_RADIUS;
        if (d < min && d > 1e-4) {
          const push = (min - d) / d;
          position.x += dx * push; position.z += dz * push;
          const vn = (velocity.x * dx + velocity.z * dz) / d;
          if (vn < 0) { velocity.x -= vn * dx / d; velocity.z -= vn * dz / d; }
        }
      }

      // ── Touching down. ──
      const g2 = heightAt(position.x, position.z);
      const airborneBefore = !wasGrounded;
      if (position.y <= g2) {
        const impact = -velocity.y;
        if (airborneBefore) {
          state.impact = impact;
          if (impact > P.hardLand) state.landed = true;
          if (impact > P.stumbleLand && !state.fallen) {
            state.stumble = Math.min(1.5, 0.5 + (impact - P.stumbleLand) * 0.3);
            velocity.x *= 0.45; velocity.z *= 0.45;
          }
          const hard = state.jumping || impact > P.hardLand ? Math.min(1, 0.55 + impact / (P.stumbleLand * 2)) : Math.min(1, 0.2 + speedNow / P.run * 0.5);
          const landing = state.gait === 'bound' && !P.skip ? [feet[lead > 0 ? 0 : 1]] : feet;
          for (const f of landing) plant(f, heightAt(f.x, f.z), hard);
          stepClock = markStep(stepClock);
          if (state.gait === 'air') state.gait = speedNow > P.walkLimit ? 'bound' : speedNow > 0.08 ? 'walk' : 'stand';
          if (state.gait === 'walk' || state.gait === 'stand') beginWalk();
          stanceT = 0;
        }
        position.y = g2;
        velocity.y = 0;
        state.jumping = false;
      } else if (wasGrounded && !launched && position.y - g2 < 0.25) {
        // Walking down a slope or off a step: keep the boots on it.
        position.y = g2;
        velocity.y = 0;
      }
      const speed = Math.hypot(velocity.x, velocity.z);
      const airborne = position.y > g2 + 0.02;
      state.airborne = airborne;
      state.grounded = !airborne;
      state.speed = speed;
      state.altitude = position.y - g2;
      state.effort = effort;
      if (airborne && state.gait === 'bound') flightT += dt;
      if (airborne && state.gait !== 'bound' && state.gait !== 'air' && position.y - g2 > 0.3) { state.gait = 'air'; liftAll(); }

      // ── Facing. Moving, the body turns to its own velocity at a rate the
      // suit allows; standing, it turns in steps. ──
      state.turning = false;
      if (authority > 0 && !state.fallen) {
        if (speed > 0.5) {
          turnT = 0;
          const d = wrap(Math.atan2(velocity.x, velocity.z) - loco.yaw);
          const cap = lerp(P.turnStill, P.turnRun, Math.min(1, speed / P.run)) * (airborne ? 0.3 : 1) * dt;
          loco.yaw = wrap(loco.yaw + clamp(d * (1 - Math.exp(-dt * 14)), -cap, cap));
        } else if (turnT > 0) {
          turnT = Math.max(0, turnT - dt);
          const k = smooth(1 - turnT / P.turnStep);
          loco.yaw = wrap(turnFrom + wrap(turnTo - turnFrom) * k);
          state.turning = true;
        } else if (want > 0.05 && !airborne) {
          const d = wrap(Math.atan2(wantX, wantZ) - loco.yaw);
          if (Math.abs(d) > 0.12) {
            turnFrom = loco.yaw;
            turnTo = wrap(loco.yaw + clamp(d, -P.turnChunk, P.turnChunk));
            turnT = P.turnStep;
            state.turning = true;
            // Each turn is a step: the boot on the inside of it moves first.
            const f = feet[d > 0 ? 0 : 1];
            if (feet[0].planted && feet[1].planted) { lift(f); swing = d > 0 ? 0 : 1; }
          }
        }
      }

      updateFeet(dt, heightAt, speed, airborne);
      state.cadence += (0 - state.cadence) * (1 - Math.exp(-dt * 0.4));
      stepClock += dt;
    },
  };

  function fall() {
    state.fallen = true;
    state.gait = 'fallen';
    state.getUp = 0;
    fallenT = 0;
    velocity.x *= 0.5; velocity.z *= 0.5;
    liftAll();
  }
  function lift(f: Foot) {
    if (!f.planted) return;
    f.planted = false;
    f.fromX = f.x; f.fromY = f.y; f.fromZ = f.z;
  }
  function liftAll() {
    for (const f of feet) { f.planted = false; f.fromX = f.x; f.fromY = f.y; f.fromZ = f.z; }
  }
  function plant(f: Foot, y: number, hard: number) {
    if (!f.planted) {
      f.planted = true;
      f.y = y;
      loco.onStep?.({ x: f.x, y, z: f.z, yaw: loco.yaw, side: f.side, hard });
    }
  }
  function markStep(since: number): number {
    if (since > 0.05 && since < 3) {
      state.cadence = 1 / since;
    }
    return 0;
  }
  function beginWalk() {
    walkDist = 0;
    // The boot further behind the direction of travel steps first.
    const vx = velocity.x; const vz = velocity.z;
    const back0 = (feet[0].x - position.x) * vx + (feet[0].z - position.z) * vz;
    const back1 = (feet[1].x - position.x) * vx + (feet[1].z - position.z) * vz;
    swing = back0 < back1 ? 0 : 1;
  }
  function neutral(f: Foot, yaw: number, x: number, z: number) {
    f.toX = x + Math.cos(yaw) * f.side * HIP_W;
    f.toZ = z - Math.sin(yaw) * f.side * HIP_W;
  }

  function updateFeet(dt: number, heightAt: (x: number, z: number) => number, speed: number, airborne: boolean) {
    const ux = speed > 1e-3 ? velocity.x / speed : Math.sin(loco.yaw);
    const uz = speed > 1e-3 ? velocity.z / speed : Math.cos(loco.yaw);
    const gait = state.gait;
    if (gait === 'fallen') {
      for (const f of feet) {
        neutral(f, loco.yaw, position.x - Math.sin(loco.yaw) * 0.55, position.z - Math.cos(loco.yaw) * 0.55);
        f.x += (f.toX - f.x) * (1 - Math.exp(-dt * 8)); f.z += (f.toZ - f.z) * (1 - Math.exp(-dt * 8));
        f.y = heightAt(f.x, f.z);
      }
      return;
    }
    if (gait === 'air') {
      // A hop or a drop: the boots come up under the body and reach for the ground.
      for (const f of feet) {
        neutral(f, loco.yaw, position.x + velocity.x * 0.12, position.z + velocity.z * 0.12);
        f.x += (f.toX - f.x) * (1 - Math.exp(-dt * 10)); f.z += (f.toZ - f.z) * (1 - Math.exp(-dt * 10));
        f.y = position.y + Math.min(0.25, state.altitude * 0.4);
      }
      state.stepPhase = 0;
      return;
    }
    if (gait === 'bound') {
      const inAir = airborne || state.altitude > 1e-3;
      // Time to touchdown from the ballistics, not the plan: the ground moves.
      const remain = (velocity.y + Math.sqrt(Math.max(0, velocity.y * velocity.y + 2 * P.bodyG * Math.max(0, state.altitude)))) / P.bodyG;
      const reachAhead = speed * P.stance * 0.5;
      const k = inAir ? smooth(flightT / Math.max(1e-3, flightT + remain)) : 0;
      state.stepPhase = inAir ? 0.5 + 0.5 * k : 0.5 * Math.min(1, stanceT / P.stance);
      for (const f of feet) {
        if (f.planted) continue;
        const ahead = reachAhead + (P.skip ? (f.side === lead ? 0.12 : -0.05) : 0.1);
        if (inAir) {
          // Reaching for where the body comes down.
          neutral(f, loco.yaw, position.x + velocity.x * remain + ux * ahead, position.z + velocity.z * remain + uz * ahead);
          f.x = lerp(f.fromX, f.toX, k);
          f.z = lerp(f.fromZ, f.toZ, k);
          const gy = heightAt(f.x, f.z);
          f.y = Math.max(gy, lerp(f.fromY, gy, k) + Math.sin(Math.PI * k) * 0.12);
        } else {
          // The boot still swinging through a running stance.
          neutral(f, loco.yaw, position.x + ux * ahead, position.z + uz * ahead);
          const r = 1 - Math.exp(-dt * 14);
          f.x += (f.toX - f.x) * r; f.z += (f.toZ - f.z) * r;
          f.y = heightAt(f.x, f.z) + 0.1;
        }
      }
      return;
    }
    // ── The walk: one boot planted, the other swinging to where the body
    // will be when it lands, half a step ahead. Standing still, the boots
    // settle under the hips, and a turn is taken a step at a time. ──
    stepLen = clamp(0.32 + 0.34 * speed, 0.3, P.reach);
    const f = feet[swing];
    const other = feet[1 - swing];
    if (speed > 0.08) {
      walkDist += speed * dt;
      if (f.planted) lift(f);
      const p = Math.min(1, walkDist / stepLen);
      const remainT = Math.max(0, stepLen - walkDist) / speed;
      neutral(f, loco.yaw, position.x + velocity.x * remainT + ux * stepLen * 0.5, position.z + velocity.z * remainT + uz * stepLen * 0.5);
      f.x = lerp(f.fromX, f.toX, smooth(p));
      f.z = lerp(f.fromZ, f.toZ, smooth(p));
      const gy = heightAt(f.x, f.z);
      f.y = lerp(f.fromY, gy, p) + Math.sin(Math.PI * p) * (P.suited ? 0.07 : 0.1);
      state.stepPhase = p;
      state.stepSide = f.side;
      if (walkDist >= stepLen) {
        walkDist -= stepLen;
        f.x = f.toX; f.z = f.toZ;
        plant(f, gy, Math.min(1, 0.12 + speed / P.run * 0.45));
        state.stride = stepLen;
        stepClock = markStep(stepClock);
        swing = 1 - swing;
        lift(other);
      }
      return;
    }
    // Standing or turning on the spot.
    walkDist = 0;
    const turningStep = turnT > 0;
    const dur = turningStep ? P.turnStep : 0.3;
    for (let i = 0; i < 2; i++) {
      const b = feet[i];
      neutral(b, turningStep ? turnTo : loco.yaw, position.x, position.z);
      if (b.planted) {
        const off = Math.hypot(b.x - b.toX, b.z - b.toZ);
        const other2 = feet[1 - i];
        if (off > (turningStep ? 0.12 : 0.28) && other2.planted) lift(b);
        continue;
      }
      const moved = Math.hypot(b.toX - b.fromX, b.toZ - b.fromZ);
      const step = (moved / dur + 0.4) * dt;
      const dx = b.toX - b.x; const dz = b.toZ - b.z;
      const d = Math.hypot(dx, dz);
      if (d <= step) {
        b.x = b.toX; b.z = b.toZ;
        plant(b, heightAt(b.x, b.z), 0.08);
      } else {
        b.x += dx / d * step; b.z += dz / d * step;
        const p = moved > 1e-3 ? 1 - d / moved : 1;
        b.y = lerp(b.fromY, heightAt(b.x, b.z), p) + Math.sin(Math.PI * clamp(p, 0, 1)) * 0.05;
      }
    }
    state.stepPhase = 0;
  }

  return loco;
}
