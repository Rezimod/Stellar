// Renders accurate constellation star charts (real J2000 coordinates, Yale BSC
// values) to public/images/constellations/<id>-chart.jpg via SVG + sharp.
// Run: npx tsx scripts/generate-constellation-charts.ts
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

type StarTint = 'r' | 'b' | 'y' | 'w'
type Star = { id: string; ra: number; dec: number; mag: number; tint: StarTint; label?: string }
type Constellation = {
  id: string
  stars: Star[]
  lines: [string, string][]
  // decorative unlinked star clusters (e.g. Pleiades in Taurus): [ra, dec][]
  cluster?: [number, number][]
}

const TINT: Record<StarTint, string> = {
  r: '#FFB4A2',
  b: '#BFD5FF',
  y: '#FFE0B2',
  w: '#FFFFFF',
}

const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion',
    stars: [
      { id: 'bet', ra: 5.9195, dec: 7.4071, mag: 0.42, tint: 'r', label: 'Betelgeuse' },
      { id: 'rig', ra: 5.2423, dec: -8.2016, mag: 0.13, tint: 'b', label: 'Rigel' },
      { id: 'bel', ra: 5.4188, dec: 6.3497, mag: 1.64, tint: 'b' },
      { id: 'min', ra: 5.5334, dec: -0.2991, mag: 2.23, tint: 'b' },
      { id: 'aln', ra: 5.6036, dec: -1.2019, mag: 1.69, tint: 'b' },
      { id: 'alk', ra: 5.6793, dec: -1.9426, mag: 1.77, tint: 'b' },
      { id: 'sai', ra: 5.7959, dec: -9.6696, mag: 2.06, tint: 'b' },
      { id: 'mei', ra: 5.5856, dec: 9.9342, mag: 3.39, tint: 'b' },
    ],
    lines: [
      ['mei', 'bet'], ['mei', 'bel'], ['bet', 'bel'],
      ['bet', 'alk'], ['bel', 'min'],
      ['min', 'aln'], ['aln', 'alk'],
      ['min', 'rig'], ['alk', 'sai'],
    ],
  },
  {
    id: 'ursa-major',
    stars: [
      { id: 'dub', ra: 11.0622, dec: 61.751, mag: 1.79, tint: 'y', label: 'Dubhe' },
      { id: 'mer', ra: 11.0307, dec: 56.3824, mag: 2.37, tint: 'w' },
      { id: 'phe', ra: 11.8972, dec: 53.6948, mag: 2.44, tint: 'w' },
      { id: 'meg', ra: 12.2571, dec: 57.0326, mag: 3.31, tint: 'w' },
      { id: 'ali', ra: 12.9005, dec: 55.9598, mag: 1.77, tint: 'w', label: 'Alioth' },
      { id: 'miz', ra: 13.3988, dec: 54.9254, mag: 2.27, tint: 'w' },
      { id: 'alk', ra: 13.7923, dec: 49.3133, mag: 1.86, tint: 'b' },
    ],
    lines: [
      ['dub', 'mer'], ['mer', 'phe'], ['phe', 'meg'], ['meg', 'dub'],
      ['meg', 'ali'], ['ali', 'miz'], ['miz', 'alk'],
    ],
  },
  {
    id: 'cassiopeia',
    stars: [
      { id: 'caph', ra: 0.153, dec: 59.1498, mag: 2.27, tint: 'y' },
      { id: 'sched', ra: 0.6751, dec: 56.5373, mag: 2.24, tint: 'y', label: 'Schedar' },
      { id: 'gam', ra: 0.9451, dec: 60.7167, mag: 2.47, tint: 'b' },
      { id: 'ruch', ra: 1.4302, dec: 60.2353, mag: 2.68, tint: 'w' },
      { id: 'seg', ra: 1.9066, dec: 63.6701, mag: 3.38, tint: 'b' },
    ],
    lines: [['caph', 'sched'], ['sched', 'gam'], ['gam', 'ruch'], ['ruch', 'seg']],
  },
  {
    id: 'scorpius',
    stars: [
      { id: 'ant', ra: 16.4901, dec: -26.432, mag: 1.06, tint: 'r', label: 'Antares' },
      { id: 'bet', ra: 16.0906, dec: -19.8054, mag: 2.62, tint: 'b' },
      { id: 'del', ra: 16.0056, dec: -22.6217, mag: 2.32, tint: 'b' },
      { id: 'pi', ra: 15.9809, dec: -26.114, mag: 2.89, tint: 'b' },
      { id: 'sig', ra: 16.3531, dec: -25.5928, mag: 2.88, tint: 'b' },
      { id: 'tau', ra: 16.598, dec: -28.216, mag: 2.82, tint: 'b' },
      { id: 'eps', ra: 16.8361, dec: -34.2932, mag: 2.29, tint: 'y' },
      { id: 'mu', ra: 16.8643, dec: -38.0474, mag: 3.04, tint: 'b' },
      { id: 'zet', ra: 16.9097, dec: -42.3614, mag: 3.62, tint: 'y' },
      { id: 'eta', ra: 17.2026, dec: -43.2392, mag: 3.33, tint: 'y' },
      { id: 'the', ra: 17.6219, dec: -42.9978, mag: 1.87, tint: 'y' },
      { id: 'iot', ra: 17.7931, dec: -40.127, mag: 3.03, tint: 'w' },
      { id: 'kap', ra: 17.7081, dec: -39.03, mag: 2.41, tint: 'b' },
      { id: 'ups', ra: 17.5188, dec: -37.2958, mag: 2.69, tint: 'b' },
      { id: 'lam', ra: 17.5601, dec: -37.1038, mag: 1.63, tint: 'b' },
    ],
    lines: [
      ['bet', 'del'], ['del', 'pi'], ['del', 'sig'], ['sig', 'ant'],
      ['ant', 'tau'], ['tau', 'eps'], ['eps', 'mu'], ['mu', 'zet'],
      ['zet', 'eta'], ['eta', 'the'], ['the', 'iot'], ['iot', 'kap'],
      ['kap', 'lam'], ['lam', 'ups'],
    ],
  },
  {
    id: 'cygnus',
    stars: [
      { id: 'den', ra: 20.6905, dec: 45.2803, mag: 1.25, tint: 'w', label: 'Deneb' },
      { id: 'sad', ra: 20.3705, dec: 40.2567, mag: 2.23, tint: 'y' },
      { id: 'gie', ra: 20.7702, dec: 33.9703, mag: 2.48, tint: 'y' },
      { id: 'del', ra: 19.7495, dec: 45.1308, mag: 2.87, tint: 'b' },
      { id: 'alb', ra: 19.512, dec: 27.9597, mag: 3.05, tint: 'y', label: 'Albireo' },
      { id: 'iot', ra: 19.495, dec: 51.729, mag: 3.76, tint: 'w' },
      { id: 'zet', ra: 21.2156, dec: 30.2269, mag: 3.21, tint: 'y' },
      { id: 'kap', ra: 19.2852, dec: 53.3684, mag: 3.8, tint: 'y' },
    ],
    lines: [
      ['den', 'sad'], ['sad', 'alb'],
      ['del', 'sad'], ['sad', 'gie'],
      ['del', 'iot'], ['iot', 'kap'], ['gie', 'zet'],
    ],
  },
  {
    id: 'leo',
    stars: [
      { id: 'reg', ra: 10.1395, dec: 11.9672, mag: 1.36, tint: 'b', label: 'Regulus' },
      { id: 'eta', ra: 10.1216, dec: 16.7627, mag: 3.51, tint: 'w' },
      { id: 'alg', ra: 10.3329, dec: 19.8415, mag: 2.61, tint: 'y' },
      { id: 'zet', ra: 10.2782, dec: 23.4173, mag: 3.43, tint: 'y' },
      { id: 'mu', ra: 9.8794, dec: 26.007, mag: 3.88, tint: 'y' },
      { id: 'eps', ra: 9.7641, dec: 23.7743, mag: 2.97, tint: 'y' },
      { id: 'the', ra: 11.2373, dec: 15.4296, mag: 3.33, tint: 'b' },
      { id: 'den', ra: 11.8177, dec: 14.572, mag: 2.14, tint: 'w', label: 'Denebola' },
      { id: 'zos', ra: 11.2351, dec: 20.5237, mag: 2.56, tint: 'w' },
    ],
    lines: [
      ['eps', 'mu'], ['mu', 'zet'], ['zet', 'alg'], ['alg', 'eta'], ['eta', 'reg'],
      ['reg', 'the'], ['the', 'den'], ['den', 'zos'], ['zos', 'alg'],
    ],
  },
  {
    id: 'taurus',
    stars: [
      { id: 'ald', ra: 4.5987, dec: 16.5093, mag: 0.85, tint: 'r', label: 'Aldebaran' },
      { id: 'eln', ra: 5.4382, dec: 28.6075, mag: 1.68, tint: 'b', label: 'Elnath' },
      { id: 'zet', ra: 5.6274, dec: 21.1425, mag: 3.0, tint: 'b' },
      { id: 'the', ra: 4.4777, dec: 15.8709, mag: 3.4, tint: 'w' },
      { id: 'gam', ra: 4.3299, dec: 15.6276, mag: 3.65, tint: 'y' },
      { id: 'del', ra: 4.3826, dec: 17.5425, mag: 3.77, tint: 'y' },
      { id: 'eps', ra: 4.4762, dec: 19.1804, mag: 3.53, tint: 'y' },
      { id: 'lam', ra: 4.0113, dec: 12.4903, mag: 3.47, tint: 'b' },
      { id: 'xi', ra: 3.4519, dec: 9.7328, mag: 3.73, tint: 'b' },
    ],
    lines: [
      ['zet', 'ald'], ['ald', 'the'], ['the', 'gam'],
      ['gam', 'del'], ['del', 'eps'], ['eps', 'eln'],
      ['gam', 'lam'], ['lam', 'xi'],
    ],
    // Pleiades (M45) — real member positions, drawn as a small unlinked cluster
    cluster: [
      [3.7914, 24.1051], [3.7479, 24.1133], [3.7639, 24.3678], [3.7724, 23.9484],
      [3.8197, 24.0534], [3.7536, 24.5452], [3.7365, 24.2867],
    ],
  },
  {
    id: 'lyra',
    stars: [
      { id: 'veg', ra: 18.6156, dec: 38.7837, mag: 0.03, tint: 'b', label: 'Vega' },
      { id: 'eps', ra: 18.739, dec: 39.613, mag: 3.9, tint: 'w' },
      { id: 'zet', ra: 18.7462, dec: 37.6051, mag: 4.36, tint: 'w' },
      { id: 'del', ra: 18.9084, dec: 36.8986, mag: 4.3, tint: 'r' },
      { id: 'gam', ra: 18.9824, dec: 32.6896, mag: 3.24, tint: 'b' },
      { id: 'bet', ra: 18.8347, dec: 33.3627, mag: 3.52, tint: 'w' },
    ],
    lines: [
      ['veg', 'eps'], ['veg', 'zet'],
      ['zet', 'del'], ['del', 'gam'], ['gam', 'bet'], ['bet', 'zet'],
    ],
  },
  {
    id: 'gemini',
    stars: [
      { id: 'cas', ra: 7.5766, dec: 31.8883, mag: 1.58, tint: 'w', label: 'Castor' },
      { id: 'pol', ra: 7.7553, dec: 28.0262, mag: 1.14, tint: 'y', label: 'Pollux' },
      { id: 'alh', ra: 6.6285, dec: 16.3993, mag: 1.93, tint: 'w' },
      { id: 'mu', ra: 6.3827, dec: 22.5136, mag: 2.87, tint: 'r' },
      { id: 'eps', ra: 6.7322, dec: 25.1311, mag: 3.06, tint: 'y' },
      { id: 'eta', ra: 6.2479, dec: 22.5068, mag: 3.31, tint: 'r' },
      { id: 'xi', ra: 6.7546, dec: 12.8956, mag: 3.35, tint: 'w' },
      { id: 'del', ra: 7.3354, dec: 21.9821, mag: 3.53, tint: 'w' },
      { id: 'lam', ra: 7.3013, dec: 16.5403, mag: 3.58, tint: 'w' },
      { id: 'the', ra: 6.8793, dec: 33.9614, mag: 3.6, tint: 'w' },
      { id: 'tau', ra: 7.1857, dec: 30.2452, mag: 4.41, tint: 'y' },
      { id: 'kap', ra: 7.7404, dec: 24.398, mag: 3.57, tint: 'y' },
      { id: 'iot', ra: 7.4288, dec: 27.7981, mag: 3.79, tint: 'y' },
      { id: 'ups', ra: 7.5987, dec: 26.8957, mag: 4.06, tint: 'r' },
      { id: 'zet', ra: 7.0685, dec: 20.5703, mag: 3.93, tint: 'y' },
      { id: 'nu', ra: 6.4827, dec: 20.2121, mag: 4.15, tint: 'b' },
    ],
    lines: [
      ['cas', 'tau'], ['tau', 'the'], ['tau', 'eps'], ['eps', 'nu'],
      ['eps', 'mu'], ['mu', 'eta'],
      ['pol', 'ups'], ['ups', 'iot'], ['iot', 'tau'], ['ups', 'kap'],
      ['ups', 'del'], ['del', 'zet'], ['zet', 'alh'], ['del', 'lam'], ['lam', 'xi'],
    ],
  },
]

const W = 900
const H = 600
const PAD = 90

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashCode(s: string) {
  let h = 0
  for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0
  return h
}

function starRadius(mag: number) {
  return Math.min(9, Math.max(2.4, 8.5 - 1.7 * mag))
}

function render(c: Constellation): string {
  // Project: RA increases to the LEFT (as seen looking at the sky), Dec up.
  const decMid = (Math.min(...c.stars.map(s => s.dec)) + Math.max(...c.stars.map(s => s.dec))) / 2
  const cosD = Math.cos((decMid * Math.PI) / 180)
  const pts = c.stars.map(s => ({ ...s, px: -s.ra * 15 * cosD, py: s.dec }))
  const clusterPts = (c.cluster ?? []).map(([ra, dec]) => ({ px: -ra * 15 * cosD, py: dec }))
  const all = [...pts, ...clusterPts]

  const minX = Math.min(...all.map(p => p.px)), maxX = Math.max(...all.map(p => p.px))
  const minY = Math.min(...all.map(p => p.py)), maxY = Math.max(...all.map(p => p.py))
  const scale = Math.min((W - 2 * PAD) / (maxX - minX || 1), (H - 2 * PAD) / (maxY - minY || 1))
  const ox = (W - (maxX - minX) * scale) / 2
  const oy = (H - (maxY - minY) * scale) / 2
  const X = (px: number) => ox + (px - minX) * scale
  const Y = (py: number) => H - (oy + (py - minY) * scale)

  const byId = new Map(pts.map(p => [p.id, p]))
  const rand = mulberry32(hashCode(c.id))

  // Faint background field stars
  let field = ''
  for (let i = 0; i < 150; i++) {
    const x = rand() * W, y = rand() * H
    const r = 0.4 + rand() * 0.9
    const o = 0.12 + rand() * 0.45
    field += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#FFFFFF" opacity="${o.toFixed(2)}"/>`
  }

  let lines = ''
  for (const [a, b] of c.lines) {
    const p1 = byId.get(a)!, p2 = byId.get(b)!
    lines += `<line x1="${X(p1.px).toFixed(1)}" y1="${Y(p1.py).toFixed(1)}" x2="${X(p2.px).toFixed(1)}" y2="${Y(p2.py).toFixed(1)}" stroke="rgba(148,178,255,0.34)" stroke-width="1.6"/>`
  }

  let cluster = ''
  for (const p of clusterPts) {
    cluster += `<circle cx="${X(p.px).toFixed(1)}" cy="${Y(p.py).toFixed(1)}" r="1.7" fill="#BFD5FF" opacity="0.9"/>`
  }

  let stars = ''
  let labels = ''
  for (const p of pts) {
    const r = starRadius(p.mag)
    const x = X(p.px), y = Y(p.py)
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 3).toFixed(1)}" fill="url(#glow-${p.tint})"/>`
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${TINT[p.tint]}"/>`
    if (p.label) {
      // Place right of the star; flip to the left side near the right edge.
      const wEst = p.label.length * 9.5
      const flip = x + r + 9 + wEst > W - 24
      const tx = flip ? x - r - 9 - wEst : x + r + 9
      const ty = Math.min(Math.max(y + 5, 28), H - 20)
      labels += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-family="Menlo, monospace" font-size="14" fill="rgba(255,255,255,0.55)" letter-spacing="1">${p.label}</text>`
    }
  }

  const glows = (Object.keys(TINT) as StarTint[]).map(t =>
    `<radialGradient id="glow-${t}"><stop offset="0%" stop-color="${TINT[t]}" stop-opacity="0.5"/><stop offset="60%" stop-color="${TINT[t]}" stop-opacity="0.12"/><stop offset="100%" stop-color="${TINT[t]}" stop-opacity="0"/></radialGradient>`
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="80%">
    <stop offset="0%" stop-color="#122142"/>
    <stop offset="55%" stop-color="#0C1731"/>
    <stop offset="100%" stop-color="#070F22"/>
  </radialGradient>
  ${glows}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${field}${lines}${cluster}${stars}${labels}
</svg>`
}

async function main() {
  const outDir = join(process.cwd(), 'public', 'images', 'constellations')
  mkdirSync(outDir, { recursive: true })
  for (const c of CONSTELLATIONS) {
    const svg = render(c)
    const out = join(outDir, `${c.id}-chart.jpg`)
    await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(out)
    console.log('wrote', out)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
