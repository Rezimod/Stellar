import { describe, it, expect } from 'vitest';
import { getTonightDarkWindow } from '@/lib/dark-window';

// The dark window has to resolve "tonight" from the observer's longitude, not
// from the runtime clock: this module runs in the browser AND on Vercel (UTC),
// and a user can pick an observing site in another zone. Anchoring on
// `reference.getHours()` made a Tbilisi afternoon look like morning to a UTC
// server and returned *last* night's window — invisible on a UTC dev machine.

const TBILISI = { lat: 41.7151, lon: 44.8271 }; // UTC+4
const DENVER = { lat: 39.7392, lon: -104.9903 }; // UTC-6

describe('getTonightDarkWindow', () => {
  it('returns the upcoming night during a Tbilisi afternoon', () => {
    const ref = new Date('2026-07-31T10:00:00Z'); // 14:00 local
    const w = getTonightDarkWindow(TBILISI.lat, TBILISI.lon, ref);
    expect(w.duskStart).not.toBeNull();
    expect(w.duskStart!.getTime()).toBeGreaterThan(ref.getTime());
    expect(w.isCurrentlyDark).toBe(false);
  });

  it('holds the night in progress at 02:00 local', () => {
    const ref = new Date('2026-07-31T22:00:00Z'); // 02:00 local, Aug 1
    const w = getTonightDarkWindow(TBILISI.lat, TBILISI.lon, ref);
    expect(w.isCurrentlyDark).toBe(true);
    expect(w.duskStart!.getTime()).toBeLessThan(ref.getTime());
    expect(w.dawnEnd!.getTime()).toBeGreaterThan(ref.getTime());
  });

  it('brackets the evening west of Greenwich', () => {
    const ref = new Date('2026-08-01T03:00:00Z'); // 21:00 Jul 31 local
    const w = getTonightDarkWindow(DENVER.lat, DENVER.lon, ref);
    expect(w.duskStart).not.toBeNull();
    expect(w.dawnEnd!.getTime()).toBeGreaterThan(ref.getTime());
    expect(w.dawnEnd!.getTime() - w.duskStart!.getTime()).toBeLessThan(14 * 3600_000);
  });
});
