/**
 * The drawing kit the survey plates are built from.
 *
 * Every helper returns SVG markup as a string. Geometry comes from a seeded
 * generator, so a plate is the same on the server and in the browser and never
 * changes between renders. Ids take a prefix so several plates can share a page.
 */

/** One decimal, no trailing ".0": keeps the markup small. */
export function n(x: number): string {
  const s = x.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** Mulberry32, with a Gaussian beside it. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => lo + Math.floor((hi - lo + 1) * next()),
    pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    gauss: (mu: number, sigma: number) => {
      const u = 1 - next();
      const v = next();
      return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
export type Rng = ReturnType<typeof rng>;

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** A rounded rectangle as a path, drawn clockwise. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}` +
    `A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  );
}

/** An irregular closed shape: a mare, a cloud. */
export function blob(cx: number, cy: number, rx: number, ry: number, r: Rng, count = 14, jitter = 0.22): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count;
    const k = 1 + r.uniform(-jitter, jitter);
    pts.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  const last = pts[count - 1];
  let d = `M${n((pts[0][0] + last[0]) / 2)} ${n((pts[0][1] + last[1]) / 2)}`;
  for (let i = 0; i < count; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % count];
    d += `Q${n(p[0])} ${n(p[1])} ${n((p[0] + q[0]) / 2)} ${n((p[1] + q[1]) / 2)}`;
  }
  return d + 'Z';
}

export const spikeDefs = (u: string) =>
  `<linearGradient id="${u}spH" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${u}spV" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

const WHITES = ['#ffffff', '#dfe8ff', '#fff1dc', '#cfe0ff'] as const;

/** A star field: mostly faint points, a few bright ones with diffraction spikes. Needs spikeDefs(u). */
export function starfield(w: number, h: number, count: number, seed: number, spikes: number, u: string, tints: readonly string[] = WHITES): string {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const m = r.next() ** 3.2;
    out += `<circle cx="${n(r.uniform(0, w))}" cy="${n(r.uniform(0, h))}" r="${n(0.3 + 1.2 * m)}" fill="${r.pick(tints)}" opacity="${n(0.25 + 0.7 * r.next() ** 0.6)}"/>`;
  }
  for (let i = 0; i < spikes; i++) {
    const x = r.uniform(20, w - 20);
    const y = r.uniform(20, h - 20);
    const L = r.uniform(10, 22);
    out +=
      `<g opacity="${n(r.uniform(0.6, 1))}"><circle cx="${n(x)}" cy="${n(y)}" r="6" fill="${r.pick(tints)}" opacity=".12"/><circle cx="${n(x)}" cy="${n(y)}" r="1.5" fill="#fff"/>` +
      `<rect x="${n(x - L)}" y="${n(y - 0.3)}" width="${n(2 * L)}" height=".6" fill="url(#${u}spH)"/><rect x="${n(x - 0.3)}" y="${n(y - L)}" width=".6" height="${n(2 * L)}" fill="url(#${u}spV)"/></g>`;
  }
  return out;
}

/** Film grain over a layer. */
export const grain = (u: string, w: number, h: number, op: number) =>
  `<filter id="${u}gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>` +
  `<rect width="${w}" height="${h}" filter="url(#${u}gr)" opacity="${n(op)}" style="mix-blend-mode:overlay"/>`;

/** A layer: fills its box, crops rather than letterboxes. */
export const layer = (w: number, h: number, inner: string, defs = '') =>
  `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" style="display:block" aria-hidden="true" focusable="false"><defs>${defs}</defs>${inner}</svg>`;

const LBL = 'font-family:var(--sd-mono),ui-monospace,monospace;font-size:8.5px;letter-spacing:1.4px';
export const LABEL_STYLE = LBL;

/** A survey callout: a ring on the feature, an elbowed leader, one or two mono lines. */
export function callout(
  pt: [number, number],
  at: [number, number],
  lines: string[],
  anchor: 'start' | 'end' = 'start',
  color = 'rgba(245,241,232,.82)',
  dot = true,
): string {
  const [px, py] = pt;
  const [lx, ly] = at;
  const ex = anchor === 'start' ? lx - 6 : lx + 6;
  let out = `<path d="M${n(px)} ${n(py)}L${n(px + (ex - px) * 0.35)} ${n(ly - 3)}L${n(ex)} ${n(ly - 3)}" fill="none" stroke="rgba(245,241,232,.42)" stroke-width=".6"/>`;
  if (dot) {
    out += `<circle cx="${n(px)}" cy="${n(py)}" r="2.2" fill="none" stroke="${color}" stroke-width=".8"/><circle cx="${n(px)}" cy="${n(py)}" r=".8" fill="${color}"/>`;
  }
  lines.forEach((t, i) => {
    out += `<text x="${n(lx)}" y="${n(ly + i * 11)}" text-anchor="${anchor}" fill="${color}" opacity="${i === 0 ? 1 : 0.62}" style="${LBL}">${t}</text>`;
  });
  return out;
}

export function scalebar(x: number, y: number, w: number, text: string, anchor: 'start' | 'end' = 'start'): string {
  return (
    `<g stroke="rgba(245,241,232,.6)" stroke-width=".7"><line x1="${n(x)}" y1="${n(y)}" x2="${n(x + w)}" y2="${n(y)}"/><line x1="${n(x)}" y1="${n(y - 3)}" x2="${n(x)}" y2="${n(y + 3)}"/><line x1="${n(x + w)}" y1="${n(y - 3)}" x2="${n(x + w)}" y2="${n(y + 3)}"/></g>` +
    `<text x="${n(anchor === 'start' ? x : x + w)}" y="${n(y - 7)}" text-anchor="${anchor}" fill="rgba(245,241,232,.7)" style="${LBL}">${text}</text>`
  );
}

/** A dotted ring with degree ticks, the survey's reticle. */
export function reticle(cx: number, cy: number, r: number, ticks = 72, major = 6, op = 0.3): string {
  let out = `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="rgba(245,241,232,${op})" stroke-width=".6" stroke-dasharray="1 4"/>`;
  const every = Math.floor(ticks / major);
  for (let i = 0; i < ticks; i++) {
    const a = (2 * Math.PI * i) / ticks;
    const L = i % every === 0 ? 7 : 3;
    out += `<line x1="${n(cx + r * Math.cos(a))}" y1="${n(cy + r * Math.sin(a))}" x2="${n(cx + (r + L) * Math.cos(a))}" y2="${n(cy + (r + L) * Math.sin(a))}" stroke="rgba(245,241,232,${n(op + 0.15)})" stroke-width=".6"/>`;
  }
  return out;
}

/** A plain line of survey text at the top of the plate. */
export const heading = (text: string) => `<text x="30" y="96" fill="rgba(245,241,232,.5)" style="${LBL}">${text}</text>`;

/** Stellar's comet mark, 22 units square. */
export const COMET =
  'M13.0922 3.36946V1.73961C13.0922 1.27436 12.5543 1.01542 12.1906 1.30569L2.8604 8.75177C-0.321404 11.5593 -0.474794 16.4692 2.52582 19.4698C5.5263 22.4704 10.4363 22.3171 13.2437 19.1351L20.6898 9.80489C20.9801 9.44124 20.7211 8.90346 20.256 8.90346H18.6262C18.211 8.90346 17.9428 8.4646 18.132 8.09517L21.7925 0.950365C22.0383 0.470724 21.5251 -0.0425023 21.0451 0.203175L13.9005 3.86349C13.531 4.05286 13.0922 3.78447 13.0922 3.36946ZM7.99167 18.4452C5.53886 18.4452 3.55044 16.4567 3.55044 14.004C3.55044 11.5512 5.53872 9.56274 7.99167 9.5626C10.4445 9.5626 12.4329 11.5512 12.4329 14.004C12.4329 16.4568 10.4445 18.4452 7.99167 18.4452Z';
