// The expedition, the rover's gearbox, and the landing — the three pieces of
// Moon Mode that have rules rather than pixels.

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMission, missionComplete, SURVEY_SITE, ANOMALY_SITE } from '@/lib/solar-system/moon-mission';
import { makeRover, type RoverParts } from '@/lib/solar-system/moon-rover';
import { makeLander } from '@/lib/solar-system/moon-lander';
import type { DustHandle } from '@/lib/solar-system/moon-fx';
import type { TerrainHandle } from '@/lib/solar-system/moon-terrain';
import type { PrintsHandle } from '@/lib/solar-system/moon-prints';
import type { Collider } from '@/lib/solar-system/moon-cosmonaut';

const flat = () => 0;
const stamp = vi.fn();
const dust: DustHandle = {
  points: new THREE.Points(),
  burst: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn(),
};

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

/** Run the mission for a while with the crew standing somewhere. */
function run(m: ReturnType<typeof makeMission>, seconds: number, x: number, z: number, working: boolean) {
  const dt = 1 / 30;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    m.update(dt, i * dt, { crewX: x, crewZ: z, working, driving: false });
  }
}

describe('the expedition', () => {
  it('sends the crew to the drill site first, and says how far it is', () => {
    const m = makeMission(flat, stamp, dust, true);
    run(m, 0.1, 0, 0, false);
    expect(m.telemetry.stage).toBe('survey');
    expect(m.telemetry.hasMarker).toBe(true);
    expect(m.telemetry.distance).toBeCloseTo(Math.hypot(SURVEY_SITE.x, SURVEY_SITE.y), 0);
    m.dispose();
  });

  it('walks act by act from the survey stake to first contact', () => {
    const m = makeMission(flat, stamp, dust, true);
    // Arrive at the stake: the drill is deployed.
    run(m, 0.1, SURVEY_SITE.x, SURVEY_SITE.y, false);
    expect(m.telemetry.stage).toBe('drill');
    expect(m.telemetry.task).toBe('drill');
    // Standing there doing nothing gets no core.
    run(m, 4, SURVEY_SITE.x, SURVEY_SITE.y, false);
    expect(m.telemetry.stage).toBe('drill');
    // Hold the drill: the core comes up and the bearing changes.
    run(m, 9, SURVEY_SITE.x, SURVEY_SITE.y, true);
    expect(m.telemetry.stage).toBe('trace');
    expect(m.telemetry.rewards).toContain('core');
    run(m, 0.1, 0, 0, false);
    expect(m.telemetry.distance).toBeCloseTo(Math.hypot(ANOMALY_SITE.x, ANOMALY_SITE.y), 0);
    // The crater, then the sweep, then the step through the seam.
    run(m, 0.1, ANOMALY_SITE.x, ANOMALY_SITE.y, false);
    expect(m.telemetry.stage).toBe('excavate');
    run(m, 10, ANOMALY_SITE.x, ANOMALY_SITE.y, true);
    expect(m.telemetry.stage).toBe('contact');
    // Standing on the hull is not standing in the doorway.
    run(m, 2, ANOMALY_SITE.x, ANOMALY_SITE.y, false);
    expect(m.telemetry.stage).toBe('contact');
    // The marker has moved to the seam; walk to it and the door takes you.
    run(m, 3, m.marker!.x, m.marker!.z, false);
    expect(m.telemetry.stage).toBe('done');
    expect(m.telemetry.complete).toBe(true);
    expect(m.telemetry.rewards).toEqual(['core', 'hull', 'contact']);
    m.dispose();
  });

  it('will not let the drill be turned from the saddle', () => {
    const m = makeMission(flat, stamp, dust, true);
    run(m, 0.1, SURVEY_SITE.x, SURVEY_SITE.y, false);
    const dt = 1 / 30;
    for (let i = 0; i < 400; i++) m.update(dt, i * dt, { crewX: SURVEY_SITE.x, crewZ: SURVEY_SITE.y, working: true, driving: true });
    expect(m.telemetry.stage).toBe('drill');
    expect(m.telemetry.work).toBe(0);
    m.dispose();
  });

  it('keeps what the crew earned across a reload', () => {
    const first = makeMission(flat, stamp, dust, true);
    run(first, 0.1, SURVEY_SITE.x, SURVEY_SITE.y, false);
    run(first, 9, SURVEY_SITE.x, SURVEY_SITE.y, true);
    first.dispose();
    expect(missionComplete()).toBe(false);
    const second = makeMission(flat, stamp, dust, true);
    expect(second.telemetry.stage).toBe('trace');
    expect(second.telemetry.rewards).toContain('core');
    second.dispose();
  });

  it('unlocks the fourth gear only once contact has been made', () => {
    expect(missionComplete()).toBe(false);
    localStorage.setItem('stellar_moon_expedition_v1', JSON.stringify({ stage: 'done', rewards: ['core', 'hull', 'contact'] }));
    expect(missionComplete()).toBe(true);
  });

  it('starts from the beginning when the stored progress is nonsense', () => {
    localStorage.setItem('stellar_moon_expedition_v1', '{"stage":"eaten by a grue","rewards":"none"}');
    const m = makeMission(flat, stamp, dust, true);
    expect(m.telemetry.stage).toBe('survey');
    expect(m.telemetry.rewards).toEqual([]);
    m.dispose();
  });
});

/** The rover needs a set of parts to articulate; none of them matter here. */
function roverParts(): RoverParts {
  const obj = () => new THREE.Object3D();
  return {
    spin: [obj(), obj(), obj(), obj(), obj(), obj()],
    steer: [obj(), obj(), obj(), obj()],
    rockers: [obj(), obj()],
    bogies: [obj(), obj()],
    wheelXZ: [[-1.35, 1.55], [-1.35, -0.2], [-1.35, -1.55], [1.35, 1.55], [1.35, -0.2], [1.35, -1.55]],
    mast: obj(),
    headlight: new THREE.SpotLight(),
    arm: [obj(), obj()],
    brakeLight: new THREE.MeshStandardMaterial(),
  };
}
const terrain = {
  heightAt: () => 0,
  normalAt: (_x: number, _z: number, out: THREE.Vector3) => out.set(0, 1, 0),
} as unknown as TerrainHandle;
const prints = { track: vi.fn(), stamp: vi.fn() } as unknown as PrintsHandle;

function driveFor(seconds: number, gears?: string[]) {
  const group = new THREE.Group();
  const collider: Collider = { x: 0, z: 0, r: 2.8 };
  const rover = makeRover(group, collider, roverParts(), terrain, dust, prints, gears as never);
  return { rover, group, run: (s: number, throttle: number, steer = 0) => {
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(s / dt); i++) rover.update(dt, throttle, steer, [collider], 165);
  }, seconds };
}

describe('the rover gearbox', () => {
  it('holds each gear to its own top speed', () => {
    const tops: number[] = [];
    for (const gear of ['creep', 'cruise', 'sprint'] as const) {
      const d = driveFor(0);
      d.rover.driving = true;
      d.rover.select(['creep', 'cruise', 'sprint'].indexOf(gear));
      // Six seconds is past every gear's run up to its top, and short of
      // the walk radius the map stops it at.
      d.run(6, 1);
      tops.push(d.rover.speed);
    }
    expect(tops[0]).toBeGreaterThan(2.5);
    expect(tops[0]).toBeLessThan(3.2);
    expect(tops[1]).toBeGreaterThan(7.5);
    expect(tops[1]).toBeLessThan(8.2);
    expect(tops[2]).toBeGreaterThan(14);
    expect(tops[2]).toBeLessThan(15.2);
  });

  it('will not shift past the gears this crew has', () => {
    const d = driveFor(0);
    expect(d.rover.gears).toHaveLength(3);
    d.rover.shift(1); d.rover.shift(1); d.rover.shift(1);
    expect(d.rover.gear).toBe('sprint');
    d.rover.shift(-9);
    expect(d.rover.gear).toBe('creep');
  });

  it('gives the fourth gear its own, much higher top', () => {
    const d = driveFor(0, ['creep', 'cruise', 'sprint', 'ion']);
    d.rover.driving = true;
    d.rover.select(3);
    expect(d.rover.gear).toBe('ion');
    d.run(6, 1);
    expect(d.rover.speed).toBeGreaterThan(24);
  });

  it('coasts to a stop when nobody is driving it', () => {
    const d = driveFor(0);
    d.rover.driving = true;
    d.run(6, 1);
    expect(d.rover.speed).toBeGreaterThan(5);
    d.rover.driving = false;
    d.run(6, 0);
    expect(Math.abs(d.rover.speed)).toBeLessThan(0.1);
  });
});

describe('the landing', () => {
  const fly = (throttle: () => number, seconds = 60) => {
    const lander = makeLander(0, 0, flat, dust, true);
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(seconds / dt) && !lander.telemetry.landed; i++) {
      lander.update(dt, { throttle: throttle(), moveX: 0, moveY: 0 }, flat);
    }
    return lander;
  };

  it('never lets a pilot who does nothing at all crash', () => {
    const l = fly(() => 0);
    expect(l.telemetry.landed).toBe(true);
    expect(l.telemetry.assist).toBe(true);
    expect(l.telemetry.touchdown).toBeLessThan(2.5);
    l.dispose();
  });

  it('lets a pilot who flies it down keep the stick all the way', () => {
    const l = makeLander(0, 0, flat, dust, true);
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 90 && !l.telemetry.landed; i++) {
      // Fly the braking profile by hand, a little inside the one the computer
      // would take, and null the drift out on the way down: guidance then
      // never has cause to step in.
      const tel = l.telemetry;
      const want = Math.max(0.45, Math.sqrt(2 * (3.9 - 1.62) * Math.max(0, tel.altitude - 1.2)) * 0.68);
      l.update(dt, {
        throttle: tel.descent > want ? 1 : 0.2,
        moveX: Math.max(-1, Math.min(1, -l.position.x * 0.1 - tel.driftX * 0.9)),
        moveY: Math.max(-1, Math.min(1, l.position.z * 0.1 + tel.driftZ * 0.9)),
      }, flat);
    }
    expect(l.telemetry.landed).toBe(true);
    expect(l.telemetry.assist).toBe(false);
    expect(l.telemetry.touchdown).toBeLessThan(1);
    expect(l.telemetry.offset).toBeLessThan(32);
    l.dispose();
  });

  it('burns fuel only when the engine is lit', () => {
    const l = makeLander(0, 0, flat, dust, true);
    const dt = 1 / 60;
    for (let i = 0; i < 120; i++) l.update(dt, { throttle: 0, moveX: 0, moveY: 0 }, flat);
    expect(l.telemetry.fuel).toBe(1);
    for (let i = 0; i < 120; i++) l.update(dt, { throttle: 1, moveX: 0, moveY: 0 }, flat);
    expect(l.telemetry.fuel).toBeLessThan(1);
    l.dispose();
  });

  it('puts the crew out beside the vehicle it actually came down on', () => {
    const l = fly(() => 0);
    expect(Math.hypot(l.telemetry.egressX - l.position.x, l.telemetry.egressZ - l.position.z)).toBeCloseTo(6.5, 1);
    l.dispose();
  });
});
