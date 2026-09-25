import type { AuthoredCard, Section } from './build';

/** First Light's two halves: the Objects in the set's order, the Almanac by date. */
export const SET_GROUPS: Array<{ key: Section; title: string; short: string }> = [
  { key: 'object', title: 'The Objects', short: 'The Objects' },
  { key: 'almanac', title: 'The Almanac', short: 'The Almanac' },
];

export function groupCards(cards: AuthoredCard[], section: Section): AuthoredCard[] {
  const of = cards.filter((c) => c.record.section === section);
  if (section === 'almanac') of.sort((a, b) => a.record.eventStartUtc!.localeCompare(b.record.eventStartUtc!));
  return of;
}
