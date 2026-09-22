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
const STARLIGHT: Palette = { sky: ['#1a2340', '#0b1226', '#04070f'], body: '#ffffff', shade: '#6d7ea6', glow: '#bcd8ff' };

export const PALETTE: Record<string, Palette> = {
  // Real.
  MOON: { sky: ['#18213c', '#0a1022', '#04070f'], body: '#dfe3ea', shade: '#5c6680', glow: '#c9d6ff' },
  TYCHO: LUNAR,
  'TRANQUILITY-BASE': LUNAR,
  VENUS: { sky: ['#3b2c18', '#180f09', '#06040a'], body: '#f4dcab', shade: '#a67c40', glow: '#ffd79a' },
  MARS: { sky: ['#3a1d12', '#190c0a', '#06040a'], body: '#e0713c', shade: '#762c19', glow: '#ff9a63' },
  JUPITER: { sky: ['#382a1d', '#17100c', '#06050a'], body: '#e9c99d', shade: '#7f5232', glow: '#ffbd8a' },
  SATURN: { sky: ['#2b2a3e', '#120f1e', '#05060f'], body: '#e9d5a8', shade: '#7d6740', glow: '#ffe3a3' },
  PLUTO: { sky: ['#251d2f', '#100c18', '#04040a'], body: '#dcc9b6', shade: '#63544d', glow: '#e4d3ff' },
  HALLEY: { sky: ['#14223a', '#08111f', '#03060d'], body: '#ffe6b8', shade: '#6d7ea6', glow: '#7fc8ff' },
  SIRIUS: { sky: ['#17254a', '#0a1328', '#04070f'], body: '#e6f1ff', shade: '#6d7ea6', glow: '#9fcaff' },
  POLARIS: { sky: ['#141c38', '#080f22', '#03050d'], body: '#fff4dc', shade: '#6d7ea6', glow: '#a9c4ff' },
  BETELGEUSE: { sky: ['#2e140f', '#140807', '#05030a'], body: '#e8672f', shade: '#7a1f12', glow: '#ff7a4a' },
  M42: { sky: ['#2f2038', '#12101f', '#04060f'], body: '#f4a8c2', shade: '#6d4a6a', glow: '#7fd8ff' },
  M45: { sky: ['#132446', '#08122a', '#03060f'], body: '#dff0ff', shade: '#5a74a8', glow: '#6fb6ff' },
  M31: { sky: ['#1b1f3c', '#0b0e22', '#04050d'], body: '#f3d9ae', shade: '#5a5f86', glow: '#b8c6ff' },
  M16: { sky: ['#12302e', '#0a1716', '#030807'], body: '#f5d08a', shade: '#2a1a14', glow: '#56d6c2' },
  M87: { sky: ['#1c120a', '#0b0705', '#030203'], body: '#ffb45a', shade: '#3a1a08', glow: '#ff8a2a' },
  // Fiction.
  'TWIN-SUN': { sky: ['#3a2138', '#1a0f1f', '#07040b'], body: '#ffcf94', shade: '#7a3e24', glow: '#ff9a5a' },
  'TIDE-WORLD': { sky: ['#0f2440', '#07132a', '#03060f'], body: '#2a7fd4', shade: '#0a2552', glow: '#7fd8ff' },
  'RING-HABITAT': { sky: ['#15203c', '#0a1024', '#03050e'], body: '#5fbf8f', shade: '#3a4458', glow: '#bfe4ff' },
  'UNIT-7': { sky: ['#1a2a3a', '#0c1622', '#04070d'], body: '#d9e2ea', shade: '#5a6a80', glow: '#ff9a4a' },
  SENTINEL: { sky: ['#1a1030', '#0c0718', '#040208'], body: '#6a4ab0', shade: '#1a1040', glow: '#5ef0ff' },
  'BLACK-SLAB': { sky: ['#1c1a24', '#0c0b12', '#040306'], body: '#8a8274', shade: '#2a2620', glow: '#e8e2d4' },
  DERELICT: { sky: ['#101824', '#070c14', '#020408'], body: '#586274', shade: '#232a36', glow: '#6fa8d8' },
  WORMHOLE: { sky: ['#140f30', '#080618', '#020108'], body: '#b9a4ff', shade: '#2a1f5a', glow: '#8fd0ff' },
};

export function paletteFor(designation: string): Palette {
  return PALETTE[designation] ?? STARLIGHT;
}
