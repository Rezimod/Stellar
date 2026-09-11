/**
 * Everything the live console can be pointed at, as one list.
 *
 * The sky model already knows these objects — the planets it computes, the
 * deep-sky catalogue it draws, the bright stars it plots. This module gives
 * them a common shape for the target picker: a kind to filter by, coordinates
 * to display, a position to sort and grade by.
 */

import { Body, Equator, Horizon, Illumination, Observer } from 'astronomy-engine';
import { raDecToAzAlt } from '@/lib/sky/catalog';
import { BRIGHT_STARS } from '@/lib/sky/stars';
import { TARGET_PHOTOS } from '@/lib/sky/target-photos';
import { apparentDiameterArcsec } from './optics';
import { evaluateSafety, type AltAz } from './safety';
import { DEEP_SKY_BY_ID, type DsoShape } from './sky-field';
import type { ObservatoryNode } from './types';

export type TargetKind = 'planet' | 'moon' | 'galaxy' | 'nebula' | 'cluster' | 'star';

export type TelescopeTarget = {
  id: string;
  /** "Andromeda Galaxy" */
  name: string;
  /** "M31", "NGC 869" — absent for planets and stars. */
  catalog?: string;
  kind: TargetKind;
  /** Bright targets are imaged in milliseconds, faint ones in seconds. */
  brightness: 'bright' | 'faint';
  /** J2000 coordinates, fixed targets only. */
  ra?: number;
  dec?: number;
  body?: Body;
  photo?: string;
};

const BODIES: Array<{ id: string; name: string; body: Body; kind: TargetKind }> = [
  { id: 'moon', name: 'The Moon', body: Body.Moon, kind: 'moon' },
  { id: 'mercury', name: 'Mercury', body: Body.Mercury, kind: 'planet' },
  { id: 'venus', name: 'Venus', body: Body.Venus, kind: 'planet' },
  { id: 'mars', name: 'Mars', body: Body.Mars, kind: 'planet' },
  { id: 'jupiter', name: 'Jupiter', body: Body.Jupiter, kind: 'planet' },
  { id: 'saturn', name: 'Saturn', body: Body.Saturn, kind: 'planet' },
  { id: 'uranus', name: 'Uranus', body: Body.Uranus, kind: 'planet' },
  { id: 'neptune', name: 'Neptune', body: Body.Neptune, kind: 'planet' },
];

const KIND_OF_SHAPE: Record<DsoShape, TargetKind> = {
  galaxy: 'galaxy',
  nebula: 'nebula',
  planetary: 'nebula',
  open: 'cluster',
  globular: 'cluster',
};

/** 'ngc869' → 'NGC 869', 'm31' → 'M31'. */
function catalogLabel(id: string): string {
  const m = /^([a-z]+)(\d+)$/.exec(id);
  if (!m) return id.toUpperCase();
  return m[1] === 'm' ? `M${m[2]}` : `${m[1].toUpperCase()} ${m[2]}`;
}

export const TELESCOPE_TARGETS: TelescopeTarget[] = [
  ...BODIES.map((b) => ({
    id: b.id,
    name: b.name,
    kind: b.kind,
    brightness: 'bright' as const,
    body: b.body,
    photo: TARGET_PHOTOS[b.id]?.src,
  })),
  ...[...DEEP_SKY_BY_ID.values()].map((d) => {
    const catalog = catalogLabel(d.id);
    return {
      id: d.id,
      name: d.name,
      catalog,
      kind: KIND_OF_SHAPE[d.shape],
      brightness: 'faint' as const,
      ra: d.ra,
      dec: d.dec,
      photo: TARGET_PHOTOS[d.id]?.src,
    };
  }),
  ...BRIGHT_STARS.map((s) => ({
    id: `star-${s.id}`,
    name: s.name,
    kind: 'star' as const,
    brightness: 'faint' as const,
    ra: s.ra,
    dec: s.dec,
  })),
];

export const TELESCOPE_TARGET_BY_ID = new Map(TELESCOPE_TARGETS.map((t) => [t.id, t]));

/** "M31 - Andromeda Galaxy", or just the name when there is no designation. */
export function targetTitle(t: TelescopeTarget): string {
  return t.catalog && t.catalog !== t.name ? `${t.catalog} - ${t.name}` : t.name;
}

export type TargetPosition = AltAz & {
  /** Hours and degrees — J2000 for fixed targets, of date for moving ones. */
  raHours: number;
  decDeg: number;
  mag: number;
  /** Apparent size in arcminutes, null for a star. */
  sizeArcmin: number | null;
};

export function targetPosition(t: TelescopeTarget, node: ObservatoryNode, date: Date): TargetPosition {
  if (t.body !== undefined) {
    const observer = new Observer(node.lat, node.lon, 0);
    const eq = Equator(t.body, date, observer, true, true);
    const h = Horizon(date, observer, eq.ra, eq.dec, 'normal');
    return {
      altitude: h.altitude,
      azimuth: h.azimuth,
      raHours: eq.ra,
      decDeg: eq.dec,
      mag: Illumination(t.body, date).mag,
      sizeArcmin: (apparentDiameterArcsec(t.id, date) ?? 0) / 60,
    };
  }
  const p = raDecToAzAlt(t.ra!, t.dec!, node.lat, node.lon, date);
  const dso = DEEP_SKY_BY_ID.get(t.id);
  const star = BRIGHT_STARS.find((s) => `star-${s.id}` === t.id);
  return {
    altitude: p.altitude,
    azimuth: p.azimuth,
    raHours: t.ra!,
    decDeg: t.dec!,
    mag: dso?.mag ?? star?.mag ?? 0,
    sizeArcmin: dso?.major ?? null,
  };
}

/** A coordinate pair typed by hand, as a target the console can slew to. */
export function manualTarget(raHours: number, decDeg: number): TelescopeTarget {
  return {
    id: `manual-${raHours.toFixed(4)}-${decDeg.toFixed(3)}`,
    name: `${formatRa(raHours)} ${formatDec(decDeg)}`,
    kind: 'star',
    brightness: 'faint',
    ra: raHours,
    dec: decDeg,
  };
}

export type TargetOrder = 'zenith' | 'brightest' | 'name';

export type GradedTarget = { target: TelescopeTarget; position: TargetPosition; visible: boolean };

/** Every target positioned and graded for this site and instant. */
export function gradeTargets(node: ObservatoryNode, date: Date): GradedTarget[] {
  return TELESCOPE_TARGETS.map((target) => {
    const position = targetPosition(target, node, date);
    return { target, position, visible: evaluateSafety(node, position, date).ok };
  });
}

export function sortGraded(list: GradedTarget[], order: TargetOrder): GradedTarget[] {
  const sorted = [...list];
  if (order === 'zenith') sorted.sort((a, b) => b.position.altitude - a.position.altitude);
  else if (order === 'brightest') sorted.sort((a, b) => a.position.mag - b.position.mag);
  else sorted.sort((a, b) => targetTitle(a.target).localeCompare(targetTitle(b.target)));
  return sorted;
}

/* --- sexagesimal ------------------------------------------------------ */

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** 0.712 h → "00:42:43.20". */
export function formatRa(hours: number): string {
  const total = (((hours % 24) + 24) % 24) * 3600;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(Math.floor(s))}.${pad(Math.round((s % 1) * 100))}`;
}

/** 41.269° → "+41:16:08.40". */
export function formatDec(deg: number): string {
  const sign = deg < 0 ? '-' : '+';
  const total = Math.abs(deg) * 3600;
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${sign}${pad(d)}:${pad(m)}:${pad(Math.floor(s))}.${pad(Math.round((s % 1) * 100))}`;
}

const SEXAGESIMAL = /^\s*([+-])?\s*(\d{1,3})(?:[:\s h°]\s*(\d{1,2})(?:[:\s m′']\s*(\d{1,2}(?:\.\d+)?))?)?\s*[s″"]?\s*$/;

function parseSexagesimal(text: string): number | null {
  const m = SEXAGESIMAL.exec(text);
  if (!m) return null;
  const value = Number(m[2]) + Number(m[3] ?? 0) / 60 + Number(m[4] ?? 0) / 3600;
  return m[1] === '-' ? -value : value;
}

/** "00:42:44.3" or "0 42 44" → hours, or null when it is not a right ascension. */
export function parseRa(text: string): number | null {
  const v = parseSexagesimal(text);
  return v === null || v < 0 || v >= 24 ? null : v;
}

/** "+41:16:07.5" or "-5 23 28" → degrees, or null when it is not a declination. */
export function parseDec(text: string): number | null {
  const v = parseSexagesimal(text);
  return v === null || v < -90 || v > 90 ? null : v;
}
