import type { Station } from '@/lib/observatory/sim-stations';

/** Tbilisi One is Node 01 in Sidera; the simulated stations keep their own names. */
export const stationName = (s: Station) => (s.id === 'tbilisi-01' ? 'Node 01' : s.name);

export const SKY_LABEL = { night: 'Dark sky · available', twilight: 'Twilight', day: 'Daylight' } as const;
