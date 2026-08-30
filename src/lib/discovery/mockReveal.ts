import { TIERS, type TierId } from '@/lib/discovery/tiers';

/**
 * Sample reveal payloads — one real celestial object per rarity tier.
 *
 * MOCK DATA. Nothing here is drawn from chain. It exists so the reveal UI can
 * be demoed and reviewed at every tier before the program exists; the shape of
 * `RevealedObject` is the contract the real reveal will have to fill.
 */

export type ObjectType = 'nebula' | 'planet' | 'star' | 'exoplanet' | 'black_hole';

export const OBJECT_TYPE_LABEL: Record<ObjectType, string> = {
  nebula: 'Nebula',
  planet: 'Planet',
  star: 'Star',
  exoplanet: 'Exoplanet',
  black_hole: 'Black Hole',
};

export type RevealedObject = {
  /** Catalogue designation, e.g. "NGC 7293". */
  catalog: string;
  /** Common name, e.g. "The Helix Nebula". */
  name: string;
  type: ObjectType;
  tier: TierId;
  constellation: string;
  /** Distance in light years. Sgr A* and the Pleiades are both real figures. */
  distanceLy: number;
  blurb: string;
  /** Palette for the generative visual — core, mid field, outer halo. */
  visual: { core: string; mid: string; halo: string };
  /** Key into OBJECT_ART when this object has actually been photographed.
   *  Three of the five fixtures have not, and never will be — a black hole and
   *  an exoplanet do not have portraits — so they keep the palette above. */
  artId?: string;
};

export const MOCK_REVEALS: Record<TierId, RevealedObject> = {
  common: {
    catalog: 'M45',
    name: 'The Pleiades',
    type: 'star',
    tier: 'common',
    constellation: 'Taurus',
    distanceLy: 444,
    blurb:
      'An open cluster of hot blue stars, drifting through a field of dust they happen to be lighting up. Visible to the unaided eye from a dark site.',
    visual: { core: '#DCE6FF', mid: '#4B6BC4', halo: '#131E45' },
    artId: 'm45-pleiades',
  },
  uncommon: {
    catalog: 'M42',
    name: 'The Orion Nebula',
    type: 'nebula',
    tier: 'uncommon',
    constellation: 'Orion',
    distanceLy: 1_344,
    blurb:
      'A stellar nursery in the sword of Orion, where more than a thousand young stars are still forming. The brightest nebula in the night sky.',
    visual: { core: '#9BE8F5', mid: '#1F7FA8', halo: '#0A2434' },
    artId: 'm42-orion',
  },
  rare: {
    catalog: 'Kepler-186f',
    name: 'The Distant Analogue',
    type: 'exoplanet',
    tier: 'rare',
    constellation: 'Cygnus',
    distanceLy: 579,
    blurb:
      'The first Earth-sized planet found in the habitable zone of another star. It orbits a red dwarf every 130 days.',
    visual: { core: '#D9B6FF', mid: '#7B3FC4', halo: '#25123F' },
  },
  epic: {
    catalog: 'Sgr A*',
    name: 'Sagittarius A*',
    type: 'black_hole',
    tier: 'epic',
    constellation: 'Sagittarius',
    distanceLy: 26_700,
    blurb:
      'The supermassive black hole at the centre of our galaxy, four million times the mass of the Sun. Everything you have ever seen orbits it.',
    visual: { core: '#FFD9A0', mid: '#C46A12', halo: '#2E1603' },
  },
  legendary: {
    catalog: 'NGC 7293',
    name: 'The Helix Nebula',
    type: 'nebula',
    tier: 'legendary',
    constellation: 'Aquarius',
    distanceLy: 655,
    blurb:
      'A dying sun-like star casting off its outer layers — a preview of what will become of our own Sun. Often called the Eye of God.',
    visual: { core: '#FFEBB0', mid: '#D89A2E', halo: '#33220A' },
  },
};

/** Pass number shown in the pre-reveal state. Mock. */
export const MOCK_PASS_NUMBER = 1_847;

/** Narrow an arbitrary query string to a tier, or null. */
export function parsePreviewTier(value: string | null | undefined): TierId | null {
  if (!value) return null;
  return value in MOCK_REVEALS ? (value as TierId) : null;
}

/**
 * MOCK tier draw, derived from the wallet address so a given wallet always sees
 * the same result across reloads.
 *
 * This is emphatically NOT how the real draw can work: the address is public and
 * this function is in a public repo, so anyone could compute their outcome
 * before buying. The real assignment needs a seed committed by hash before the
 * sale and revealed on reveal day. See the note in docs before wiring this up.
 */
export function mockTierForAddress(address: string): TierId {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (Math.imul(hash, 31) + address.charCodeAt(i)) >>> 0;
  }
  const roll = (hash % 10_000) / 100; // 0.00 – 99.99

  let cumulative = 0;
  for (const tier of TIERS) {
    cumulative += tier.odds;
    if (roll < cumulative) return tier.id;
  }
  return 'common';
}
