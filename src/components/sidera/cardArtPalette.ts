/**
 * A palette per object, so a card is recognisable before its name is read.
 *
 * The colours are the object's own: Mars rusts, Europa is ice over a dark sea,
 * Saturn is straw and shadow. Where an object has no colour of its own — a
 * crater, a cluster — the family's palette stands in.
 */

export type Palette = {
  /** Sky, centre outwards. */
  sky: [string, string, string];
  /** The lit side of the body. */
  body: string;
  /** Its shadowed side and its markings. */
  shade: string;
  /** The halo, the rings, the nebula wash. */
  glow: string;
};

const LUNAR: Palette = { sky: ['#1b2440', '#0a1122', '#04070f'], body: '#dbe1ec', shade: '#5f6a82', glow: '#bacbff' };
const CLUSTER: Palette = { sky: ['#2a2438', '#110e1f', '#05040c'], body: '#ffe3a3', shade: '#8a6f3c', glow: '#ffd08a' };
const STARLIGHT: Palette = { sky: ['#1a2340', '#0b1226', '#04070f'], body: '#ffffff', shade: '#6d7ea6', glow: '#bcd8ff' };

export const PALETTE: Record<string, Palette> = {
  TYCHO: LUNAR,
  COPERNICUS: LUNAR,
  PLATO: LUNAR,
  CLAVIUS: LUNAR,
  'TRANQUILITY-BASE': LUNAR,
  VENUS: { sky: ['#3b2c18', '#180f09', '#06040a'], body: '#f4dcab', shade: '#a67c40', glow: '#ffd79a' },
  MARS: { sky: ['#3a1d12', '#190c0a', '#06040a'], body: '#e0713c', shade: '#762c19', glow: '#ff9a63' },
  JUPITER: { sky: ['#382a1d', '#17100c', '#06050a'], body: '#e9c99d', shade: '#7f5232', glow: '#ffbd8a' },
  'GREAT-RED-SPOT': { sky: ['#3a241c', '#180e0b', '#06040a'], body: '#e9c99d', shade: '#8c3f2a', glow: '#ff8f6a' },
  EUROPA: { sky: ['#16283a', '#091422', '#03060f'], body: '#eef4ff', shade: '#7f97b8', glow: '#bfe4ff' },
  SATURN: { sky: ['#2b2a3e', '#120f1e', '#05060f'], body: '#e9d5a8', shade: '#7d6740', glow: '#ffe3a3' },
  PLUTO: { sky: ['#251d2f', '#100c18', '#04040a'], body: '#dcc9b6', shade: '#63544d', glow: '#e4d3ff' },
  ALBIREO: { sky: ['#1d2440', '#0b1226', '#04070f'], body: '#ffd79a', shade: '#6d7ea6', glow: '#8ab6ff' },
  MIZAR: { sky: ['#1a2340', '#0a1124', '#04070f'], body: '#eef3ff', shade: '#6d7ea6', glow: '#bcd8ff' },
  CANOPUS: { sky: ['#20263f', '#0c1224', '#04070f'], body: '#ffffff', shade: '#7182aa', glow: '#dce9ff' },
  M42: { sky: ['#2f2038', '#12101f', '#04060f'], body: '#f4a8c2', shade: '#6d4a6a', glow: '#7fd8ff' },
  M13: CLUSTER,
  NGC5139: CLUSTER,
  M57: { sky: ['#1a2b36', '#0b1520', '#04070f'], body: '#9ff0e4', shade: '#3f6a72', glow: '#ff9ab0' },
  M101: { sky: ['#1a2240', '#0a1024', '#04060f'], body: '#cfe0ff', shade: '#5a6b96', glow: '#9fd0ff' },
};

export function paletteFor(designation: string): Palette {
  return PALETTE[designation] ?? STARLIGHT;
}
