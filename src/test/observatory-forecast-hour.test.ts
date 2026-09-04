import { describe, expect, it, vi } from 'vitest';
import { utcHourStamp } from '@/lib/observatory/site-time';

/**
 * Open-Meteo is asked for a forecast without a `timezone` parameter, so it
 * answers in GMT. Keying its hours by a site's wall clock looked right and was
 * wrong by the site's offset — Tbilisi is UTC+4, so every cloud reading was
 * taken from four hours later than the moment asked about. Both the slot
 * timetable and node readiness did it.
 *
 * The forecast below is deliberately built so the two answers differ: one value
 * at the true UTC hour, a different one four hours on.
 */
const HOURS = [
  { time: '2026-09-04T18:00', cloudCover: 10 },
  { time: '2026-09-04T19:00', cloudCover: 20 },
  { time: '2026-09-04T20:00', cloudCover: 30 },
  { time: '2026-09-04T21:00', cloudCover: 40 },
  { time: '2026-09-04T22:00', cloudCover: 90 },
];

vi.mock('@/lib/sky-data', () => ({
  fetchSkyForecast: async () => [{ date: '2026-09-04', hours: HOURS }],
}));

describe('finding the forecast hour', () => {
  it('keys on UTC, which is what the forecast is in', () => {
    expect(utcHourStamp(new Date('2026-09-04T18:30:00Z'))).toBe('2026-09-04T18');
    expect(utcHourStamp(new Date('2026-09-04T18:00:00Z'))).toBe('2026-09-04T18');
  });

  it('does not drift with the site the caller happens to be thinking about', () => {
    // The bug: 18:00 UTC is 22:00 in Tbilisi, and a wall-clock key found the
    // 22:00 row — 90% cloud instead of 10%.
    const at = new Date('2026-09-04T18:00:00Z');
    const byHour = new Map(HOURS.map((h) => [h.time.slice(0, 13), h.cloudCover]));

    expect(byHour.get(utcHourStamp(at))).toBe(10);
    expect(byHour.get('2026-09-04T22')).toBe(90);
  });

  it('attaches the cloud of the slot itself, not of some hours later', async () => {
    const { attachForecast } = await import('@/lib/observatory/availability');
    const { NODES } = await import('@/lib/observatory/nodes');

    const slots = [
      {
        id: 'tbilisi-01:2026-09-04T19:00Z',
        nodeId: 'tbilisi-01',
        startsAt: '2026-09-04T19:00:00.000Z',
        endsAt: '2026-09-04T19:20:00.000Z',
        night: '2026-09-04',
        cloudCover: null,
      },
    ];

    const [withWeather] = await attachForecast(NODES[0], slots);
    expect(withWeather.cloudCover).toBe(20);
  });

  it('reports readiness against the hour it is actually checking', async () => {
    const { SimNodeAdapter } = await import('@/lib/observatory/adapter');
    const { NODES } = await import('@/lib/observatory/nodes');

    // 21:00 UTC: dark over Tbilisi, and 40% cloud rather than the 90% a
    // wall-clock lookup would have found an hour later in the table.
    const readiness = await new SimNodeAdapter().getReadiness(
      NODES[0],
      new Date('2026-09-04T21:00:00Z'),
    );
    expect(readiness.cloudCover).toBe(40);
  });
});
