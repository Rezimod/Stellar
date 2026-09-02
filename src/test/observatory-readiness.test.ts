import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservatoryNode } from '@/lib/observatory/types';

const fetchSkyForecast = vi.fn();
vi.mock('@/lib/sky-data', () => ({ fetchSkyForecast: (...a: unknown[]) => fetchSkyForecast(...a) }));

const node: ObservatoryNode = {
  id: 'tbilisi-01',
  name: 'Tbilisi One',
  site: 'Tbilisi, Georgia',
  countryCode: 'GE',
  lat: 41.7151,
  lon: 44.8271,
  timezone: 'Asia/Tbilisi',
  bortle: 8,
  tier: 'first_party',
  status: 'active',
  instrument: {
    optics: 'Celestron NexStar 6SE',
    apertureMm: 150,
    focalLengthMm: 1500,
    mount: 'Single-fork altazimuth, GoTo',
    camera: 'ZWO ASI585MC',
    suitedTo: ['Moon'],
  },
  priceGel: 40,
  sessionMinutes: 20,
};

/** Open-Meteo answers in the site's own timezone, with no offset on the stamp. */
function siteForecast(localHour: string, cloudCover: number) {
  return [{ date: localHour.slice(0, 10), hours: [{ time: localHour, cloudCover, visibility: 0, temp: 0, humidity: 0, wind: 0 }] }];
}

async function readiness(now: Date) {
  const { SimNodeAdapter } = await import('@/lib/observatory/adapter');
  return new SimNodeAdapter().getReadiness(node, now);
}

describe('SimNodeAdapter readiness', () => {
  beforeEach(() => fetchSkyForecast.mockClear());

  it('reports daylight without asking for weather', async () => {
    // 08:00 UTC = 12:00 in Tbilisi, sun high.
    const r = await readiness(new Date('2026-06-15T08:00:00Z'));

    expect(r.state).toBe('daylight');
    expect(fetchSkyForecast).not.toHaveBeenCalled();
  });

  it('matches the forecast hour on the site wall clock, not the runtime zone', async () => {
    // 20:00 UTC = 00:00 next day in Tbilisi (+4). Reading the stamp as UTC
    // would look for 20:00 and miss, which is the bug this guards.
    fetchSkyForecast.mockResolvedValue(siteForecast('2026-01-16T00:00', 95));

    const r = await readiness(new Date('2026-01-15T20:00:00Z'));

    expect(r.state).toBe('weather');
    expect(r.cloudCover).toBe(95);
  });

  it('is observable on a clear night when the node is active', async () => {
    fetchSkyForecast.mockResolvedValue(siteForecast('2026-01-16T00:00', 10));

    const r = await readiness(new Date('2026-01-15T20:00:00Z'));

    expect(r.state).toBe('online');
  });

  it('never reports online while a node is commissioning', async () => {
    fetchSkyForecast.mockResolvedValue(siteForecast('2026-01-16T00:00', 10));
    const { SimNodeAdapter } = await import('@/lib/observatory/adapter');

    const r = await new SimNodeAdapter().getReadiness(
      { ...node, status: 'commissioning' },
      new Date('2026-01-15T20:00:00Z'),
    );

    expect(r.state).toBe('offline');
    expect(r.detail).toMatch(/commissioning/i);
  });

  it('degrades to unknown cloud cover rather than failing when the forecast is down', async () => {
    // Replace the module for this test only. Routing the rejection through a
    // vi.fn() makes vitest's own settled-result tracking observe an unhandled
    // rejection even though the adapter awaits and catches it.
    vi.resetModules();
    vi.doMock('@/lib/sky-data', () => ({
      fetchSkyForecast: async () => {
        throw new Error('open-meteo down');
      },
    }));

    const { SimNodeAdapter } = await import('@/lib/observatory/adapter');
    const r = await new SimNodeAdapter().getReadiness(node, new Date('2026-01-15T20:00:00Z'));

    expect(r.cloudCover).toBeNull();
    expect(r.state).toBe('online');

    vi.doUnmock('@/lib/sky-data');
    vi.resetModules();
  });
});
