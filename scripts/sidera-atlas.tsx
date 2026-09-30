// Draws the engraved star atlas behind every Sidera page: the northern sky in
// an equidistant polar projection, graticule, ecliptic, the bright stars and
// their stick figures, gold on nothing. Writes public/sidera/atlas.svg.
//   npx tsx scripts/sidera-atlas.tsx
import fs from 'node:fs';
import { BRIGHT_STARS, CONSTELLATION_GROUPS } from '@/lib/sky/stars';

const SIZE = 2000;
const C = SIZE / 2;
const R = 930; // dec -35 lands here
const LOW = -35;
const GOLD = '#d9b46a';
const OBL = 23.439 * (Math.PI / 180);

const rOf = (dec: number) => ((90 - dec) / (90 - LOW)) * R;
const at = (ra: number, dec: number) => {
  const a = ((ra * 15 - 90) * Math.PI) / 180;
  const r = rOf(dec);
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const f = (n: number) => n.toFixed(1);
const circle = (dec: number) => rOf(dec).toFixed(1);

let out: string[] = [];
const push = (s: string) => out.push(s);

push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" font-family="Georgia, 'Times New Roman', serif">`);
push(`<defs>
  <radialGradient id="halo"><stop offset="0" stop-color="${GOLD}" stop-opacity=".55"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  <path id="eq" d="M ${C - rOf(0)} ${C} a ${circle(0)} ${circle(0)} 0 1 1 ${2 * rOf(0)} 0 a ${circle(0)} ${circle(0)} 0 1 1 -${2 * rOf(0)} 0"/>
  <path id="rim" d="M ${C - (R + 36)} ${C} a ${R + 36} ${R + 36} 0 1 1 ${2 * (R + 36)} 0 a ${R + 36} ${R + 36} 0 1 1 -${2 * (R + 36)} 0"/>
</defs>`);

// Graticule: declination circles, then hour spokes.
push(`<g fill="none" stroke="${GOLD}" stroke-opacity=".34" stroke-width="1">`);
for (const dec of [75, 60, 45, 30, 15, -15, -30]) push(`<circle cx="${C}" cy="${C}" r="${circle(dec)}" stroke-dasharray="${dec % 30 === 0 ? '' : '3 6'}"/>`);
push(`</g>`);
push(`<circle cx="${C}" cy="${C}" r="${circle(0)}" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="1.6"/>`);
push(`<g stroke="${GOLD}" stroke-width="1">`);
for (let h = 0; h < 24; h++) {
  const [x1, y1] = at(h, 84);
  const [x2, y2] = at(h, LOW);
  push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-opacity="${h % 6 === 0 ? '.5' : '.22'}"/>`);
}
push(`</g>`);

// The rim: two circles, a tick every 20 minutes of right ascension, the hour in small capitals.
push(`<g fill="none" stroke="${GOLD}">`);
push(`<circle cx="${C}" cy="${C}" r="${R + 6}" stroke-opacity=".8" stroke-width="2.2"/>`);
push(`<circle cx="${C}" cy="${C}" r="${R + 62}" stroke-opacity=".5" stroke-width="1"/>`);
push(`<circle cx="${C}" cy="${C}" r="${R + 70}" stroke-opacity=".8" stroke-width="3"/>`);
for (let m = 0; m < 24 * 3; m++) {
  const ra = m / 3;
  const a = ((ra * 15 - 90) * Math.PI) / 180;
  const len = m % 3 === 0 ? 26 : 12;
  push(`<line x1="${f(C + (R + 6) * Math.cos(a))}" y1="${f(C + (R + 6) * Math.sin(a))}" x2="${f(C + (R + 6 + len) * Math.cos(a))}" y2="${f(C + (R + 6 + len) * Math.sin(a))}" stroke-opacity=".7" stroke-width="${m % 3 === 0 ? 2 : 1}"/>`);
}
push(`</g>`);
push(`<g fill="${GOLD}" fill-opacity=".8" font-size="22" text-anchor="middle" letter-spacing="2">`);
for (let h = 0; h < 24; h++) {
  const a = ((h * 15 - 90) * Math.PI) / 180;
  const x = C + (R + 46) * Math.cos(a);
  const y = C + (R + 46) * Math.sin(a);
  push(`<text x="${f(x)}" y="${f(y)}" transform="rotate(${h * 15} ${f(x)} ${f(y)})" dominant-baseline="middle">${h === 0 ? 'XXIV' : roman(h)}</text>`);
}
push(`</g>`);

// Ecliptic
{
  const pts: string[] = [];
  for (let lon = 0; lon <= 360; lon += 2) {
    const l = (lon * Math.PI) / 180;
    const dec = Math.asin(Math.sin(OBL) * Math.sin(l));
    const ra = Math.atan2(Math.cos(OBL) * Math.sin(l), Math.cos(l));
    const raH = (((ra * 180) / Math.PI + 360) % 360) / 15;
    const [x, y] = at(raH, (dec * 180) / Math.PI);
    pts.push(`${pts.length ? 'L' : 'M'}${f(x)} ${f(y)}`);
  }
  push(`<path id="ecl" d="${pts.join('')}" fill="none" stroke="${GOLD}" stroke-opacity=".7" stroke-width="1.4" stroke-dasharray="10 5 2 5"/>`);
}

// Labels on the circles
push(`<g fill="${GOLD}" fill-opacity=".75" font-size="26" font-style="italic" letter-spacing="6">`);
push(`<text><textPath href="#eq" startOffset="6%">AEQUATOR CAELESTIS</textPath></text>`);
push(`<text><textPath href="#eq" startOffset="56%">AEQUATOR CAELESTIS</textPath></text>`);
push(`<text font-size="24"><textPath href="#ecl" startOffset="30%">ECLIPTICA</textPath></text>`);
push(`</g>`);
push(`<g fill="${GOLD}" fill-opacity=".85" font-size="30" text-anchor="middle" letter-spacing="10">`);
push(`<text><textPath href="#rim" startOffset="25%">HEMISPHAERIUM BOREALE · SIDERA · NODUS I · TBILISI</textPath></text>`);
push(`<text><textPath href="#rim" startOffset="75%">PRIMA LUX · MMXXVI · CENTUM TABULAE · SIGILLATAE ANTE VENDITIONEM</textPath></text>`);
push(`</g>`);

// Stick figures
const byId = new Map(BRIGHT_STARS.map((s) => [s.id, s]));
push(`<g stroke="${GOLD}" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round">`);
for (const lines of Object.values(CONSTELLATION_GROUPS)) {
  for (const [a, b] of lines) {
    const s = byId.get(a), t = byId.get(b);
    if (!s || !t || s.dec < LOW || t.dec < LOW) continue;
    const [x1, y1] = at(s.ra, s.dec);
    const [x2, y2] = at(t.ra, t.dec);
    push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`);
  }
}
push(`</g>`);

// Stars: halo for the brightest, a four-point engraved star for the bright, a dot for the rest.
push(`<g fill="${GOLD}">`);
for (const s of BRIGHT_STARS) {
  if (s.dec < LOW) continue;
  const [x, y] = at(s.ra, s.dec);
  const size = Math.max(2.2, 9.5 - 2.1 * s.mag);
  if (s.mag < 1.2) push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(size * 4)}" fill="url(#halo)"/>`);
  if (s.mag < 2.2) {
    const o = size, i = size * 0.28;
    push(`<path d="M${f(x)} ${f(y - o)} L${f(x + i)} ${f(y - i)} L${f(x + o)} ${f(y)} L${f(x + i)} ${f(y + i)} L${f(x)} ${f(y + o)} L${f(x - i)} ${f(y + i)} L${f(x - o)} ${f(y)} L${f(x - i)} ${f(y - i)} Z" fill-opacity=".95"/>`);
    push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(size * 0.55)}" fill-opacity="1"/>`);
  } else push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(size * 0.6)}" fill-opacity=".9"/>`);
}
push(`</g>`);

// Names for the brightest
push(`<g fill="${GOLD}" fill-opacity=".8" font-size="21" font-style="italic" letter-spacing="1.5">`);
for (const s of BRIGHT_STARS.filter((s) => s.mag < 1.6 && s.dec >= LOW)) {
  const [x, y] = at(s.ra, s.dec);
  push(`<text x="${f(x + 14)}" y="${f(y - 10)}">${s.name}</text>`);
}
push(`</g>`);

// The pole
push(`<g fill="none" stroke="${GOLD}" stroke-opacity=".8"><circle cx="${C}" cy="${C}" r="10" stroke-width="1.4"/><circle cx="${C}" cy="${C}" r="3" fill="${GOLD}"/></g>`);
push(`<text x="${C}" y="${C + 40}" fill="${GOLD}" fill-opacity=".8" font-size="20" font-style="italic" text-anchor="middle" letter-spacing="4">Polus Arcticus</text>`);
push(`</svg>`);

function roman(n: number) {
  const t: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
}

fs.writeFileSync('public/sidera/atlas.svg', out.join('\n'));
console.log('public/sidera/atlas.svg', (fs.statSync('public/sidera/atlas.svg').size / 1024).toFixed(1), 'KB');
