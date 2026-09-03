import { describe, expect, it } from 'vitest';
import { PREP_LEAD_MS, sessionPhase } from '@/lib/observatory/session-phase';

const starts = Date.UTC(2026, 8, 16, 18, 20);
const ends = starts + 20 * 60_000;

describe('sessionPhase', () => {
  it('keeps the room shut well before the slot', () => {
    expect(sessionPhase(starts - 3 * 3_600_000, starts, ends)).toBe('scheduled');
  });

  it('opens the room while the mount unparks', () => {
    expect(sessionPhase(starts - PREP_LEAD_MS, starts, ends)).toBe('live');
    expect(sessionPhase(starts - PREP_LEAD_MS - 1, starts, ends)).toBe('scheduled');
  });

  it('is live for every moment the slot is paid for', () => {
    expect(sessionPhase(starts, starts, ends)).toBe('live');
    expect(sessionPhase(ends - 1, starts, ends)).toBe('live');
  });

  it('closes on the second the slot ends — the next booking is already moving', () => {
    expect(sessionPhase(ends, starts, ends)).toBe('ended');
    expect(sessionPhase(ends + 86_400_000, starts, ends)).toBe('ended');
  });
});
