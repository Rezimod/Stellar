// The cosmonaut's movement, held to the physics it claims: one-sixth-g
// ballistics, traction-limited starts, stops and turns, boots that stay where
// they are planted, and the same controller in Earth gravity for the Backrooms.

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { gaitProfile, makeLocomotion, LUNAR_G, type GaitProfile, type WalkInput } from '@/lib/solar-system/suit-locomotion';
import type { DustHandle } from '@/lib/solar-system/moon-fx';

const DT = 1 / 120;
const flat = () => 0;
const input = (over: Partial<WalkInput> = {}): WalkInput => ({ moveX: 0, moveZ: 0, jump: false, run: false, crouch: false, work: false, ...over });

function walker(profile: GaitProfile) {
  const position = { x: 0, y: 0, z: 0 };
  const velocity = { x: 0, y: 0, z: 0 };
  const loco = makeLocomotion(position, velocity, profile);
  loco.settleFeet();
  const run = (seconds: number, over: Partial<WalkInput> = {}, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) { loco.update(DT, input(over), flat, [], 999); each?.(); }
  };
  return { loco, position, velocity, run };
}

/** Time in the air and the apex of a hop taken from where the walker is. */
function hop(w: ReturnType<typeof walker>, over: Partial<WalkInput> = {}) {
  let guard = 0;
  while (!w.loco.state.grounded && guard++ < 1000) w.run(DT, over);
  w.loco.update(DT, input({ ...over, jump: true }), flat, [], 999);
  let air = DT; let apex = 0;
  while (w.loco.state.airborne || air < 0.05) {
    w.run(DT, over);
    air += DT;
    apex = Math.max(apex, w.position.y);
    if (air > 10) break;
  }
  return { air, apex };
}

describe('the suit in one-sixth g', () => {
  const moon = gaitProfile(LUNAR_G, true);

  it('hops like Apollo: a small hop hangs 1.2–1.5 s, and the arc is the ballistic one', () => {
    const w = walker(moon);
    const { air, apex } = hop(w);
    expect(air).toBeGreaterThanOrEqual(1.2);
    expect(air).toBeLessThanOrEqual(1.5);
    // v = g·t/2 and h = v²/2g for the take-off speed the profile uses.
    expect(air).toBeCloseTo((2 * moon.hop) / LUNAR_G, 1);
    expect(apex).toBeCloseTo((moon.hop * moon.hop) / (2 * LUNAR_G), 1);
  });

  it('cannot walk faster than the pendulum allows: it lopes instead', () => {
    expect(moon.walkLimit).toBeCloseTo(Math.sqrt(0.5 * LUNAR_G * 0.9), 5);
    expect(moon.run).toBeLessThanOrEqual(2.3);
    const w = walker(moon);
    let flights = 0; let was = false;
    w.run(6, { moveZ: 1, run: true }, () => { if (w.loco.state.airborne && !was) flights += 1; was = w.loco.state.airborne; });
    expect(w.loco.state.gait).toBe('bound');
    expect(flights).toBeGreaterThan(3);
    expect(w.loco.state.speed).toBeGreaterThan(2);
  });

  it('is slow to start: traction, not a speed switch', () => {
    const w = walker(moon);
    w.run(0.25, { moveZ: 1 });
    expect(w.loco.state.speed).toBeLessThan(0.6);
    w.run(1.5, { moveZ: 1 });
    expect(w.loco.state.speed).toBeGreaterThan(moon.walk * 0.85);
  });

  it('takes real distance to stop from a lope, and never stops in the air', () => {
    const w = walker(moon);
    w.run(6, { moveZ: 1, run: true });
    const z0 = w.position.z;
    let t = 0;
    while ((w.loco.state.speed > 0.02 || w.loco.state.airborne) && t < 10) { w.run(DT); t += DT; }
    expect(w.position.z - z0).toBeGreaterThan(1.2);
    expect(t).toBeGreaterThan(1);
  });

  it('does not turn on the spot above walking speed', () => {
    const w = walker(moon);
    w.run(6, { moveZ: 1, run: true });
    const before = Math.atan2(w.velocity.x, w.velocity.z);
    w.run(0.25, { moveX: 1, run: true });
    const after = Math.atan2(w.velocity.x, w.velocity.z);
    expect(Math.abs(after - before)).toBeLessThan(0.5);
    // The facing follows at a rate the suit allows.
    const yaw0 = w.loco.yaw;
    w.run(0.25, { moveX: 1, run: true });
    expect(Math.abs(w.loco.yaw - yaw0)).toBeLessThanOrEqual(moon.turnStill * 0.25 + 1e-6);
  });

  it('turns standing still a step at a time', () => {
    const w = walker(moon);
    let t = 0;
    while (Math.abs(Math.abs(w.loco.yaw) - Math.PI) > 0.1 && t < 6) { w.run(DT, { moveZ: -0.3 }); t += DT; }
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(3);
  });

  it('keeps a planted boot exactly where it was put', () => {
    for (const run of [false, true]) {
      const w = walker(moon);
      const last = w.loco.feet.map((f) => ({ x: f.x, z: f.z, planted: f.planted }));
      let worst = 0; let planted = 0;
      w.run(6, { moveZ: 1, run }, () => {
        w.loco.feet.forEach((f, i) => {
          if (f.planted && last[i].planted) { worst = Math.max(worst, Math.hypot(f.x - last[i].x, f.z - last[i].z) / DT); planted += 1; }
          last[i] = { x: f.x, z: f.z, planted: f.planted };
        });
      });
      expect(planted).toBeGreaterThan(100);
      expect(worst).toBeLessThan(1e-6);
    }
  });

  it('stumbles when the stick is hauled round at a full lope', () => {
    const w = walker(moon);
    w.run(6, { moveZ: 1, run: true });
    let stumbled = false;
    w.run(2, { moveZ: -1, run: true }, () => { stumbled ||= w.loco.state.stumble > 0 || w.loco.state.fallen; });
    expect(stumbled).toBe(true);
  });

  it('slides past about thirty degrees and holds below it', () => {
    const slope = (grade: number) => (x: number) => x * grade;
    for (const [grade, slides] of [[0.4, false], [0.8, true]] as const) {
      const w = walker(moon);
      for (let i = 0; i < 240; i++) w.loco.update(DT, input(), (x) => slope(grade)(x), [], 999);
      expect(w.loco.state.sliding).toBe(slides);
    }
  });
});

describe('Earth gravity, helmet off', () => {
  const earth = gaitProfile(9.81, false);
  const moon = gaitProfile(LUNAR_G, true);

  it('is an ordinary walk and run', () => {
    const w = walker(earth);
    w.run(0.3, { moveZ: 1 });
    expect(w.loco.state.speed).toBeGreaterThan(1.1);
    w.run(2, { moveZ: 1 });
    expect(w.loco.state.gait).toBe('walk');
    w.run(2, { moveZ: 1, run: true });
    expect(w.loco.state.speed).toBeGreaterThan(3.5);
  });

  it('hops a fraction of the time the suit hangs on the Moon', () => {
    const e = hop(walker(earth));
    const m = hop(walker(moon));
    expect(e.air).toBeLessThan(0.6);
    expect(m.air / e.air).toBeGreaterThan(2.4);
  });
});

describe('the suit on the mesh', () => {
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'createImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}) });
  const dust: DustHandle = { points: new THREE.Points(), burst: vi.fn(), update: vi.fn(), dispose: vi.fn() };

  it('puts the boot soles on the planted feet: no skating', async () => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
    const { makeCosmonaut } = await import('@/lib/solar-system/moon-cosmonaut');
    for (const [g, suited, run] of [[LUNAR_G, true, true], [9.81, false, false]] as const) {
      const c = makeCosmonaut(dust, true, g, suited);
      c.settle();
      const sole = new THREE.Vector3();
      let worst = 0; let n = 0;
      for (let i = 0; i < 900; i++) {
        c.update(DT, input({ moveZ: 1, run }), flat, [], 999);
        c.present(1);
        c.group.updateMatrixWorld(true);
        if (i < 300) continue;
        c.feet.forEach((f, k) => {
          if (!f.planted) return;
          c.ankles[k].localToWorld(sole.set(0, -0.12, 0));
          worst = Math.max(worst, Math.hypot(sole.x - f.x, sole.y - f.y, sole.z - f.z));
          n += 1;
        });
      }
      expect(n).toBeGreaterThan(100);
      expect(worst).toBeLessThan(0.03);
      c.dispose();
    }
    HTMLCanvasElement.prototype.getContext = getContext;
  });

  it('switches gravity both ways', async () => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
    const { makeCosmonaut } = await import('@/lib/solar-system/moon-cosmonaut');
    const c = makeCosmonaut(dust, true);
    expect(c.state.gravity).toBeCloseTo(LUNAR_G);
    c.setGravity(9.81, false);
    expect(c.state.gravity).toBeCloseTo(9.81);
    expect(c.profile.suited).toBe(false);
    c.setGravity(LUNAR_G, true);
    expect(c.profile.g).toBeCloseTo(LUNAR_G);
    c.dispose();
    HTMLCanvasElement.prototype.getContext = getContext;
  });
});
