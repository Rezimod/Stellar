import type { AuthoredCard, Family } from './build';

/** First Light's families, in the set's order; the Almanac by date. */
export const SET_GROUPS: Array<{ key: Family; title: string; short: string }> = [
  { key: 'near', title: 'The Solar System', short: 'Solar System' },
  { key: 'stars', title: 'The Stars', short: 'Stars' },
  { key: 'deep', title: 'The Deep Sky', short: 'Deep Sky' },
  { key: 'galaxies', title: 'The Galaxies', short: 'Galaxies' },
  { key: 'extremes', title: 'The Extremes', short: 'Extremes' },
  { key: 'frontier', title: 'The Frontier', short: 'Frontier' },
  { key: 'almanac', title: 'The Almanac', short: 'Almanac' },
];

export function groupCards(cards: AuthoredCard[], family: Family): AuthoredCard[] {
  const of = cards.filter((c) => c.record.family === family);
  if (family === 'almanac') of.sort((a, b) => a.record.eventStartUtc!.localeCompare(b.record.eventStartUtc!));
  return of;
}
