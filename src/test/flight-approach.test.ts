import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  APPROACH_END_RADII, APPROACH_MAX_RADII, APPROACH_MIN_RADII, APPROACH_SECONDS, approachPose,
} from '@/lib/solar-system/flight-approach';
import { SURFACE_ASSETS, SURFACE_GROUPS, assetsFor } from '@/lib/solar-system/surface-assets';

const START = 18;

describe('the arrival profile', () => {
  it('runs the legs in order and ends where the lander takes over', () => {
    expect(approachPose(0, START).phase).toBe('transit');
    expect(approachPose(4, START).phase).toBe('transit');
    expect(approachPose(5, START).phase).toBe('approach');
    expect(approachPose(9.5, START).phase).toBe('pitchover');
    expect(approachPose(APPROACH_SECONDS, START).done).toBe(true);
    expect(approachPose(APPROACH_SECONDS + 30, START).phase).toBe('done');
    expect(approachPose(APPROACH_SECONDS, START).radii).toBeCloseTo(APPROACH_END_RADII, 5);
  });

  it('closes on the world, swings around it and brings the nose down, all without going backwards', () => {
    let last = approachPose(0, START);
    for (let t = 0.1; t <= APPROACH_SECONDS; t += 0.1) {
      const now = approachPose(t, START);
      expect(now.radii).toBeLessThanOrEqual(last.radii + 1e-9);
      expect(now.swing).toBeGreaterThanOrEqual(last.swing - 1e-9);
      expect(now.pitch).toBeGreaterThanOrEqual(last.pitch - 1e-9);
      expect(now.t).toBeGreaterThanOrEqual(last.t - 1e-9);
      last = now;
    }
    expect(last.swing).toBeCloseTo(1, 2);
    expect(last.pitch).toBeCloseTo(1, 2);
  });

  it('is the same eleven seconds from across the system as it is from a low pass', () => {
    expect(approachPose(0, 900).radii).toBe(APPROACH_MAX_RADII);
    expect(approachPose(0, 1.1).radii).toBe(APPROACH_MIN_RADII);
    // Armed from where the land key actually comes up — a couple of radii out.
    const low = approachPose(0, 2.4);
    expect(low.radii).toBeCloseTo(2.4, 5);
    for (const start of [900, 2.4, 1.1]) {
      const end = approachPose(APPROACH_SECONDS, start);
      expect(end.done).toBe(true);
      expect(end.radii).toBeCloseTo(APPROACH_END_RADII, 5);
    }
  });

  it('skipping is the end of the profile, not a jump into the ground', () => {
    const skipped = approachPose(APPROACH_SECONDS, START);
    expect(skipped.done).toBe(true);
    expect(skipped.radii).toBeGreaterThan(1);
    expect(skipped.radii).toBeLessThan(1.1);
    expect(approachPose(-5, START).phase).toBe('transit');
  });
});

describe('what the arrival loads while it flies', () => {
  it('asks for the Moon files, and for nothing on the worlds built out of code', () => {
    expect(assetsFor('moon').length).toBeGreaterThan(0);
    expect(assetsFor('mars')).toEqual([]);
    expect(assetsFor('proximaB')).toEqual([]);
    for (const item of assetsFor('moon')) expect(SURFACE_GROUPS).toContain(item.group as (typeof SURFACE_GROUPS)[number]);
  });

  // The cache is keyed on the url *and* on whether the node tree is kept, so
  // a prefetch that disagrees with the scene loads the same file twice.
  it('acquires every file the way the scene that uses it does', () => {
    const sources = [
      'src/lib/solar-system/moon-lander.ts', 'src/lib/solar-system/moon-base.ts',
      'src/lib/solar-system/moon-base-zones.ts', 'src/lib/solar-system/moon-rover-mesh.ts',
      'src/lib/solar-system/moon-suit-mesh.ts',
    ].map((f) => readFileSync(f, 'utf8')).join('\n');
    // `const X_MODEL = '/explore/models/x.glb'` … `acquireModel(X_MODEL, true)`
    const names = new Map<string, string>();
    for (const m of sources.matchAll(/const (\w+) = '(\/explore\/models\/[\w-]+\.glb)'/g)) names.set(m[1], m[2]);
    const keepFor = new Map<string, boolean>();
    for (const m of sources.matchAll(/acquireModel\((\w+)(,\s*(true|false))?\)/g)) {
      const url = names.get(m[1]);
      if (url) keepFor.set(url, m[3] === 'true');
    }
    for (const item of Object.values(SURFACE_ASSETS).flat()) {
      expect(keepFor.has(item.url), `${item.url} is not acquired by any surface`).toBe(true);
      expect(keepFor.get(item.url), `${item.url} prefetch keepNodes`).toBe(item.keepNodes);
    }
  });
});
