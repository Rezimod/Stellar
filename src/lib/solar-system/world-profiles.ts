// Two more places to set down. Everything that makes Mars Mars and Proxima b
// Proxima b — the pull, the sun, the sky, the colour of the ground, what is
// in the sky with you — is data here; the surface scene reads it and builds
// the same way for either.
//
// Mars is the real thing: 0.38 g, a small pale sun, a butterscotch sky that
// goes blue around the sun at the horizon (the dust scatters the other way
// round from air), Phobos crossing east to west in a few hours, rust plains
// with dark basalt and pale bedrock.
//
// Proxima b is the best guess for a tidally locked world round a red dwarf,
// seen from its terminator: a huge dim orange sun that never moves, sitting
// low; a sky that is salmon near it and violet overhead; Alpha Centauri A
// and B as a brilliant double star; aurorae from the star's flares; and a
// biosphere that photosynthesises under red light — so its leaves are near
// black — and talks to itself with light, so the twilight is full of colour.
//
// Earth is Tbilisi, and nothing on it is invented: the ground, the city and
// the sky come from baked open data and astronomy-engine (world-earth-*).
// The profile only holds what the shared rig reads before that loads.

import * as THREE from 'three';

export type WorldId = 'mars' | 'proximaB' | 'earth';

export interface SkyMoon {
  id: string;
  /** Apparent size in the sky, as a dome radius fraction, and colour. */
  size: number;
  color: number;
  /** Where it starts (unit direction) and its axis and rate of travel, rad/s. */
  dir: THREE.Vector3;
  axis: THREE.Vector3;
  rate: number;
  /** Irregular — a battered potato rather than a ball. */
  lumpy: boolean;
}

export interface SkyStar {
  dir: THREE.Vector3;
  color: THREE.Color;
  scale: number;
}

export interface WorldProfile {
  id: WorldId;
  gravity: number;
  sunDir: THREE.Vector3;
  sun: {
    /** The directional light. */
    color: number;
    intensity: number;
    /** The disc and its halo, as drawn. */
    disc: THREE.Color;
    discScale: number;
    halo: number;
    haloOpacity: number;
    haloScale: number;
  };
  sky: {
    zenith: THREE.Color;
    horizon: THREE.Color;
    /** The colour the sky takes near the sun, and how tight that is. */
    glow: THREE.Color;
    glowPower: number;
    /** Hemisphere fill: sky and ground, and how strong. */
    fillSky: number;
    fillGround: number;
    fill: number;
    fog: number;
    fogNear: number;
    fogFar: number;
    /** How much of the starfield shows through, 0…1. */
    stars: number;
    aurora: boolean;
    moons: SkyMoon[];
    stars2: SkyStar[];
  };
  ground: {
    /** Vertex colour bands: the plain, the dark patches, the pale streaks, in linear RGB. */
    plain: [number, number, number];
    dark: [number, number, number];
    pale: [number, number, number];
    /** The two rock cuts. */
    rockA: number;
    rockB: number;
    /** What blows up off the ground, and its dunes. */
    dust: [number, number, number];
    dunes: number;
    craters: number;
    relief: number;
    /** A basin that holds water: its centre, radius and surface height (Proxima only). */
    water: { x: number; z: number; r: number; level: number } | null;
    seed: number;
  };
  /** The suit's outside reading, °C, and how far the crew may walk, m. */
  ambientC: number;
  walkRadius: number;
  /** Where the descent aims. */
  pad: { x: number; z: number };
  /** Air to breathe: no helmet, no oxygen reading. */
  breathable?: boolean;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const c = (r: number, g: number, b: number) => new THREE.Color(r, g, b);

export const MARS: WorldProfile = {
  id: 'mars',
  gravity: 3.71,
  sunDir: v(-0.58, 0.52, 0.63),
  sun: {
    color: 0xfff1dc, intensity: 2.9,
    disc: c(5.2, 4.9, 4.4), discScale: 58,
    halo: 0x9fc4ff, haloOpacity: 0.18, haloScale: 300,
  },
  sky: {
    zenith: c(0.36, 0.25, 0.17), horizon: c(0.70, 0.52, 0.37),
    glow: c(0.55, 0.68, 0.95), glowPower: 14,
    fillSky: 0xb48d72, fillGround: 0x5e3a28, fill: 0.58,
    fog: 0xb5825f, fogNear: 70, fogFar: 1100,
    stars: 0,
    aurora: false,
    moons: [
      { id: 'phobos', size: 5.2, color: 0x6b625c, dir: v(0.62, 0.36, -0.4), axis: v(0.1, 1, 0.05), rate: 0.012, lumpy: true },
      { id: 'deimos', size: 1.8, color: 0x8a817a, dir: v(-0.3, 0.55, -0.7), axis: v(0, 1, 0), rate: -0.003, lumpy: true },
    ],
    stars2: [],
  },
  ground: {
    plain: [0.60, 0.39, 0.26], dark: [0.27, 0.18, 0.14], pale: [0.78, 0.64, 0.50],
    rockA: 0x4e3b33, rockB: 0x9c7a5c,
    dust: [0.66, 0.46, 0.32], dunes: 1.0, craters: 22, relief: 9,
    water: null, seed: 4311,
  },
  ambientC: -61,
  walkRadius: 165,
  pad: { x: 0, z: -6 },
};

export const PROXIMA_B: WorldProfile = {
  id: 'proximaB',
  gravity: 11.2,
  // Tidally locked: the star sits eleven degrees up and never moves.
  sunDir: v(0.74, 0.2, 0.64),
  sun: {
    color: 0xffb083, intensity: 2.1,
    disc: c(4.6, 1.9, 0.9), discScale: 190,
    halo: 0xff8a58, haloOpacity: 0.32, haloScale: 640,
  },
  sky: {
    zenith: c(0.07, 0.04, 0.18), horizon: c(0.58, 0.27, 0.25),
    glow: c(1.0, 0.55, 0.30), glowPower: 4.5,
    fillSky: 0x6b4a8c, fillGround: 0x2a1c2c, fill: 0.55,
    fog: 0x4a2a3e, fogNear: 160, fogFar: 1500,
    stars: 0.95,
    aurora: true,
    moons: [
      { id: 'proximaD', size: 3.4, color: 0x9c8f8a, dir: v(-0.55, 0.42, 0.5), axis: v(0.2, 1, 0), rate: 0.0016, lumpy: false },
    ],
    stars2: [
      { dir: v(-0.35, 0.62, -0.7), color: c(1.0, 0.96, 0.88), scale: 34 },
      { dir: v(-0.33, 0.6, -0.72), color: c(1.0, 0.78, 0.5), scale: 26 },
    ],
  },
  ground: {
    plain: [0.34, 0.22, 0.30], dark: [0.10, 0.08, 0.14], pale: [0.52, 0.42, 0.44],
    rockA: 0x3a2a44, rockB: 0x6a5468,
    dust: [0.42, 0.30, 0.38], dunes: 0.3, craters: 6, relief: 14,
    water: { x: 62, z: 48, r: 44, level: -2.6 }, seed: 7727,
  },
  ambientC: 12,
  walkRadius: 165,
  pad: { x: 0, z: -6 },
};

export const EARTH: WorldProfile = {
  id: 'earth',
  gravity: 9.81,
  // Replaced every frame by the real Sun over Tbilisi.
  sunDir: v(0.3, 0.6, 0.5),
  sun: {
    color: 0xfff4e6, intensity: 3,
    disc: c(5, 4.8, 4.5), discScale: 40,
    halo: 0xfff1d6, haloOpacity: 0.2, haloScale: 300,
  },
  sky: {
    zenith: c(0.18, 0.32, 0.62), horizon: c(0.62, 0.7, 0.8),
    glow: c(1, 0.95, 0.85), glowPower: 10,
    fillSky: 0xa9c4e8, fillGround: 0x6a5a48, fill: 0.6,
    fog: 0x9fb2c8, fogNear: 400, fogFar: 20000,
    stars: 0, aurora: false, moons: [], stars2: [],
  },
  ground: {
    plain: [0.3, 0.28, 0.24], dark: [0.2, 0.19, 0.17], pale: [0.4, 0.38, 0.34],
    rockA: 0x6a6258, rockB: 0x8a8074,
    dust: [0.42, 0.38, 0.32], dunes: 0, craters: 0, relief: 0,
    water: null, seed: 4144,
  },
  ambientC: 0,
  walkRadius: 1950,
  // The bake puts the pad at the origin; the descent aims 26 m on from here.
  pad: { x: 0, z: -26 },
  breathable: true,
};

export const WORLDS: Record<WorldId, WorldProfile> = { mars: MARS, proximaB: PROXIMA_B, earth: EARTH };

/** The bodies a ship can go down to, and how low it must be, km. Anywhere over Earth comes down in Tbilisi. */
export const LANDING_SITES: Record<string, number> = { moon: 2500, mars: 4200, proximaB: 4200, earth: 6000 };

export function isWorldId(id: string): id is WorldId {
  return id === 'mars' || id === 'proximaB' || id === 'earth';
}
