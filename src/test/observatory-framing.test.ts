import { describe, expect, it } from 'vitest';
import { targetDiameterPx } from '@/lib/observatory/render';
import { apparentDiameterArcsec, fieldOfView } from '@/lib/observatory/optics';
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
