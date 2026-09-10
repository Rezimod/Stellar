/**
 * The sky as a place the camera is pointed at, not a picture that appears
 * when a GoTo finishes.
 *
 * Everything that can be in the frame — the real objects at their true
 * positions, and an anonymous field of faint stars fixed to the sky — is a
 * horizon coordinate the renderer projects around the current pointing.
 * Slew by hand and the field flows past at the commanded rate; leave the
 * mount untracked and it drifts at sidereal rate; track a target and it
 * holds. None of that needs a special case once the sky is fixed to the sky
 * and the pointing is the thing that moves.
 */

import { Body, Equator, Horizon, Illumination, Observer } from 'astronomy-engine';
import { BRIGHT_STARS } from '@/lib/sky/stars';
import { raDecToAzAlt } from '@/lib/sky/catalog';
import { TARGET_PHOTOS } from '@/lib/sky/target-photos';
import { galileanMoons } from './jupiter-moons';
import { apparentDiameterArcsec } from './optics';
import type { AltAz } from './safety';
import type { ObservatoryNode } from './types';

const DEG = Math.PI / 180;

export type Equatorial = { raHours: number; decDeg: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Horizon to equatorial of date, no refraction. The anonymous field only has
 * to agree with itself, and this is the inverse of `raDecToAltAz` below.
 */
export function altAzToRaDec(p: AltAz, latDeg: number, lstHours: number): Equatorial {
  const a = p.altitude * DEG;
  const A = p.azimuth * DEG;
  const phi = latDeg * DEG;
  const sinDec = Math.sin(a) * Math.sin(phi) + Math.cos(a) * Math.cos(phi) * Math.cos(A);
  const dec = Math.asin(clamp(sinDec, -1, 1));
  // Hour angle, with both parts scaled by cos(dec) so the quadrant survives.
  const y = -Math.sin(A) * Math.cos(a);
  const x = (Math.sin(a) - Math.sin(phi) * sinDec) / Math.cos(phi);
  const haHours = Math.atan2(y, x) / (15 * DEG);
  return { raHours: (((lstHours - haHours) % 24) + 24) % 24, decDeg: dec / DEG };
}

/** Equatorial of date to horizon, no refraction. */
export function raDecToAltAz(eq: Equatorial, latDeg: number, lstHours: number): AltAz {
  const ha = (lstHours - eq.raHours) * 15 * DEG;
  const dec = eq.decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAlt = Math.cos(alt);
  const sinAz = (-Math.cos(dec) * Math.sin(ha)) / cosAlt;
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (cosAlt * Math.cos(lat));
  const az = Math.atan2(sinAz, cosAz) / DEG;
  return { altitude: alt / DEG, azimuth: ((az % 360) + 360) % 360 };
}

/**
 * Where `p` sits relative to `centre` on the sensor, in degrees: x to the
 * right (increasing azimuth), y up (increasing altitude). This is the tangent
 * plane of an altazimuth camera — the frame is square to the fork, so the
 * sky's north is wherever the parallactic angle puts it.
 */
export function tangentOffsetDeg(centre: AltAz, p: AltAz): { x: number; y: number } {
  let dAz = p.azimuth - centre.azimuth;
  if (dAz > 180) dAz -= 360;
  if (dAz < -180) dAz += 360;
  return { x: dAz * Math.cos(centre.altitude * DEG), y: p.altitude - centre.altitude };
}

/**
 * Screen angle from frame-up to celestial north at the pointing, degrees,
 * clockwise positive. Found numerically: nudge the pointing north on the
 * sky and see which way it moved on the sensor. No sign conventions to get
 * wrong, and the photos rotate exactly as the field they sit in.
 */
export function northAngleDeg(p: AltAz, latDeg: number, lstHours: number): number {
  const eq = altAzToRaDec(p, latDeg, lstHours);
  const north = raDecToAltAz({ raHours: eq.raHours, decDeg: Math.min(89.95, eq.decDeg + 0.05) }, latDeg, lstHours);
  const d = tangentOffsetDeg(p, north);
  return Math.atan2(d.x, d.y) / DEG;
}

/* --- the anonymous field ---------------------------------------------- */

export type FieldStar = {
  raHours: number;
  decDeg: number;
  mag: number;
  /** 0 is blue-white, 1 is orange. */
  tint: number;
};

/** Cells are a quarter degree on a side, about a frame at native focal length. */
const CELL_DEG = 0.25;
const FAINTEST_MAG = 16;
const BRIGHTEST_FIELD_MAG = 4;
/** Average stellar density: log10 N(<m) per square degree ≈ 0.36 m − 2.7. */
const densityBelow = (mag: number) => Math.pow(10, 0.36 * mag - 2.7);

const cellCache = new Map<string, FieldStar[]>();

/** Mulberry32. Repeatable, so a field looks the same every time the mount returns to it. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellStars(ring: number, col: number, cols: number): FieldStar[] {
  const key = `${ring}:${col}`;
  const cached = cellCache.get(key);
  if (cached) return cached;
  if (cellCache.size > 600) cellCache.clear();

  const random = rng(ring * 73856093 + col * 19349663 + 1);
  const decLo = -90 + ring * CELL_DEG;
  const raWidth = 24 / cols;
  const raLo = col * raWidth;
  // The ring's column count already narrows the cells toward the poles, so
  // every cell is a quarter degree square on the sky and holds the same number.
  const count = Math.round(CELL_DEG * CELL_DEG * densityBelow(FAINTEST_MAG));

  const lo = Math.pow(10, 0.36 * BRIGHTEST_FIELD_MAG);
  const hi = Math.pow(10, 0.36 * FAINTEST_MAG);
  const stars: FieldStar[] = [];
  for (let n = 0; n < count; n++) {
    stars.push({
      raHours: raLo + random() * raWidth,
      decDeg: decLo + random() * CELL_DEG,
      // Inverse of the cumulative density: faint stars vastly outnumber bright ones.
      mag: Math.log10(lo + random() * (hi - lo)) / 0.36,
      tint: random(),
    });
  }
  cellCache.set(key, stars);
  return stars;
}

/** Every fictional star within `radiusDeg` of `eq`. Deterministic per cell, so the field is fixed to the sky. */
export function fieldStarsNear(eq: Equatorial, radiusDeg: number): FieldStar[] {
  const out: FieldStar[] = [];
  const ringLo = Math.floor((eq.decDeg - radiusDeg + 90) / CELL_DEG);
  const ringHi = Math.floor((eq.decDeg + radiusDeg + 90) / CELL_DEG);
  for (let ring = Math.max(0, ringLo); ring <= Math.min(ringHi, Math.ceil(180 / CELL_DEG) - 1); ring++) {
    const decMid = -90 + (ring + 0.5) * CELL_DEG;
    const cols = Math.max(1, Math.round((360 * Math.cos(decMid * DEG)) / CELL_DEG));
    const raWidth = 24 / cols;
    const span = Math.ceil(radiusDeg / (15 * raWidth * Math.max(0.05, Math.cos(decMid * DEG)))) + 1;
    const centre = Math.floor(eq.raHours / raWidth);
    for (let c = centre - span; c <= centre + span; c++) {
      out.push(...cellStars(ring, ((c % cols) + cols) % cols, cols));
    }
  }
  return out;
}

/* --- the real objects ------------------------------------------------- */

export type DsoShape = 'galaxy' | 'open' | 'globular' | 'nebula' | 'planetary';

export type SkyObject = {
  id: string;
  name: string;
  kind: 'body' | 'dso' | 'star';
  altitude: number;
  azimuth: number;
  /** Integrated visual magnitude. */
  mag: number;
  /** Disc diameter for a body, major axis for a deep-sky object, 0 for a star. Arcminutes. */
  sizeArcmin: number;
  minorArcmin?: number;
  /** Position angle of the major axis, degrees east of north. */
  paDeg?: number;
  shape?: DsoShape;
  photoSrc?: string;
  /** How many object diameters the photo spans across its width. */
  frameSpan?: number;
  /** For bright bodies: the sub length beyond which the disc burns out. */
  saturateSec?: number;
};

type BodySpec = { id: string; body: Body; name: string; saturateSec: number; frameSpan: number };

const BODIES: BodySpec[] = [
  { id: 'moon', body: Body.Moon, name: 'The Moon', saturateSec: 0.02, frameSpan: 1.02 },
  { id: 'mercury', body: Body.Mercury, name: 'Mercury', saturateSec: 0.01, frameSpan: 1.15 },
  { id: 'venus', body: Body.Venus, name: 'Venus', saturateSec: 0.005, frameSpan: 1.15 },
  { id: 'mars', body: Body.Mars, name: 'Mars', saturateSec: 0.02, frameSpan: 1.15 },
  { id: 'jupiter', body: Body.Jupiter, name: 'Jupiter', saturateSec: 0.03, frameSpan: 1.15 },
  { id: 'saturn', body: Body.Saturn, name: 'Saturn', saturateSec: 0.08, frameSpan: 2.35 },
  { id: 'uranus', body: Body.Uranus, name: 'Uranus', saturateSec: 2, frameSpan: 1.15 },
  { id: 'neptune', body: Body.Neptune, name: 'Neptune', saturateSec: 4, frameSpan: 1.15 },
];

type DsoSpec = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mag: number;
  major: number;
  minor?: number;
  pa?: number;
  shape: DsoShape;
  frameSpan?: number;
};

/**
 * What a 150 mm scope can be steered onto between the eight GoTo targets.
 * J2000, magnitudes and sizes from the usual catalogues. Three have
 * reference photographs; the rest are drawn from their shape and size.
 */
const DEEP_SKY: DsoSpec[] = [
  { id: 'm42', name: 'Orion Nebula', ra: 5.591, dec: -5.391, mag: 4.0, major: 85, minor: 60, shape: 'nebula', frameSpan: 1.0 },
  { id: 'm31', name: 'Andromeda Galaxy', ra: 0.712, dec: 41.269, mag: 3.4, major: 178, minor: 63, pa: 35, shape: 'galaxy', frameSpan: 1.0 },
  { id: 'm57', name: 'Ring Nebula', ra: 18.886, dec: 33.029, mag: 8.8, major: 1.4, minor: 1.0, shape: 'planetary', frameSpan: 2.0 },
  { id: 'm13', name: 'Hercules Cluster', ra: 16.695, dec: 36.46, mag: 5.8, major: 20, shape: 'globular' },
  { id: 'm92', name: 'M92', ra: 17.285, dec: 43.136, mag: 6.4, major: 14, shape: 'globular' },
  { id: 'm3', name: 'M3', ra: 13.703, dec: 28.377, mag: 6.2, major: 18, shape: 'globular' },
  { id: 'm5', name: 'M5', ra: 15.309, dec: 2.081, mag: 5.6, major: 23, shape: 'globular' },
  { id: 'm15', name: 'M15', ra: 21.5, dec: 12.167, mag: 6.2, major: 18, shape: 'globular' },
  { id: 'm22', name: 'M22', ra: 18.607, dec: -23.904, mag: 5.1, major: 32, shape: 'globular' },
  { id: 'm45', name: 'Pleiades', ra: 3.79, dec: 24.117, mag: 1.6, major: 110, shape: 'open' },
  { id: 'm44', name: 'Beehive Cluster', ra: 8.67, dec: 19.98, mag: 3.7, major: 95, shape: 'open' },
  { id: 'm35', name: 'M35', ra: 6.148, dec: 24.333, mag: 5.3, major: 28, shape: 'open' },
  { id: 'm36', name: 'M36', ra: 5.603, dec: 34.135, mag: 6.3, major: 12, shape: 'open' },
  { id: 'm37', name: 'M37', ra: 5.873, dec: 32.55, mag: 6.2, major: 24, shape: 'open' },
  { id: 'm38', name: 'M38', ra: 5.478, dec: 35.83, mag: 7.4, major: 21, shape: 'open' },
  { id: 'm11', name: 'Wild Duck Cluster', ra: 18.852, dec: -6.27, mag: 6.3, major: 14, shape: 'open' },
  { id: 'ngc869', name: 'Double Cluster (h)', ra: 2.317, dec: 57.13, mag: 5.3, major: 30, shape: 'open' },
  { id: 'ngc884', name: 'Double Cluster (χ)', ra: 2.373, dec: 57.12, mag: 6.1, major: 30, shape: 'open' },
  { id: 'm6', name: 'Butterfly Cluster', ra: 17.67, dec: -32.22, mag: 4.2, major: 25, shape: 'open' },
  { id: 'm7', name: "Ptolemy's Cluster", ra: 17.898, dec: -34.79, mag: 3.3, major: 80, shape: 'open' },
  { id: 'm51', name: 'Whirlpool Galaxy', ra: 13.498, dec: 47.195, mag: 8.4, major: 11.2, minor: 6.9, pa: 163, shape: 'galaxy' },
  { id: 'm81', name: "Bode's Galaxy", ra: 9.926, dec: 69.067, mag: 6.9, major: 26.9, minor: 14.1, pa: 157, shape: 'galaxy' },
  { id: 'm82', name: 'Cigar Galaxy', ra: 9.931, dec: 69.68, mag: 8.4, major: 11.2, minor: 4.3, pa: 65, shape: 'galaxy' },
  { id: 'm101', name: 'Pinwheel Galaxy', ra: 14.053, dec: 54.349, mag: 7.9, major: 28.8, minor: 26.9, shape: 'galaxy' },
  { id: 'm104', name: 'Sombrero Galaxy', ra: 12.666, dec: -11.623, mag: 8.0, major: 8.7, minor: 3.5, pa: 90, shape: 'galaxy' },
  { id: 'm33', name: 'Triangulum Galaxy', ra: 1.564, dec: 30.66, mag: 5.7, major: 70, minor: 40, pa: 23, shape: 'galaxy' },
  { id: 'm64', name: 'Black Eye Galaxy', ra: 12.945, dec: 21.683, mag: 8.5, major: 10, minor: 5.4, pa: 115, shape: 'galaxy' },
  { id: 'm27', name: 'Dumbbell Nebula', ra: 19.993, dec: 22.721, mag: 7.5, major: 8, minor: 5.7, pa: 120, shape: 'planetary' },
  { id: 'm97', name: 'Owl Nebula', ra: 11.248, dec: 55.019, mag: 9.9, major: 3.4, shape: 'planetary' },
  { id: 'm1', name: 'Crab Nebula', ra: 5.575, dec: 22.017, mag: 8.4, major: 6, minor: 4, pa: 130, shape: 'nebula' },
  { id: 'm8', name: 'Lagoon Nebula', ra: 18.06, dec: -24.38, mag: 6.0, major: 90, minor: 40, pa: 90, shape: 'nebula' },
  { id: 'm20', name: 'Trifid Nebula', ra: 18.038, dec: -23.03, mag: 6.3, major: 28, shape: 'nebula' },
  { id: 'm17', name: 'Omega Nebula', ra: 18.346, dec: -16.18, mag: 6.0, major: 11, shape: 'nebula' },
  { id: 'm16', name: 'Eagle Nebula', ra: 18.315, dec: -13.82, mag: 6.0, major: 7, shape: 'nebula' },
  { id: 'm78', name: 'M78', ra: 5.78, dec: 0.08, mag: 8.3, major: 8, minor: 6, shape: 'nebula' },
];

export const DEEP_SKY_BY_ID = new Map(DEEP_SKY.map((d) => [d.id, d]));

function separationDeg(a: AltAz, b: AltAz): number {
  const d = tangentOffsetDeg(a, b);
  return Math.hypot(d.x, d.y);
}

/**
 * Every real object within `radiusDeg` of the pointing, positioned for this
 * site and instant. Cheap enough to run a few times a second: catalogue
 * objects are prefiltered with the unprecessed transform and only the
 * survivors get the exact one.
 */
export function skyObjectsNear(
  node: ObservatoryNode,
  date: Date,
  pointing: AltAz,
  radiusDeg: number,
  lstHours: number,
): SkyObject[] {
  const out: SkyObject[] = [];
  const observer = new Observer(node.lat, node.lon, 0);

  for (const spec of BODIES) {
    const eq = Equator(spec.body, date, observer, true, true);
    const h = Horizon(date, observer, eq.ra, eq.dec, 'normal');
    const at = { altitude: h.altitude, azimuth: h.azimuth };
    const size = (apparentDiameterArcsec(spec.id, date) ?? 4) / 60;
    if (separationDeg(pointing, at) > radiusDeg + size / 2) continue;

    out.push({
      id: spec.id,
      name: spec.name,
      kind: 'body',
      ...at,
      mag: Illumination(spec.body, date).mag,
      sizeArcmin: size,
      photoSrc: TARGET_PHOTOS[spec.id]?.src,
      frameSpan: spec.frameSpan,
      saturateSec: spec.saturateSec,
    });

    if (spec.id === 'jupiter') {
      // The Galilean moons ride along as four stars, offset on the sky in the
      // frame's own orientation so they stay where Jupiter's refraction put it.
      const q = northAngleDeg(at, node.lat, lstHours) * DEG;
      const cosAlt = Math.cos(at.altitude * DEG);
      for (const moon of galileanMoons(date)) {
        if (moon.state === 'occulted') continue;
        const east = moon.eastArcsec / 3600;
        const north = moon.northArcsec / 3600;
        const x = north * Math.sin(q) - east * Math.cos(q);
        const y = north * Math.cos(q) + east * Math.sin(q);
        out.push({
          id: moon.id,
          name: moon.name,
          kind: 'star',
          altitude: at.altitude + y,
          azimuth: at.azimuth + x / cosAlt,
          mag: moon.id === 'ganymede' ? 4.6 : moon.id === 'callisto' ? 5.7 : moon.id === 'io' ? 5.0 : 5.3,
          sizeArcmin: 0,
        });
      }
    }
  }

  for (const spec of DEEP_SKY) {
    const rough = raDecToAltAz({ raHours: spec.ra, decDeg: spec.dec }, node.lat, lstHours);
    if (separationDeg(pointing, rough) > radiusDeg + spec.major / 120 + 1) continue;
    const exact = raDecToAzAlt(spec.ra, spec.dec, node.lat, node.lon, date);
    out.push({
      id: spec.id,
      name: spec.name,
      kind: 'dso',
      altitude: exact.altitude,
      azimuth: exact.azimuth,
      mag: spec.mag,
      sizeArcmin: spec.major,
      minorArcmin: spec.minor ?? spec.major,
      paDeg: spec.pa ?? 0,
      shape: spec.shape,
      photoSrc: TARGET_PHOTOS[spec.id]?.src,
      frameSpan: spec.frameSpan,
    });
  }

  for (const star of BRIGHT_STARS) {
    const rough = raDecToAltAz({ raHours: star.ra, decDeg: star.dec }, node.lat, lstHours);
    if (separationDeg(pointing, rough) > radiusDeg + 1) continue;
    const exact = raDecToAzAlt(star.ra, star.dec, node.lat, node.lon, date);
    out.push({
      id: star.id,
      name: star.name,
      kind: 'star',
      altitude: exact.altitude,
      azimuth: exact.azimuth,
      mag: star.mag,
      sizeArcmin: 0,
    });
  }

  return out;
}

/**
 * The faintest star a sub of this length records, before the sky is added.
 * A 10 ms planetary sub on 150 mm reaches about 9th magnitude; a 1 s sub about
 * 14th; stacking buys 1.25 magnitudes per tenfold. The city sky takes some back.
 */
export function limitingMagnitude(exposureSec: number, subs: number, bortle: number): number {
  const base = 9 + 2.5 * Math.log10(Math.max(0.001, exposureSec) / 0.01);
  const stacked = base + 1.25 * Math.log10(Math.max(1, subs));
  return clamp(stacked - (bortle - 1) * 0.15, 4, 17);
}
