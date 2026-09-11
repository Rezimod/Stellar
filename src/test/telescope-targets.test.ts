import { describe, expect, it } from 'vitest';
import {
  TELESCOPE_TARGETS,
  formatDec,
  formatRa,
  gradeTargets,
  manualTarget,
  parseDec,
  parseRa,
  sortGraded,
  targetPosition,
  targetTitle,
} from '@/lib/observatory/telescope-targets';
import { STATIONS, skyStateAt } from '@/lib/observatory/sim-stations';

const tbilisi = STATIONS[0];

describe('telescope targets', () => {
  it('lists the planets, the catalogue and the bright stars once each', () => {
    const ids = TELESCOPE_TARGETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('jupiter');
    expect(ids).toContain('m31');
    expect(ids).toContain('ngc869');
    expect(ids).toContain('star-vega');
    expect(ids).not.toContain('sun');
  });

  it('titles a catalogue object by designation and name', () => {
    expect(targetTitle(TELESCOPE_TARGETS.find((t) => t.id === 'm31')!)).toBe('M31 - Andromeda Galaxy');
    expect(targetTitle(TELESCOPE_TARGETS.find((t) => t.id === 'ngc869')!)).toBe('NGC 869 - Double Cluster (h)');
    expect(targetTitle(TELESCOPE_TARGETS.find((t) => t.id === 'm92')!)).toBe('M92');
    expect(targetTitle(TELESCOPE_TARGETS.find((t) => t.id === 'saturn')!)).toBe('Saturn');
  });

  it('places M31 near its catalogue coordinates and grades it by altitude', () => {
    const m31 = TELESCOPE_TARGETS.find((t) => t.id === 'm31')!;
    const p = targetPosition(m31, tbilisi, new Date('2026-10-15T20:00:00Z'));
    expect(p.raHours).toBeCloseTo(0.712, 3);
    expect(p.decDeg).toBeCloseTo(41.269, 3);
    expect(p.altitude).toBeGreaterThan(40);
    expect(p.sizeArcmin).toBe(178);
  });

  it('computes a moving body of date, with a size', () => {
    const jupiter = TELESCOPE_TARGETS.find((t) => t.id === 'jupiter')!;
    const p = targetPosition(jupiter, tbilisi, new Date('2026-01-10T22:00:00Z'));
    expect(p.sizeArcmin).toBeGreaterThan(0.5);
    expect(p.mag).toBeLessThan(-1);
  });

  it('sorts closest to zenith first', () => {
    const graded = sortGraded(gradeTargets(tbilisi, new Date('2026-10-15T20:00:00Z')), 'zenith');
    for (let i = 1; i < graded.length; i++) {
      expect(graded[i - 1].position.altitude).toBeGreaterThanOrEqual(graded[i].position.altitude);
    }
    expect(graded.some((g) => g.visible)).toBe(true);
  });
});

describe('sexagesimal', () => {
  it('formats the way a hand control prints', () => {
    expect(formatRa(0.712)).toBe('00:42:43.20');
    expect(formatDec(41.269)).toBe('+41:16:08.40');
    expect(formatDec(-5.391)).toBe('-05:23:27.60');
  });

  it('parses what people type', () => {
    expect(parseRa('00:42:44.3')).toBeCloseTo(0.71231, 4);
    expect(parseRa('5 35 17')).toBeCloseTo(5.588, 3);
    expect(parseRa('25:00:00')).toBeNull();
    expect(parseDec('+41:16:07.5')).toBeCloseTo(41.2688, 3);
    expect(parseDec('-5 23 28')).toBeCloseTo(-5.3911, 3);
    expect(parseDec('91')).toBeNull();
    expect(parseDec('north')).toBeNull();
  });

  it('round-trips through a manual target', () => {
    const t = manualTarget(parseRa('18:53:35')!, parseDec('+33:01:45')!);
    expect(t.name).toBe('18:53:35.00 +33:01:45.00');
  });
});

describe('stations', () => {
  it('always has a station under a dark sky', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const date = new Date(Date.UTC(2026, 8, 11, hour));
      expect(STATIONS.some((s) => skyStateAt(s, date) === 'night')).toBe(true);
    }
  });
});
