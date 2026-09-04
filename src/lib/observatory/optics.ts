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

/**
 * What sits between the mirror and the sensor.
 *
 * The 585's 2.9 um pixels undersample a 150 mm f/10 SCT, so planetary work
 * runs a Barlow — 1.5x to 3x — and lunar work often runs the f/6.3 reducer to
 * fit the disc. Modelling only the native focal length was the mistake that
 * made everything look absurdly small.
 */
export type OpticalTrain = { id: string; label: string; multiplier: number };

export const TRAINS: OpticalTrain[] = [
  { id: 'reducer', label: 'f/6.3 reducer', multiplier: 0.63 },
  { id: 'native', label: 'Native f/10', multiplier: 1 },
  { id: 'barlow2', label: '2x Barlow', multiplier: 2 },
  { id: 'barlow3', label: '3x Barlow', multiplier: 3 },
];

export const TRAIN_BY_ID = new Map(TRAINS.map((t) => [t.id, t]));

/**
 * The read-out window.
 *
 * Capture software crops to a small region around the planet: it lifts the
 * frame rate into the hundreds, which is what makes lucky imaging work. The
 * crop is also why a planet looks large on screen despite covering a sliver
 * of the sensor.
 */
export type Roi = { id: string; label: string; widthPx: number | null };

export const ROIS: Roi[] = [
  { id: 'full', label: 'Full sensor', widthPx: null },
  { id: '640', label: '640 x 480', widthPx: 640 },
  { id: '400', label: '400 x 400', widthPx: 400 },
];

export const ROI_BY_ID = new Map(ROIS.map((r) => [r.id, r]));

export type FieldOfView = {
  widthArcmin: number;
  heightArcmin: number;
  /** Arcseconds covered by one pixel. */
  plateScaleArcsecPx: number;
  /** Sensor pixels across the long axis. */
  widthPx: number;
};

export function effectiveFocalLength(instrument: Instrument, train: OpticalTrain): number {
  return instrument.focalLengthMm * train.multiplier;
}

export function fieldOfView(
  instrument: Instrument,
  train: OpticalTrain = TRAIN_BY_ID.get('native')!,
  roi: Roi = ROIS[0],
): FieldOfView {
  const { sensorWidthMm, sensorHeightMm, pixelSizeUm } = instrument;
  const focal = effectiveFocalLength(instrument, train);

  const sensorPxWide = Math.round((sensorWidthMm * 1000) / pixelSizeUm);
  const sensorPxHigh = Math.round((sensorHeightMm * 1000) / pixelSizeUm);
  // A ROI never exceeds the sensor, and it crops both axes.
  const widthPx = Math.min(roi.widthPx ?? sensorPxWide, sensorPxWide);
  const heightPx = Math.min(
    roi.widthPx ? Math.round(roi.widthPx * 0.75) : sensorPxHigh,
    sensorPxHigh,
  );

  const plateScaleArcsecPx = ((pixelSizeUm / 1000) / focal) * ARCSEC_PER_RAD;

  return {
    widthArcmin: (widthPx * plateScaleArcsecPx) / 60,
    heightArcmin: (heightPx * plateScaleArcsecPx) / 60,
    plateScaleArcsecPx,
    widthPx,
  };
}

/** Focal ratio — what governs how fast faint things appear. */
export function focalRatio(
  instrument: Instrument,
  train: OpticalTrain = TRAIN_BY_ID.get('native')!,
): number {
  return effectiveFocalLength(instrument, train) / instrument.apertureMm;
}

/**
 * Typical Tbilisi seeing. Good nights reach 2", poor ones 4".
 *
 * A property of the site's air rather than of any one surface, so the console
 * and the gallery blur a frame by the same amount — a capture must not look
 * sharper in the gallery than it did through the eyepiece.
 */
export const DEFAULT_SEEING_ARCSEC = 2.6;

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
