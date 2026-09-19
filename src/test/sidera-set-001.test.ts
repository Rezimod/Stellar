import { describe, expect, it } from 'vitest';
import { getRarityInfo } from '@/lib/nft-rarity';
import { getNode } from '@/lib/observatory/nodes';
import { DEEP_SKY_BY_ID } from '@/lib/observatory/sky-field';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { isRarity, RARITIES, rarityInfo } from '@/lib/rarity';
import { JUDGING_NODE_ID, subjectOf } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION, SET_001_CARDS } from '@/lib/sets/set-001';
import { EDITION_SIZE } from '@/lib/sidera/economics';
import { observability } from '@/lib/sidera/observability';
import { TYCHO } from '@/lib/sidera/tycho';
import { BRIGHT_STARS } from '@/lib/sky/stars';

const node = getNode(JUDGING_NODE_ID)!;
const seeds = SET_001_CARDS.map((c) => c.seed);
const byDesignation = (d: string) => SET_001_CARD_BY_DESIGNATION.get(d)!.seed;

describe('Set 001', () => {
  it('is sixteen to twenty cards, each filed under its own designation', () => {
    expect(seeds.length).toBeGreaterThanOrEqual(16);
    expect(seeds.length).toBeLessThanOrEqual(20);
    expect(new Set(seeds.map((c) => c.designation)).size).toBe(seeds.length);
    for (const c of seeds) expect(c.designation).toMatch(/^[A-Z0-9-]+$/);
  });

  it('takes every observation status from the helper, recomputed here', () => {
    for (const { seed, subject } of SET_001_CARDS) {
      // The subject judged is the card's own target and position.
      const { resolveArcsec, magnitude, sizeArcmin } = subject;
      const recomputed = observability(subjectOf(seed, { resolveArcsec, magnitude, sizeArcmin }), node);
      expect(seed.observationStatus, seed.designation).toBe(recomputed.status);
    }
  });

  it('comes out as authored', () => {
    const statuses = Object.fromEntries(seeds.map((c) => [c.designation, `${c.rarity} ${c.observationStatus}`]));
    expect(statuses).toEqual({
      TYCHO: 'rare eligible',
      COPERNICUS: 'common eligible',
      PLATO: 'common eligible',
      CLAVIUS: 'rare eligible',
      'TRANQUILITY-BASE': 'legendary not_available',
      VENUS: 'common eligible',
      MARS: 'common eligible',
      JUPITER: 'common eligible',
      'GREAT-RED-SPOT': 'rare eligible',
      EUROPA: 'epic not_available',
      SATURN: 'legendary eligible',
      PLUTO: 'legendary not_available',
      ALBIREO: 'rare eligible',
      MIZAR: 'common eligible',
      CANOPUS: 'rare not_available',
      M42: 'common eligible',
      M13: 'common eligible',
      M57: 'epic eligible',
      M101: 'epic not_available',
      NGC5139: 'epic not_available',
    });
  });

  it('pairs Europa, epic, with not_available', () => {
    const europa = byDesignation('EUROPA');
    expect(europa.rarity).toBe('epic');
    expect(europa.observationStatus).toBe('not_available');
  });

  it('keeps rarity independent of whether the node can record the object', () => {
    for (const status of ['eligible', 'not_available']) {
      const rarities = new Set(seeds.filter((c) => c.observationStatus === status).map((c) => c.rarity));
      expect(rarities.has('legendary'), status).toBe(true);
      expect(rarities.has('epic'), status).toBe(true);
    }
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
    for (const c of seeds) {
      const moving = SIM_TARGET_BY_ID.get(c.targetId)?.kind === 'body' || ['pluto'].includes(c.targetId);
      if (moving) {
        expect(c.raHours, c.designation).toBeNull();
        expect(c.decDeg, c.designation).toBeNull();
      } else {
        expect(c.raHours, c.designation).toBeGreaterThanOrEqual(0);
        expect(c.raHours, c.designation).toBeLessThan(24);
        expect(Math.abs(c.decDeg!), c.designation).toBeLessThanOrEqual(90);
      }
      const onMoon = c.surfaceLat !== null && c.surfaceLat !== undefined;
      expect(onMoon, c.designation).toBe(c.targetId === 'moon');
    }
  });

  it('takes star and deep-sky positions from the catalogues the node already uses', () => {
    const stars = { ALBIREO: 'albireo', MIZAR: 'mizar', CANOPUS: 'canopus' };
    for (const [designation, id] of Object.entries(stars)) {
      const s = BRIGHT_STARS.find((x) => x.id === id)!;
      expect(byDesignation(designation)).toMatchObject({ raHours: s.ra, decDeg: s.dec });
    }
    for (const id of ['m42', 'm13', 'm57', 'm101']) {
      const d = DEEP_SKY_BY_ID.get(id)!;
      expect(byDesignation(id.toUpperCase())).toMatchObject({ raHours: d.ra, decDeg: d.dec });
    }
  });

  it('agrees with the sim targets on the position of everything the node carries', () => {
    for (const c of seeds) {
      const target = SIM_TARGET_BY_ID.get(c.targetId);
      if (target?.kind !== 'fixed') continue;
      expect(c.raHours, c.designation).toBeCloseTo(target.ra!, 3);
      expect(c.decDeg, c.designation).toBeCloseTo(target.dec!, 3);
    }
  });

  it('keeps TYCHO as the Phase 3 slice declared it', () => {
    expect(byDesignation('TYCHO')).toEqual(TYCHO);
    expect(TYCHO).toMatchObject({ targetId: 'moon', surfaceLat: -43.31, surfaceLon: -11.36, rarity: 'rare' });
  });

  it('writes its blurbs in the logbook’s voice', () => {
    const banned = /\b(nfts?|mint(ed|ing|s)?|drops?|payload|manifest|registry|airdrops?)\b/i;
    for (const c of seeds) {
      expect(c.blurb, c.designation).not.toMatch(banned);
      expect(c.blurb, c.designation).not.toContain('!');
      expect(c.artUrl).toMatch(/^\/cards\//);
    }
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
