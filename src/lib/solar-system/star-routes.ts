// The hyperdrive's routes: the systems a ship can drop into and how far
// apart they are. Alpha Centauri is the real 4.37 light years; Gargantua is
// the black hole from Interstellar, a galaxy away through the wormhole.

export const STAR_SYSTEMS = ['sol', 'alphaCentauri', 'gargantua'] as const;
export type StarSystemId = (typeof STAR_SYSTEMS)[number];

const CENTAURI_LY = 4.37;
const GARGANTUA_LY = 10_000_000_000;

export function lightYearsBetween(a: string, b: string): number {
  if (a === b) return 0;
  return a === 'gargantua' || b === 'gargantua' ? GARGANTUA_LY : CENTAURI_LY;
}

/** The chosen destination, unless it is where the ship already is — then the
 *  default hop: out to Alpha Centauri from home, home from anywhere else. */
export function resolveDestination(current: string, chosen: string): StarSystemId {
  if (chosen !== current && (STAR_SYSTEMS as readonly string[]).includes(chosen)) return chosen as StarSystemId;
  return current === 'sol' ? 'alphaCentauri' : 'sol';
}

/** Where the drive can go from here: every system but the current one. */
export function jumpChoices(current: string): StarSystemId[] {
  return STAR_SYSTEMS.filter((s) => s !== current);
}
