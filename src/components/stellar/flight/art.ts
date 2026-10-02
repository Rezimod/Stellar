/**
 * The vehicles of a flight, drawn as SVG strings the flight engine sets into
 * its stage: the launcher, the capsule that is opened in orbit, and its
 * hatch. Strings rather than components because the engine moves their parts
 * every frame by attribute, outside React.
 *
 * Text takes the app's own faces through the CSS variables, since next/font
 * hashes the family names.
 */

import { LOGO_D } from '../card/frame';

const DISPLAY = 'font-family:var(--sd-display)';
const MONO = 'font-family:var(--sd-mono)';

const CAPSULE_BODY = 'M36 10 C44 7 56 7 64 10 C72 30 84 56 91 76 C64 83 36 83 9 76 C16 56 28 30 36 10 Z';

/** The return capsule in a 100 by 100 box. `payload` is the copy seated in the fairing. */
export function capsuleArt(u: string, payload: boolean): string {
  return `<defs>
    <clipPath id="cc${u}"><path d="${CAPSULE_BODY}"/></clipPath>
    <linearGradient id="cs${u}" gradientUnits="userSpaceOnUse" x1="9" x2="91" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".18" stop-color="#000" stop-opacity=".15"/><stop offset=".36" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></linearGradient>
    <linearGradient id="ch${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a2618" stop-opacity="0"/><stop offset=".45" stop-color="#3a2618" stop-opacity=".25"/><stop offset=".85" stop-color="#1c120b" stop-opacity=".8"/><stop offset="1" stop-color="#120a06" stop-opacity=".95"/></linearGradient>
    <radialGradient id="hh${u}" cx=".5" cy=".9" r=".7"><stop offset="0" stop-color="#fff2d0"/><stop offset=".3" stop-color="#ffb46a" stop-opacity=".9"/><stop offset=".7" stop-color="#ff5a2e" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a2e" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="${CAPSULE_BODY}" fill="#e7eaef"/>
  <g clip-path="url(#cc${u})">
    <rect x="0" y="21" width="100" height="4.6" fill="#e0612e"/><rect x="0" y="26.4" width="100" height="1" fill="#f4b113"/>
    <path d="M0 60 Q50 66 100 60" stroke="#c8ccd3" stroke-width=".5" fill="none"/>
  </g>
  <rect x="25" y="33" width="6" height="7" rx="1.6" fill="#0b0f18"/><rect x="69" y="33" width="6" height="7" rx="1.6" fill="#0b0f18"/>
  <rect x="26" y="34" width="2" height="2" rx=".8" fill="#5f6b80"/><rect x="70" y="34" width="2" height="2" rx=".8" fill="#5f6b80"/>
  <g transform="translate(18 55) scale(.36)"><path d="${LOGO_D}" fill="#e0612e"/></g>
  <text x="50" y="69" text-anchor="middle" style="${DISPLAY}" font-weight="700" font-size="4.6" letter-spacing="1.6" fill="#e0612e">STELLAR</text>
  ${payload ? '<circle cx="50" cy="47" r="12.5" fill="#c3c9d1" stroke="#7d8591" stroke-width="1"/><circle cx="50" cy="47" r="3" fill="#e0612e"/>' : ''}
  <path d="M38 10 C44 5.5 56 5.5 62 10 Z" fill="#1d222c"/><rect x="42" y="3.2" width="16" height="3.4" rx="1" fill="#2a303b"/>
  <path d="${CAPSULE_BODY}" fill="url(#cs${u})"/>
  <path d="M9 76 C36 83 64 83 91 76 C82 88 18 88 9 76 Z" fill="#241a13"/>
  <path d="M12 78 C38 84 62 84 88 78" stroke="#4a3a2c" stroke-width=".7" fill="none"/>
  ${payload ? '' : `<path data-part="char" d="${CAPSULE_BODY}" fill="url(#ch${u})" opacity="0"/><ellipse data-part="heat" cx="50" cy="80" rx="46" ry="16" fill="url(#hh${u})" opacity="0"/>`}`;
}

/** The launcher in a 100 by 1200 frame: upper stage, booster, the seated capsule and both fairing halves. */
export function rocketArt(u: string): string {
  const shade = (id: string, a: number, b: number) =>
    `<linearGradient id="${id}${u}" gradientUnits="userSpaceOnUse" x1="${a}" x2="${b}" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".13" stop-color="#000" stop-opacity=".22"/><stop offset=".33" stop-color="#fff" stop-opacity=".42"/><stop offset=".47" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".66"/></linearGradient>`;
  const ogive = 'M50 0 C30 20 15 92 15 182 L15 250 L85 250 L85 182 C85 92 70 20 50 0 Z';
  const fairing = `<path d="${ogive}" fill="#eff2f6"/>
    <rect x="15" y="238" width="70" height="4" fill="#f4b113"/>
    <g transform="translate(35 150) scale(1.36)"><path d="${LOGO_D}" fill="#e0612e"/></g>
    <text x="50" y="214" text-anchor="middle" style="${DISPLAY}" font-weight="700" font-size="7.4" letter-spacing="3" fill="#e0612e">STELLAR</text>
    <path d="${ogive}" fill="url(#fs${u})"/>
    <path data-part="rim" d="M66 30 C80 80 85 140 85 182 L85 250 L79 250 L79 182 C79 140 76 80 66 30 Z" fill="url(#rimF${u})"/>`;
  return `<svg viewBox="0 0 100 1200" aria-hidden="true"><defs>
    ${shade('rs', 20, 80)}${shade('fs', 15, 85)}
    <linearGradient id="rim${u}" gradientUnits="userSpaceOnUse" x1="62" x2="80" y1="0" y2="0"><stop offset="0" stop-color="#ffb070" stop-opacity="0"/><stop offset="1" stop-color="#ffb070" stop-opacity=".6"/></linearGradient>
    <linearGradient id="rimF${u}" gradientUnits="userSpaceOnUse" x1="70" x2="85" y1="0" y2="0"><stop offset="0" stop-color="#ffb070" stop-opacity="0"/><stop offset="1" stop-color="#ffb070" stop-opacity=".6"/></linearGradient>
    <linearGradient id="brz${u}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#241b15"/><stop offset=".4" stop-color="#8a735c"/><stop offset=".62" stop-color="#5a4838"/><stop offset="1" stop-color="#1c1510"/></linearGradient>
    <linearGradient id="soot${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#18120d" stop-opacity="0"/><stop offset="1" stop-color="#18120d" stop-opacity=".7"/></linearGradient>
    <linearGradient id="frost${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f4f8ff" stop-opacity="0"/><stop offset=".25" stop-color="#f4f8ff" stop-opacity=".75"/><stop offset=".75" stop-color="#e6eef9" stop-opacity=".75"/><stop offset="1" stop-color="#f4f8ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="burn${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff9a4a" stop-opacity="0"/><stop offset="1" stop-color="#ffb060" stop-opacity=".85"/></linearGradient>
    <clipPath id="cL${u}"><rect x="-200" y="-10" width="250" height="270"/></clipPath>
    <clipPath id="cR${u}"><rect x="50" y="-10" width="250" height="270"/></clipPath>
  </defs>
  <g data-part="upper">
    <path d="M42 420 L58 420 C60 452 66 480 71 498 L29 498 C34 480 40 452 42 420 Z" fill="url(#brz${u})"/>
    <rect x="20" y="262" width="60" height="158" fill="#eef1f5"/>
    <rect x="20" y="384" width="60" height="9" fill="#e0612e"/><rect x="20" y="394.5" width="60" height="1.4" fill="#f4b113"/>
    <text x="50" y="300" text-anchor="middle" style="${MONO}" font-size="6" letter-spacing="1.6" fill="#e0612e">FIRST LIGHT</text>
    <rect x="20" y="262" width="60" height="158" fill="url(#rs${u})"/>
    <rect data-part="rim" x="62" y="262" width="18" height="158" fill="url(#rim${u})"/>
    <rect x="17" y="249" width="66" height="14" fill="#141820"/><rect x="17" y="249" width="66" height="14" fill="url(#fs${u})"/>
  </g>
  <g data-part="boost">
    <rect x="20" y="420" width="60" height="82" fill="#0e1118"/>
    <rect x="10" y="428" width="10" height="13" fill="#1b2029"/><rect x="80" y="428" width="10" height="13" fill="#1b2029"/>
    <rect x="44" y="430" width="12" height="10" fill="#262c37"/>
    <rect x="20" y="420" width="60" height="82" fill="url(#rs${u})"/>
    <rect x="20" y="500" width="60" height="630" fill="#eef1f5"/>
    <rect x="20" y="520" width="60" height="10" fill="#e0612e"/><rect x="20" y="532" width="60" height="1.6" fill="#f4b113"/>
    <g transform="translate(39 556)"><path d="${LOGO_D}" fill="#e0612e"/></g>
    <text transform="translate(57.5 800) rotate(-90)" text-anchor="middle" style="${DISPLAY}" font-weight="700" font-size="21" letter-spacing="9" fill="#e0612e">STELLAR</text>
    <g stroke="#000" stroke-opacity=".12" stroke-width=".6"><path d="M20 640H80M20 760H80M20 880H80M20 960H80"/></g>
    <rect x="66" y="540" width="3" height="560" fill="#000" opacity=".14"/>
    <g data-part="frost"><rect x="20" y="560" width="60" height="70" fill="url(#frost${u})"/><rect x="20" y="700" width="60" height="150" fill="url(#frost${u})" opacity=".8"/></g>
    <rect x="20" y="1000" width="60" height="2.6" fill="#f4b113"/>
    <rect x="20" y="930" width="60" height="200" fill="url(#soot${u})"/>
    <path d="M20 1012 H27 V1128 H20 Z M73 1012 H80 V1128 H73 Z" fill="#151921"/>
    <rect x="20" y="500" width="60" height="630" fill="url(#rs${u})"/>
    <rect data-part="rim" x="62" y="420" width="18" height="710" fill="url(#rim${u})"/>
    <rect data-part="burn" x="20" y="880" width="60" height="250" fill="url(#burn${u})" opacity="0"/>
    <rect x="22" y="1128" width="56" height="18" fill="#10131a"/>
    <path d="M24 1146 H36 L38.5 1188 H21.5 Z M64 1146 H76 L78.5 1188 H61.5 Z" fill="url(#brz${u})" opacity=".85"/>
    <path d="M41 1146 H59 L63.5 1197 H36.5 Z" fill="url(#brz${u})"/>
  </g>
  <g data-part="payload"><g transform="translate(22 188) scale(.56)">${capsuleArt(`${u}p`, true)}</g></g>
  <g data-part="fairL"><g clip-path="url(#cL${u})">${fairing}</g></g>
  <g data-part="fairR"><g clip-path="url(#cR${u})">${fairing}</g></g>
  </svg>`;
}

/** The side hatch, seen face on: a dished door, its ring of bolts and the locking bar. */
export function doorArt(u: string): string {
  let bolts = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    bolts += `<circle cx="${(Math.cos(a) * 42).toFixed(1)}" cy="${(Math.sin(a) * 42).toFixed(1)}" r="2.2"/>`;
  }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true">
    <defs><radialGradient id="dm${u}" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#e3e7ed"/><stop offset=".55" stop-color="#a9b0ba"/><stop offset="1" stop-color="#5b626d"/></radialGradient></defs>
    <circle r="49" fill="url(#dm${u})" stroke="#3a404b" stroke-width="2"/>
    <circle r="35" fill="none" stroke="#7d8591" stroke-width="1.4"/>
    <g fill="#59606b">${bolts}</g>
    <rect x="-22" y="-4" width="44" height="8" rx="4" fill="#2b313b"/>
    <circle r="7" fill="#e0612e" stroke="#d6dbe2" stroke-width="2"/>
  </svg>`;
}
