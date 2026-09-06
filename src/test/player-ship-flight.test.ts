import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createFlightSession,
  createPlayerShip,
  FLIGHT_UNIT,
  KM_PER_SCENE_UNIT,
  type FlightBody,
  type FlightSession,
  type FlightWorld,
  type PlayerShipHandle,
} from '@/lib/solar-system/player-ship';
import type { AlienHandle } from '@/lib/solar-system/aliens';

const U = FLIGHT_UNIT;
const EARTH_R = 0.028;
const DT = 1 / 60;

// jsdom has no 2D canvas; the sprite textures only need a context that
// swallows calls, and the audio layer already guards a missing AudioContext.
beforeAll(() => {
  const ctx: unknown = new Proxy(
    {},
    {
      get: () => () => ctx,
      set: () => true,
    },
  );
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
});

const aliens = {
  group: new THREE.Group(),
  enemies: [],
  damage: () => false,
  spawnSparks: () => undefined,
  setHostile: () => undefined,
  update: () => undefined,
  dispose: () => undefined,
} as unknown as AlienHandle;

function body(id: string, x: number, radius: number, radiusKm: number, surfaceG: number, atmosphere: number): FlightBody {
  return { id, kind: 'planet', position: new THREE.Vector3(x, 0, 0), radius, radiusKm, surfaceG, atmosphere };
}

function makeWorld(): FlightWorld {
  const earth = body('earth', 1, EARTH_R, 6371, 9.81, 1.25);
  return {
    bodies: [body('sun', 0, 0.152, 696_000, 274, 1.3), earth],
    // Four Earth radii up on the +Z side, looking at the planet.
    home: { position: new THREE.Vector3(1, 0, EARTH_R * 5), lookAt: earth.position.clone(), yaw: 0 },
    jump: {
      name: 'alphaCentauri',
      distanceLy: 4.37,
      position: new THREE.Vector3(-14, -25, 8),
      lookAt: new THREE.Vector3(-15, -26, 8),
      yaw: 0,
    },
    systemName: 'sol',
  };
}

let session: FlightSession;
let ship: PlayerShipHandle;
let world: FlightWorld;
let camera: THREE.PerspectiveCamera;
let clock = 0;

const step = (n: number, dt = DT) => {
  for (let i = 0; i < n; i++) {
    clock += dt;
    ship.update(dt, clock, camera, aliens, world);
  }
};
const seconds = (s: number, dt = DT) => step(Math.round(s / dt), dt);
const heading = () => new THREE.Vector3(0, 0, 1).applyQuaternion(ship.group.quaternion);
/** Home looks straight at Earth; speed runs need open space ahead. */
const faceAway = () => ship.group.lookAt(new THREE.Vector3(1, 0, 10));

beforeEach(() => {
  session = createFlightSession();
  world = makeWorld();
  camera = new THREE.PerspectiveCamera(42, 1, 0.02, 64000);
  ship = createPlayerShip(session);
  ship.spawn(world.home);
  clock = 0;
});

describe('speed regimes', () => {
  it('cruise settles at its ceiling and reads out in km/s and c', () => {
    faceAway();
    session.input.thrust = 1;
    seconds(4);
    const tel = session.telemetry;
    expect(tel.mode).toBe('cruise');
    expect(tel.speed).toBeCloseTo(2.5, 1);
    expect(tel.speedKmS).toBeCloseTo(2.5 * U * KM_PER_SCENE_UNIT, 0);
    expect(tel.speedC).toBeCloseTo(tel.speedKmS / 299_792.458, 6);
  });

  it('fast mode reaches ten times cruise, boost more still', () => {
    faceAway();
    session.input.modeRequest = 'fast';
    session.input.thrust = 1;
    seconds(4);
    expect(session.telemetry.mode).toBe('fast');
    expect(session.telemetry.speed).toBeCloseTo(22, 0);
    session.input.boost = true;
    seconds(4);
    expect(session.telemetry.boost).toBe(true);
    expect(session.telemetry.speed).toBeCloseTo(34, 0);
  });

  it('turns slower at speed', () => {
    const start = heading();
    session.input.yaw = 1;
    seconds(1);
    const cruiseTurn = start.angleTo(heading());
    session.input.yaw = 0;
    seconds(1);
    ship.spawn(world.home);
    session.input.modeRequest = 'fast';
    step(1);
    const start2 = heading();
    session.input.yaw = 1;
    seconds(1);
    const fastTurn = start2.angleTo(heading());
    expect(cruiseTurn).toBeGreaterThan(0.5);
    expect(fastTurn / cruiseTurn).toBeCloseTo(0.55, 1);
  });
});

describe('hyperdrive', () => {
  it('is mass-locked inside three radii of a body', () => {
    ship.group.position.set(1, 0, EARTH_R * 3.5);
    session.input.modeRequest = 'jump';
    step(1);
    expect(session.telemetry.alert).toBe('masslock');
    expect(session.telemetry.mode).toBe('cruise');
    expect(session.telemetry.jumpPhase).toBe('none');
  });

  it('charges, travels to the latched destination and arrives at rest', () => {
    const destination = world.jump.position.clone();
    session.input.modeRequest = 'jump';
    step(1);
    expect(session.telemetry.jumpPhase).toBe('charge');
    expect(session.telemetry.alert).toBe('charging');
    expect(session.telemetry.mode).toBe('jump');
    seconds(2.5);
    expect(session.telemetry.jumpPhase).toBe('travel');
    expect(session.telemetry.speedC).toBeCloseTo(1, 6);
    // The world flips its idea of "the other system" mid-flight; the ship
    // must keep the destination it charged for.
    world.jump.position.set(1, 0, EARTH_R * 5);
    world.jump.name = 'sol';
    world.systemName = 'alphaCentauri';
    for (let i = 0; i < 300 && session.telemetry.jumpPhase !== 'none'; i++) step(1);
    // The very frame it drops out, the HUD banner must already name the
    // new system.
    expect(session.telemetry.jumpPhase).toBe('none');
    expect(session.telemetry.systemName).toBe('alphaCentauri');
    expect(session.telemetry.mode).toBe('cruise');
    expect(ship.group.position.distanceTo(destination)).toBeLessThan(1e-6);
    expect(session.telemetry.speed).toBe(0);
    expect(session.telemetry.alert).toBe('arrived');
    expect(session.telemetry.systemName).toBe('alphaCentauri');
    expect(heading().angleTo(new THREE.Vector3(-1, -1, 0).normalize())).toBeLessThan(0.01);
  });

  it('ignores regime requests while jumping', () => {
    session.input.modeRequest = 'jump';
    step(1);
    session.input.modeRequest = 'fast';
    seconds(1);
    expect(session.telemetry.mode).toBe('jump');
  });
});

describe('gravity and solid bodies', () => {
  it('pulls a coasting ship toward the nearest well', () => {
    const before = ship.group.position.distanceTo(world.bodies[1].position);
    seconds(5);
    const after = ship.group.position.distanceTo(world.bodies[1].position);
    expect(after).toBeLessThan(before);
    expect(session.telemetry.nearId).toBe('earth');
    expect(session.telemetry.nearAltKm).toBeLessThan(6371 * 4);
  });

  it('warns on a closing approach, then heats up in the atmosphere', () => {
    ship.group.position.set(1, 0, EARTH_R * 2.3);
    ship.group.lookAt(world.bodies[1].position);
    session.input.thrust = 1;
    seconds(1.5);
    expect(session.telemetry.alert).toBe('proximity');
    // Inside the air, still above the hull's own contact radius.
    ship.group.position.set(1, 0, EARTH_R * 1.2);
    session.input.thrust = 1;
    seconds(0.15);
    expect(session.telemetry.crashed).toBe(false);
    expect(session.telemetry.alert).toBe('entry');
    expect(session.telemetry.heat).toBeGreaterThan(0.05);
    expect(session.telemetry.hp).toBeLessThan(100);
  });

  it('crashes on contact, holds the wreck, then respawns at home', () => {
    ship.group.position.set(1, 0, EARTH_R * 1.6);
    ship.group.lookAt(world.bodies[1].position);
    session.input.modeRequest = 'fast';
    session.input.thrust = 1;
    let crashedAt = -1;
    for (let i = 0; i < 600 && crashedAt < 0; i++) {
      step(1);
      if (session.telemetry.crashed) crashedAt = i;
    }
    expect(crashedAt).toBeGreaterThan(0);
    expect(session.telemetry.hp).toBe(0);
    expect(session.telemetry.speed).toBe(0);
    expect(ship.group.visible).toBe(false);
    expect(ship.group.position.distanceTo(world.bodies[1].position)).toBeGreaterThan(EARTH_R);
    ship.takeDamage(50);
    expect(session.telemetry.hp).toBe(0);
    session.input.thrust = 0;
    seconds(3.7);
    expect(session.telemetry.crashed).toBe(false);
    expect(session.telemetry.hp).toBe(100);
    expect(ship.group.visible).toBe(true);
    expect(ship.group.position.distanceTo(world.home.position)).toBeLessThan(1e-4);
  });

  it('cannot tunnel through a small body between frames', () => {
    const pebble = body('pebble', 0, 0.004, 1000, 1, 1);
    world.bodies = [pebble];
    ship.group.position.set(-0.3, 0, 0);
    ship.group.lookAt(pebble.position);
    session.input.modeRequest = 'fast';
    session.input.boost = true;
    session.input.thrust = 1;
    // At the frame cap the ship covers ~0.02 per step — five pebble diameters.
    let crashed = false;
    for (let i = 0; i < 30 && !crashed; i++) {
      step(1, 0.1);
      crashed = session.telemetry.crashed;
    }
    expect(crashed).toBe(true);
    expect(ship.group.position.length()).toBeLessThan(0.01);
  });
});

describe('EVA and stations', () => {
  it('ejects into the suit, flies it, and boards again when close', () => {
    faceAway();
    session.input.eject = true;
    step(1);
    expect(session.telemetry.pilot).toBe('eva');
    expect(session.telemetry.canBoard).toBe(true);
    // The suit is slow and unarmed; the ship holds station behind it.
    session.input.thrust = 1;
    session.input.fire = true;
    seconds(9);
    expect(session.telemetry.speed).toBeCloseTo(0.5, 1);
    expect(session.telemetry.foilsOpen).toBe(false);
    expect(session.telemetry.canBoard).toBe(false);
    session.input.eject = true;
    step(1);
    expect(session.telemetry.pilot).toBe('eva');
    session.input.thrust = 0;
    session.input.fire = false;
    // Fast is for the ship only.
    session.input.modeRequest = 'fast';
    step(1);
    expect(session.telemetry.mode).toBe('cruise');
    // Walk back within range and climb aboard.
    ship.group.position.copy(ship.fxGroup.children.find((o) => o.name === 'cosmonaut')!.position);
    step(1);
    expect(session.telemetry.canBoard).toBe(true);
    session.input.eject = true;
    step(1);
    expect(session.telemetry.pilot).toBe('ship');
  });

  it('interceptor is the faster ship', () => {
    const fast = createFlightSession();
    fast.shipKind = 'interceptor';
    const other = createPlayerShip(fast);
    other.spawn(world.home);
    other.group.lookAt(new THREE.Vector3(1, 0, 10));
    fast.input.thrust = 1;
    for (let i = 0; i < 240; i++) other.update(DT, i * DT, camera, aliens, world);
    expect(fast.telemetry.speed).toBeCloseTo(3.0, 1);
    other.dispose();
  });

  it('ramming a station destroys both; shots wear one down', () => {
    const iss = body('iss', 1, 0.0015, 0.11, 0, 1);
    iss.kind = 'station';
    iss.position.set(1, 0, EARTH_R * 5 + 0.02);
    world.bodies.push(iss);
    ship.group.lookAt(iss.position);
    session.input.thrust = 1;
    seconds(3);
    expect(session.telemetry.crashed).toBe(true);
    expect(iss.destroyed).toBe(true);
  });

  it('bolts spark off bodies and take a station apart', () => {
    const iss = body('iss', 1, 0.0015, 0.11, 0, 1);
    iss.kind = 'station';
    iss.position.set(1, 0, EARTH_R * 5 + 0.03);
    world.bodies.push(iss);
    ship.group.lookAt(iss.position);
    session.input.fire = true;
    seconds(3);
    expect(iss.destroyed).toBe(true);
    expect(session.telemetry.crashed).toBe(false);
  });
});

describe('cockpit and radio', () => {
  it('toggles into the cockpit and hides the hull mesh', () => {
    session.input.viewToggle = true;
    step(1);
    expect(session.telemetry.view).toBe('cockpit');
    expect(ship.group.visible).toBe(false);
    // The eye sits inside the hull, not behind it.
    expect(camera.position.distanceTo(ship.group.position)).toBeLessThan(0.002);
    session.input.viewToggle = true;
    step(1);
    expect(session.telemetry.view).toBe('chase');
    expect(ship.group.visible).toBe(true);
  });

  it('an inhabited world opens a channel, speaks four lines, then signs off', () => {
    const home = body('centauriPrime', 1, EARTH_R, 7327, 9.9, 1.25);
    home.hails = true;
    home.position.set(1, 0, EARTH_R * 11);
    world.bodies.push(home);
    step(1);
    expect(session.telemetry.commsFrom).toBe('centauriPrime');
    expect(session.telemetry.commsLine).toBe(0);
    seconds(1);
    expect(session.telemetry.commsLine).toBe(1);
    seconds(1);
    expect(session.telemetry.commsProgress).toBeGreaterThan(0.2);
    seconds(16);
    expect(session.telemetry.commsLine).toBe(4);
    seconds(4);
    expect(session.telemetry.commsFrom).toBe('');
    // Quiet afterwards — no second hail straight away.
    seconds(2);
    expect(session.telemetry.commsFrom).toBe('');
  });
});

describe('hull and S-foils', () => {
  it('enemy fire and heat never destroy the ship', () => {
    ship.takeDamage(500);
    expect(session.telemetry.hp).toBe(15);
    expect(session.telemetry.crashed).toBe(false);
  });

  it('opens the foils to fight and locks them for speed', () => {
    session.input.fire = true;
    seconds(2);
    expect(session.telemetry.foilsOpen).toBe(true);
    session.input.fire = false;
    session.input.modeRequest = 'fast';
    seconds(2);
    expect(session.telemetry.foilsOpen).toBe(false);
    session.input.foilsToggle = true;
    seconds(2);
    expect(session.telemetry.foilsOpen).toBe(true);
  });
});
