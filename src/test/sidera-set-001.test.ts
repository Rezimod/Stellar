import { describe, expect, it } from 'vitest';
import { getRarityInfo } from '@/lib/nft-rarity';
import { getNode } from '@/lib/observatory/nodes';
import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { isRarity, RARITIES, rarityInfo } from '@/lib/rarity';
import { JUDGING_NODE_ID, subjectOf } from '@/lib/sets/build';
import { groupCards } from '@/lib/sets/groups';
import { SET_001, SET_001_CARD_BY_DESIGNATION, SET_001_CARDS } from '@/lib/sets/set-001';
import { cardStatus, eventLabel, isSealed } from '@/lib/sidera/almanac';
import { EDITION_SIZE } from '@/lib/sidera/economics';
import { observability } from '@/lib/sidera/observability';
import { plateFor } from '@/lib/sidera/plate';

const node = getNode(JUDGING_NODE_ID)!;
const seeds = SET_001_CARDS.map((c) => c.seed);
const byDesignation = (d: string) => SET_001_CARD_BY_DESIGNATION.get(d)!.seed;
const objects = SET_001_CARDS.filter((c) => c.record.section === 'object');
const almanac = SET_001_CARDS.filter((c) => c.record.section === 'almanac');
const pointable = objects.filter((c) => c.seed.targetId !== 'kept');

describe('First Light', () => {
  it('is twenty-four cards, sixteen objects then eight dated events, each filed under its own designation', () => {
    expect(SET_001.name).toBe('First Light');
    expect(seeds.length).toBe(24);
    expect(objects).toHaveLength(16);
    expect(almanac).toHaveLength(8);
    expect(SET_001_CARDS.slice(0, 16)).toEqual(objects);
    expect(new Set(seeds.map((c) => c.designation)).size).toBe(seeds.length);
    for (const c of seeds) expect(c.designation).toMatch(/^[A-Z0-9-]+$/);
  });

  it('takes every observation status from the helper, recomputed here', () => {
    for (const { seed, subject } of pointable) {
      const { resolveArcsec, magnitude, sizeArcmin } = subject;
      const recomputed = observability(subjectOf(seed, { resolveArcsec, magnitude, sizeArcmin }), node);
      expect(seed.observationStatus, seed.designation).toBe(recomputed.status);
    }
  });

  it('comes out as authored', () => {
    const statuses = Object.fromEntries(seeds.map((c) => [c.designation, `${c.rarity} ${c.observationStatus}`]));
    expect(statuses).toEqual({
      'FIRST-LIGHT': 'legendary not_available',
      IMILAC: 'legendary not_available',
      'LUNAR-FRAGMENT': 'legendary not_available',
      TYCHO: 'rare eligible',
      'OLYMPUS-MONS': 'common not_available',
      JUPITER: 'rare eligible',
      EUROPA: 'common not_available',
      SATURN: 'epic eligible',
      'KRAKEN-MARE': 'common not_available',
      HALLEY: 'legendary not_available',
      'VOYAGER-1': 'common not_available',
      M45: 'rare eligible',
      M42: 'rare eligible',
      M1: 'epic not_available',
      'SGR-A': 'common not_available',
      M31: 'rare not_available',
      ORIONIDS: 'common not_available',
      'HUNTERS-MOON': 'common not_available',
      'PLEIADES-OCCULTATION': 'rare not_available',
      GEMINIDS: 'rare not_available',
      'CHRISTMAS-SUPERMOON': 'rare not_available',
      'DOUBLE-OPPOSITION': 'epic not_available',
      'SNOW-MOON-ECLIPSE': 'epic not_available',
      'GREAT-ECLIPSE': 'legendary not_available',
    });
  });

  it('counts five of each tier as the table says: 5 legendary, 4 epic, 8 rare, 7 common', () => {
    const count = (r: string) => seeds.filter((c) => c.rarity === r).length;
    expect([count('legendary'), count('epic'), count('rare'), count('common')]).toEqual([5, 4, 8, 7]);
  });

  it('never offers the telescope what it cannot point at, and says why', () => {
    for (const c of SET_001_CARDS.filter((x) => x.seed.targetId === 'kept' || x.seed.targetId === 'event')) {
      expect(c.seed.observationStatus).toBe('not_available');
      expect(c.observability.reason.length).toBeGreaterThan(20);
    }
    for (const c of almanac) expect(c.seed.targetId).toBe('event');
  });

  it('only offers the night picker targets the node can actually capture', () => {
    for (const c of seeds.filter((s) => s.observationStatus !== 'not_available')) {
      expect(SIM_TARGET_BY_ID.has(c.targetId), c.designation).toBe(true);
    }
  });

  it('sizes editions from the one economics constant, rarer being fewer', () => {
    for (const c of seeds) {
      expect(isRarity(c.rarity)).toBe(true);
      expect(c.editionSize).toBe(EDITION_SIZE[c.rarity as keyof typeof EDITION_SIZE]);
    }
    const sizes = RARITIES.map((r) => EDITION_SIZE[r]);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it('has a fixed J2000 position for fixed objects and none for the moving ones', () => {
    for (const c of pointable.map((x) => x.seed)) {
      const moving = SIM_TARGET_BY_ID.get(c.targetId)?.kind === 'body' || c.targetId === 'halley';
      if (moving) {
        expect(c.raHours, c.designation).toBeNull();
        expect(c.decDeg, c.designation).toBeNull();
      } else {
        expect(c.raHours, c.designation).toBeGreaterThanOrEqual(0);
        expect(c.raHours, c.designation).toBeLessThan(24);
        expect(Math.abs(c.decDeg!), c.designation).toBeLessThanOrEqual(90);
      }
      const onMoon = c.surfaceLat !== null && c.surfaceLat !== undefined;
      expect(onMoon, c.designation).toBe(c.designation === 'TYCHO');
    }
  });

  it('takes deep-sky positions from the catalogue the node already uses', () => {
    for (const id of ['m42', 'm45', 'm31', 'm1']) {
      const d = DEEP_SKY_BY_ID.get(id)!;
      expect(byDesignation(id.toUpperCase())).toMatchObject({ raHours: d.ra, decDeg: d.dec });
    }
  });

  it('pairs cards both ways, and only with cards in the set', () => {
    for (const c of SET_001_CARDS) {
      const p = c.record.pairsWith;
      if (p === null) continue;
      const other = SET_001_CARD_BY_DESIGNATION.get(p);
      expect(other, `${c.seed.designation} pairs with ${p}`).toBeDefined();
      expect(other!.record.pairsWith).toBe(c.seed.designation);
    }
    expect(SET_001_CARDS.filter((c) => c.record.physical).map((c) => c.seed.designation)).toEqual(['IMILAC', 'LUNAR-FRAGMENT']);
  });

  it('prints three figures and a line on every card, in the logbook’s voice', () => {
    const banned = /\b(nfts?|mint(ed|ing|s)?|drops?|payload|manifest|registry|airdrops?)\b/i;
    for (const c of SET_001_CARDS) {
      expect(c.record.stats).toHaveLength(3);
      expect(c.record.line, c.seed.designation).not.toMatch(banned);
      expect(c.record.line).not.toContain('!');
      expect(c.seed.blurb).toBe(c.record.line);
      expect(c.seed.artUrl).toMatch(/^\/cards\//);
      const plate = plateFor(c.seed.designation)!;
      expect(plate.des.length, plate.des).toBeLessThanOrEqual(60);
      for (const [, value] of plate.data) expect(value.length, value).toBeLessThanOrEqual(17);
    }
  });

  it('lists the Almanac by date, every event with a window', () => {
    const dated = groupCards(SET_001_CARDS, 'almanac');
    expect(dated.map((c) => c.seed.designation)).toEqual([
      'ORIONIDS', 'HUNTERS-MOON', 'PLEIADES-OCCULTATION', 'GEMINIDS', 'CHRISTMAS-SUPERMOON', 'DOUBLE-OPPOSITION', 'SNOW-MOON-ECLIPSE', 'GREAT-ECLIPSE',
    ]);
    for (const c of dated) expect(Date.parse(c.record.eventEndUtc!)).toBeGreaterThan(Date.parse(c.record.eventStartUtc!));
    for (const c of objects) expect(c.record.eventEndUtc).toBeNull();
  });
});

describe('sealing', () => {
  const orionids = SET_001_CARD_BY_DESIGNATION.get('ORIONIDS')!;
  const before = new Date('2026-09-26T12:00:00Z');
  const during = new Date('2026-10-21T20:00:00Z');
  const after = new Date('2026-10-23T00:00:00Z');

  it('is open before the event ends and sealed from the moment it does', () => {
    expect(cardStatus(orionids, before)).toBe('open');
    expect(cardStatus(orionids, during)).toBe('open');
    expect(cardStatus(orionids, after)).toBe('sealed');
    expect(isSealed('ORIONIDS', after)).toBe(true);
    expect(isSealed('JUPITER', new Date('2099-01-01T00:00:00Z'))).toBe(false);
    expect(isSealed('NOT-A-CARD', after)).toBe(false);
  });

  it('counts down in days, then says under way, then sealed', () => {
    const { eventStartUtc: s, eventEndUtc: e } = orionids.record;
    expect(eventLabel(s!, e!, before)).toBe('In 25 days');
    expect(eventLabel(s!, e!, new Date('2026-10-20T12:00:00Z'))).toBe('Tonight');
    expect(eventLabel(s!, e!, during)).toBe('Under way');
    expect(eventLabel(s!, e!, after)).toBe('Sealed');
  });
});

describe('rarity', () => {
  it('orders the four card tiers by scarcity', () => {
    expect(RARITIES.map((r) => rarityInfo(r).rank)).toEqual([0, 1, 2, 3]);
    expect(rarityInfo('legendary')).toMatchObject({ label: 'Legendary', glyph: '✦' });
    expect(isRarity('Stellar')).toBe(false);
  });

  it('still reads the tiers written into minted Stellar observations', () => {
    expect(getRarityInfo('Stellar').label).toBe('Stellar');
    expect(getRarityInfo('Celestial').label).toBe('Celestial');
    expect(getRarityInfo('unknown').rarity).toBe('Common');
  });
});
