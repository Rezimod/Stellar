/**
 * What this instrument actually shows.
 *
 * These numbers are the product. A 150 mm f/10 with a 1/1.2" sensor frames
 * about 26' x 14' — the full Moon does not fit, Jupiter is 2.5% of the frame
 * width, and M31 overflows it six times over. Getting that wrong turns the
 * simulator into a toy that teaches people something false about their own
 * telescope.
 */

import { Body, GeoVector, KM_PER_AU } from 'astronomy-engine';
import type { Instrument } from './types';

/** Arcminutes in a radian. */
const ARCMIN_PER_RAD = 3437.7468;
const ARCSEC_PER_RAD = 206264.806;

export type FieldOfView = {
  widthArcmin: number;
  heightArcmin: number;
  /** Arcseconds covered by one pixel. */
  plateScaleArcsecPx: number;
  /** Sensor pixels across the long axis. */
  widthPx: number;
};

export function fieldOfView(instrument: Instrument): FieldOfView {
  const { sensorWidthMm, sensorHeightMm, pixelSizeUm, focalLengthMm } = instrument;

  return {
    // Small-angle: the sensor is millimetres against a metre of focal length.
    widthArcmin: (sensorWidthMm / focalLengthMm) * ARCMIN_PER_RAD,
    heightArcmin: (sensorHeightMm / focalLengthMm) * ARCMIN_PER_RAD,
    plateScaleArcsecPx: ((pixelSizeUm / 1000) / focalLengthMm) * ARCSEC_PER_RAD,
    widthPx: Math.round((sensorWidthMm * 1000) / pixelSizeUm),
  };
}

/** Focal ratio — what governs how fast faint things appear. */
export function focalRatio(instrument: Instrument): number {
  return instrument.focalLengthMm / instrument.apertureMm;
}

/**
 * Dawes' limit: the finest detail this aperture can resolve, in arcseconds.
 * Seeing is usually worse, which is why the simulator blurs by the larger of
 * the two.
 */
export function resolvingPowerArcsec(instrument: Instrument): number {
  return 116 / instrument.apertureMm;
}

/** Equatorial radii in kilometres, for apparent-size computation. */
const RADIUS_KM: Partial<Record<string, number>> = {
  moon: 1737.4,
  mercury: 2439.7,
  venus: 6051.8,
  mars: 3396.2,
  jupiter: 71492,
  saturn: 60268,
  uranus: 25559,
  neptune: 24764,
};

const BODY: Partial<Record<string, Body>> = {
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

/**
 * Apparent diameter of a solar-system body right now, in arcseconds.
 *
 * Computed from real distance, so Mars is 4" at conjunction and 25" at a good
 * opposition — the single fact that decides whether a night is worth booking.
 * Returns null for anything that is not a solar-system body.
 */
export function apparentDiameterArcsec(targetId: string, date: Date): number | null {
  const body = BODY[targetId];
  const radiusKm = RADIUS_KM[targetId];
  if (!body || !radiusKm) return null;

  const vector = GeoVector(body, date, true);
  const distanceKm =
    Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) * KM_PER_AU;

  return 2 * Math.atan(radiusKm / distanceKm) * ARCSEC_PER_RAD;
}

/**
 * Field rotation rate for an altazimuth mount, degrees per hour.
 *
 * A fork mount tracks position but not orientation, so the field turns under
 * the sensor — fastest near the zenith and toward the meridian. This is the
 * reason alt-az rigs cap their sub-exposures, and the simulator shows it.
 */
export function fieldRotationDegPerHour(latDeg: number, altDeg: number, azDeg: number): number {
  const toRad = Math.PI / 180;
  const cosAlt = Math.cos(altDeg * toRad);
  // At the zenith the rate diverges; the mount cannot track there anyway and
  // the safety envelope refuses it, so clamp rather than return Infinity.
  if (Math.abs(cosAlt) < 1e-6) return 0;

  return (15.041 * Math.cos(latDeg * toRad) * Math.cos(azDeg * toRad)) / cosAlt;
}
