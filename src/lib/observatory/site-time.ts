/**
 * The numbers an observatory actually puts on a status board.
 *
 * Sidereal time, hour angle and airmass are the vocabulary of every real
 * control room — and each one answers a plain question: what is overhead
 * right now, how far past the meridian is the target, and how much atmosphere
 * am I shooting through.
 */

import { SiderealTime } from 'astronomy-engine';

/** Local apparent sidereal time in hours, 0-24. The RA currently on the meridian. */
export function localSiderealHours(lonDeg: number, date: Date): number {
  const gast = SiderealTime(date); // Greenwich apparent sidereal time, hours
  return ((gast + lonDeg / 15) % 24 + 24) % 24;
}

/** Hour angle in hours, -12..+12. Negative is east of the meridian, still rising. */
export function hourAngle(raHours: number, lonDeg: number, date: Date): number {
  const ha = localSiderealHours(lonDeg, date) - raHours;
  return ((ha + 36) % 24) - 12;
}

/**
 * Airmass — how many atmospheres deep the target sits.
 *
 * 1.00 is the zenith. Above about 2 the seeing and extinction get bad enough
 * that a real operator would wait, which is why it belongs on the board.
 * Kasten & Young (1989); the plain secant law diverges near the horizon.
 */
export function airmass(altitudeDeg: number): number | null {
  if (altitudeDeg <= 0) return null;
  const z = 90 - altitudeDeg;
  const rad = Math.PI / 180;
  return 1 / (Math.cos(z * rad) + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

/** hh:mm:ss for a decimal-hours value. */
export function formatHours(hours: number): string {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.floor((abs - h) * 60);
  const s = Math.floor((((abs - h) * 60) - m) * 60);
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * `date` as "YYYY-MM-DDTHH" on the wall clock of an IANA timezone.
 *
 * Open-Meteo is asked for the site's own timezone, so every `time` it returns
 * is a local wall-clock string with no offset ("2026-09-02T21:00"). Parsing one
 * with `new Date` would read it in the runtime's zone — UTC on Vercel — and
 * silently select the wrong hour by the site's UTC offset. Match on the site's
 * own clock instead.
 */
export function siteHourStamp(timezone: string, date: Date): string {
  return `${siteDateStamp(timezone, date)}T${sitePart(timezone, date, { hour: '2-digit' }, 'hour')}`;
}

/** `date` as "YYYY-MM-DD" on the wall clock of an IANA timezone. */
export function siteDateStamp(timezone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Decimal hours on the site's wall clock — 21:30 is 21.5. Handles DST for free. */
export function siteLocalHours(timezone: string, date: Date): number {
  const hour = Number(sitePart(timezone, date, { hour: '2-digit' }, 'hour'));
  const minute = Number(sitePart(timezone, date, { minute: '2-digit' }, 'minute'));
  return hour + minute / 60;
}

function sitePart(
  timezone: string,
  date: Date,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hourCycle: 'h23',
    ...options,
  }).formatToParts(date);
  return parts.find((p) => p.type === type)?.value ?? '0';
}
