import * as THREE from 'three';
import {
  Body,
  HelioVector,
  JupiterMoons,
  Rotation_EQJ_ECL,
  RotateVector,
  Vector,
} from 'astronomy-engine';

/** J2000 mean ecliptic → Three.js Y-up (ecliptic plane mostly XZ). */
const ROT_EQJ_ECL = Rotation_EQJ_ECL();

export type SolarBodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'comet';

export type ScaleMode = 'orrery' | 'linear';

/** Mean radii (km) for display sizing — not to scale with orbit compression. */
export const MEAN_RADIUS_KM: Record<Exclude<SolarBodyId, 'io' | 'europa' | 'ganymede' | 'callisto'>, number> = {
  sun: 696_000,
  mercury: 2_439,
  venus: 6_052,
  earth: 6_371,
  moon: 1_737,
  mars: 3_390,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
  pluto: 1_188,
  /** Illustrative nucleus scale (~few km); visual size is boosted in scene. */
  comet: 5,
};

const MOON_RADIUS_KM = { io: 1_821.6, europa: 1_560.8, ganymede: 2_631.2, callisto: 2_410.3 } as const;

export const GALILEAN_MEAN_RADIUS_KM = MOON_RADIUS_KM;

function helioEqjToThree(vec: Vector): THREE.Vector3 {
  const e = RotateVector(ROT_EQJ_ECL, vec);
  return new THREE.Vector3(e.x, e.z, -e.y);
}

/**
 * Map heliocentric distance (AU) to scene radius while preserving direction.
 * `orrery` compresses outer system like pocket-planetarium apps; `linear` is true AU × factor.
 */
export function sceneRadiusFromAu(distanceAu: number, mode: ScaleMode): number {
  const d = Math.max(distanceAu, 0.0008);
  if (mode === 'linear') return d * 0.58;
  return 1.02 * Math.pow(d, 0.435);
}

export function helioScenePosition(helioEqj: Vector, mode: ScaleMode): THREE.Vector3 {
  const v = helioEqjToThree(helioEqj);
  const au = v.length();
  if (au < 1e-12) return new THREE.Vector3(0, 0, 0);
  v.normalize();
  v.multiplyScalar(sceneRadiusFromAu(au, mode));
  return v;
}

function addEqj(a: Vector, bx: number, by: number, bz: number): Vector {
  return new Vector(a.x + bx, a.y + by, a.z + bz, a.t);
}

export interface BodySceneSample {
  id: SolarBodyId;
  position: THREE.Vector3;
  /** AU before scene compression (for readouts). */
  helioDistanceAu: number;
}

const GALILEAN: { id: 'io' | 'europa' | 'ganymede' | 'callisto'; key: keyof ReturnType<typeof JupiterMoons> }[] = [
  { id: 'io', key: 'io' },
  { id: 'europa', key: 'europa' },
  { id: 'ganymede', key: 'ganymede' },
  { id: 'callisto', key: 'callisto' },
];

/**
 * Positions for the main solar-system mesh graph at `date`.
 * Galilean moon offsets are exaggerated for legibility on small screens.
 */
export function sampleSolarSystem(date: Date, mode: ScaleMode, includePluto: boolean): BodySceneSample[] {
  const out: BodySceneSample[] = [];

  const sunVec = HelioVector(Body.Sun, date);
  const sunHelioAu = helioEqjToThree(sunVec).length();
  out.push({
    id: 'sun',
    position: new THREE.Vector3(0, 0, 0),
    helioDistanceAu: sunHelioAu,
  });

  const majors: { id: SolarBodyId; body: Body }[] = [
    { id: 'mercury', body: Body.Mercury },
    { id: 'venus', body: Body.Venus },
    { id: 'earth', body: Body.Earth },
    { id: 'moon', body: Body.Moon },
    { id: 'mars', body: Body.Mars },
    { id: 'jupiter', body: Body.Jupiter },
    { id: 'saturn', body: Body.Saturn },
    { id: 'uranus', body: Body.Uranus },
    { id: 'neptune', body: Body.Neptune },
  ];
  if (includePluto) majors.push({ id: 'pluto', body: Body.Pluto });

  const helioScene = new Map<SolarBodyId, THREE.Vector3>();

  for (const { id, body } of majors) {
    const hv = HelioVector(body, date);
    const rawThree = helioEqjToThree(hv);
    const au = rawThree.length();
    const pos = helioScenePosition(hv, mode);
    helioScene.set(id, pos);
    out.push({ id, position: pos.clone(), helioDistanceAu: au });
  }

  /* Moon sits almost on top of Earth in compressed orrery space — nudge outward
   * so it reads as a distinct far orbit (still same ephemeris direction). */
  const earthSample = out.find((s) => s.id === 'earth');
  const moonSample = out.find((s) => s.id === 'moon');
  if (earthSample && moonSample) {
    const off = moonSample.position.clone().sub(earthSample.position);
    const d = off.length();
    const re = worldRadiusForBody('earth');
    const minSep = re * 6.8;
    if (d < minSep) {
      if (d > 1e-8) off.normalize();
      else off.set(0.62, 0.1, 0.78).normalize();
      moonSample.position.copy(earthSample.position).add(off.multiplyScalar(minSep));
    }
  }

  const jupiterHelio = HelioVector(Body.Jupiter, date);
  const jupiterScene = helioScene.get('jupiter');
  if (jupiterScene) {
    const moons = JupiterMoons(date);
    for (const { id, key } of GALILEAN) {
      const sv = moons[key];
      const combined = addEqj(jupiterHelio, sv.x, sv.y, sv.z);
      const trueOffset = helioScenePosition(combined, mode).sub(jupiterScene);
      const len = trueOffset.length();
      const boost = len < 0.01 ? 18 : len < 0.22 ? 10 : 4.2;
      const pos = jupiterScene.clone().add(trueOffset.multiplyScalar(boost));
      const distAu = helioEqjToThree(combined).length();
      out.push({ id, position: pos, helioDistanceAu: distAu });
    }
  }

  const earthRef = HelioVector(Body.Earth, date);
  const M = ((date.getTime() % 24_000_000) / 24_000_000) * Math.PI * 2;
  const aAu = 14;
  const e = 0.91;
  const rAu = aAu * (1 - e * e) / (1 + e * Math.cos(M));
  const cometEqj = new Vector(
    rAu * Math.cos(M + 0.45),
    rAu * 0.11 * Math.sin(M * 1.4),
    rAu * Math.sin(M + 0.45),
    earthRef.t,
  );
  const cometAu = helioEqjToThree(cometEqj).length();
  out.push({
    id: 'comet',
    position: helioScenePosition(cometEqj, mode).clone(),
    helioDistanceAu: cometAu,
  });

  return out;
}

export function worldRadiusForBody(id: SolarBodyId): number {
  if (id === 'comet') return 0.016;
  if (id === 'io' || id === 'europa' || id === 'ganymede' || id === 'callisto') {
    const km = MOON_RADIUS_KM[id];
    return 0.018 * Math.pow(km / 2_000, 0.38);
  }
  const km = MEAN_RADIUS_KM[id as keyof typeof MEAN_RADIUS_KM];
  return 0.028 * Math.pow(km / 6_371, 0.36);
}

export function bodyColor(id: SolarBodyId): number {
  switch (id) {
    case 'sun': return 0xf6c15c;
    case 'mercury': return 0xb5b8bc;
    case 'venus': return 0xe4d6b8;
    case 'earth': return 0x4a7cbf;
    case 'moon': return 0xc8cad1;
    case 'mars': return 0xc45c3e;
    case 'jupiter': return 0xc4a574;
    case 'saturn': return 0xd8c896;
    case 'uranus': return 0x7eb8c6;
    case 'neptune': return 0x3f5fbd;
    case 'pluto': return 0xb9a89a;
    case 'io': return 0xd9b566;
    case 'europa': return 0xa8c4dc;
    case 'ganymede': return 0x8f9fb0;
    case 'callisto': return 0x6a5a4f;
    case 'comet': return 0xc8dce8;
    default: return 0x8899aa;
  }
}
