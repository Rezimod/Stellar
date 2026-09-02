import { describe, expect, it } from 'vitest';
import {
  acquisitionStateAt,
  planAcquisition,
  pointingAt,
  slewMs,
} from '@/lib/observatory/mission';
import { LIMITS, angularSeparation, evaluateSafety } from '@/lib/observatory/safety';
import { NODES } from '@/lib/observatory/nodes';

const node = NODES[0];
/** 2026-01-16 00:00 in Tbilisi — deep night, so daylight never masks a case. */
const NIGHT = new Date('2026-01-15T20:00:00Z');

describe('safety envelope', () => {
  it('refuses everything while the Sun is up', () => {
    const verdict = evaluateSafety(node, { altitude: 60, azimuth: 180 }, new Date('2026-06-15T08:00:00Z'));

    expect(verdict).toMatchObject({ ok: false, code: 'daylight' });
  });

  it('refuses a target below the horizon', () => {
    const verdict = evaluateSafety(node, { altitude: -5, azimuth: 90 }, NIGHT);

    expect(verdict).toMatchObject({ ok: false, code: 'below_horizon' });
  });

  it('refuses a target in the murk below the altitude floor', () => {
    const verdict = evaluateSafety(node, { altitude: LIMITS.minAltitudeDeg - 1, azimuth: 90 }, NIGHT);

    expect(verdict).toMatchObject({ ok: false, code: 'too_low' });
  });

  it('refuses the zenith, which a fork mount cannot track through', () => {
    const verdict = evaluateSafety(node, { altitude: LIMITS.maxAltitudeDeg + 1, azimuth: 90 }, NIGHT);

    expect(verdict).toMatchObject({ ok: false, code: 'above_mount_limit' });
  });

  it('allows a well-placed target on a dark night', () => {
    expect(evaluateSafety(node, { altitude: 55, azimuth: 150 }, NIGHT)).toEqual({ ok: true });
  });

  it('always carries a reason with a refusal', () => {
    const verdict = evaluateSafety(node, { altitude: 2, azimuth: 90 }, NIGHT);

    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason.length).toBeGreaterThan(0);
  });
});

describe('angular separation', () => {
  it('is zero for a point against itself', () => {
    expect(angularSeparation({ altitude: 30, azimuth: 120 }, { altitude: 30, azimuth: 120 })).toBeCloseTo(0, 6);
  });

  it('measures across the azimuth wrap', () => {
    expect(angularSeparation({ altitude: 0, azimuth: 350 }, { altitude: 0, azimuth: 10 })).toBeCloseTo(20, 6);
  });

  it('does not NaN on antipodal points', () => {
    expect(angularSeparation({ altitude: 90, azimuth: 0 }, { altitude: -90, azimuth: 0 })).toBeCloseTo(180, 6);
  });
});

describe('slew timing', () => {
  it('takes the short way around the azimuth wrap', () => {
    const short = slewMs({ altitude: 40, azimuth: 350 }, { altitude: 40, azimuth: 10 });

    // 20 degrees at 3 deg/s, not 340.
    expect(short).toBeCloseTo((20 / 3) * 1000, 6);
  });

  it('is bounded by the slower axis, since the axes move together', () => {
    const ms = slewMs({ altitude: 10, azimuth: 0 }, { altitude: 70, azimuth: 10 });

    expect(ms).toBeCloseTo((60 / 3) * 1000, 6);
  });
});

describe('acquisition timeline', () => {
  const base = {
    targetId: 'saturn',
    targetName: 'Saturn',
    from: { altitude: 40, azimuth: 180 },
    to: { altitude: 50, azimuth: 200 },
    startedAtMs: 1_000_000,
  };

  it('runs prepare, slew, verify, centre, then observes', () => {
    const acq = planAcquisition(base);

    expect(acq.phases.map((p) => p.state)).toEqual([
      'PREPARING',
      'SLEWING',
      'VERIFYING',
      'CENTERING',
      'OBSERVING',
    ]);
  });

  it('skips the unpark when the instrument is already awake', () => {
    const acq = planAcquisition({ ...base, warm: true });

    expect(acq.phases[0].state).toBe('SLEWING');
  });

  it('leaves no gap between phases', () => {
    const acq = planAcquisition(base);

    for (let i = 1; i < acq.phases.length; i++) {
      expect(acq.phases[i].startsAtMs).toBe(acq.phases[i - 1].endsAtMs);
    }
  });

  it('is pure — the same instant always gives the same state', () => {
    const acq = planAcquisition(base);
    const at = acq.startedAtMs + 3_000;

    expect(acquisitionStateAt(acq, at)).toEqual(acquisitionStateAt(acq, at));
    expect(acquisitionStateAt(acq, at).state).toBe('PREPARING');
  });

  it('observes forever once settled', () => {
    const acq = planAcquisition(base);
    const status = acquisitionStateAt(acq, acq.settledAtMs + 60 * 60 * 1000);

    expect(status.state).toBe('OBSERVING');
    expect(status.msToSettled).toBe(0);
  });

  it('clamps to the first phase before the mission starts', () => {
    const acq = planAcquisition(base);

    expect(acquisitionStateAt(acq, acq.startedAtMs - 5_000).state).toBe('PREPARING');
  });
});

describe('pointing during a slew', () => {
  const acq = planAcquisition({
    targetId: 'm42',
    targetName: 'Orion Nebula',
    from: { altitude: 20, azimuth: 350 },
    to: { altitude: 60, azimuth: 30 },
    startedAtMs: 0,
  });
  const slew = acq.phases.find((p) => p.state === 'SLEWING')!;

  it('starts where the mount was', () => {
    expect(pointingAt(acq, slew.startsAtMs)).toEqual(acq.from);
  });

  it('ends on target', () => {
    expect(pointingAt(acq, slew.endsAtMs)).toEqual(acq.to);
  });

  it('crosses the azimuth wrap the short way rather than unwinding 320 degrees', () => {
    const mid = pointingAt(acq, (slew.startsAtMs + slew.endsAtMs) / 2);

    // 350 -> 30 the short way passes through 10, not back through 190.
    expect(mid.azimuth).toBeCloseTo(10, 6);
    expect(mid.altitude).toBeCloseTo(40, 6);
  });
});
