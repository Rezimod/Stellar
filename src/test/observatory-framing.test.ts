import { describe, expect, it } from 'vitest';
import { effectiveBlurArcsec, targetDiameterPx } from '@/lib/observatory/render';
import { ROI_BY_ID, TRAIN_BY_ID, apparentDiameterArcsec, fieldOfView } from '@/lib/observatory/optics';
import { targetSizeArcmin, SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { NODES } from '@/lib/observatory/nodes';

const fov = fieldOfView(NODES[0].instrument);
const FRAME_PX = 960;
const px = (arcmin: number) => targetDiameterPx(arcmin, fov.widthArcmin, FRAME_PX);
const date = new Date('2026-01-15T20:00:00Z');

describe('framing is physical, not decorative', () => {
  it('draws Jupiter as a small disc, a few percent of the frame', () => {
    const jupiterArcmin = apparentDiameterArcsec('jupiter', date)! / 60;
    const share = px(jupiterArcmin) / FRAME_PX;

    expect(share).toBeGreaterThan(0.01);
    expect(share).toBeLessThan(0.05);
  });

  it('overflows the frame with the Moon, which does not fit at 1500 mm', () => {
    const moonArcmin = apparentDiameterArcsec('moon', date)! / 60;

    expect(px(moonArcmin)).toBeGreaterThan(FRAME_PX);
  });

  it('overflows the frame several times over with M31', () => {
    const m31 = targetSizeArcmin(SIM_TARGET_BY_ID.get('m31')!, date);

    expect(px(m31) / FRAME_PX).toBeGreaterThan(5);
  });

  it('draws the Ring Nebula small enough that stacking is the point', () => {
    const m57 = targetSizeArcmin(SIM_TARGET_BY_ID.get('m57')!, date);

    expect(px(m57) / FRAME_PX).toBeLessThan(0.08);
  });

  it('scales linearly with the field, so a reducer makes everything smaller', () => {
    const reduced = fieldOfView({ ...NODES[0].instrument, focalLengthMm: 945 });
    const wide = targetDiameterPx(30, reduced.widthArcmin, FRAME_PX);

    expect(wide).toBeLessThan(px(30));
  });
});

describe('the optical train is what makes a planet viewable', () => {
  const saturnArcmin = apparentDiameterArcsec('saturn', date)! / 60;
  const share = (train: string, roi: string) => {
    const f = fieldOfView(NODES[0].instrument, TRAIN_BY_ID.get(train)!, ROI_BY_ID.get(roi)!);
    return targetDiameterPx(saturnArcmin, f.widthArcmin, FRAME_PX) / FRAME_PX;
  };

  it('leaves Saturn a speck bare at f/10 across the whole sensor', () => {
    expect(share('native', 'full')).toBeLessThan(0.02);
  });

  it('makes Saturn a real object with a Barlow and a cropped read-out', () => {
    // What an observer actually sees on screen, and why "1.3% of frame" was
    // arithmetically right but practically meaningless.
    expect(share('barlow3', '640')).toBeGreaterThan(0.15);
  });

  it('grows the target as the train gets longer', () => {
    expect(share('barlow3', '640')).toBeGreaterThan(share('barlow2', '640'));
    expect(share('barlow2', '640')).toBeGreaterThan(share('native', '640'));
  });

  it('fits the Moon once the reducer is in', () => {
    const moonArcmin = apparentDiameterArcsec('moon', date)! / 60;
    const f = fieldOfView(NODES[0].instrument, TRAIN_BY_ID.get('reducer')!, ROI_BY_ID.get('full')!);

    expect(targetDiameterPx(moonArcmin, f.widthArcmin, FRAME_PX)).toBeLessThan(FRAME_PX);
  });
});

describe('stacking is what recovers detail', () => {
  const optics = { seeingArcsec: 2.6, diffractionArcsec: 0.77 };

  it('starts a single frame smeared by the seeing', () => {
    expect(effectiveBlurArcsec({ ...optics, subs: 1 })).toBeCloseTo(2.6, 6);
  });

  it('sharpens as the square root of the stack', () => {
    expect(effectiveBlurArcsec({ ...optics, subs: 4 })).toBeCloseTo(1.3, 6);
  });

  it('never beats the aperture, however long you stack', () => {
    expect(effectiveBlurArcsec({ ...optics, subs: 100_000 })).toBeCloseTo(0.77, 6);
  });
});
