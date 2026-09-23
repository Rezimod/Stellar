/**
 * The four survey plates drawn so far: the Moon, Andromeda, Saturn and M87.
 *
 * Each is drawn from the object's real structure, not a stand-in shape: the
 * ring radii are Saturn's own in km, the craters and maria sit where they are
 * on the near side, M31's disk is tilted 77°, M87's shadow is the EHT's. Each
 * returns three layers the card stacks for parallax: sky, object and survey
 * (callouts, reticle, scale bar).
 */
import { blob, callout, grain, heading, layer, n, rad, reticle, rng, scalebar, spikeDefs, starfield, LABEL_STYLE } from './draw';

export type PlateLayers = { sky: string; object: string; survey: string; /** Art runs to the card's edge. */ full: boolean };

const W = 582;
const H = 620;
const HF = 832;

// ------------------------------------------------------------------ Saturn
function saturn(u: string): PlateLayers {
  const cx = 291, cy = 300, rot = -16, sc = 0.8;
  const B = rad(24), sB = Math.sin(B), cB = Math.cos(B);
  const a = 120, b = 108;
  const ly = Math.sqrt(b * b * cB * cB + a * a * sB * sB);
  const K = 0.001991; // px per km at the globe's scale
  const r = rng(6);

  const scr = (x: number, y: number): [number, number] => {
    const t = rad(rot);
    x *= sc; y *= sc;
    return [cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)];
  };
  const ringPt = (rpx: number, deg: number) => scr(rpx * Math.cos(rad(deg)), rpx * sB * Math.sin(rad(deg)));

  const sky = layer(
    W, H,
    `<rect width="${W}" height="${H}" fill="url(#${u}hz)"/><rect width="${W}" height="${H}" fill="url(#${u}hz2)"/>` + starfield(W, H, 260, 11, 6, u),
    spikeDefs(u) +
      `<radialGradient id="${u}hz" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#26243d"/><stop offset=".5" stop-color="#0f0e1e"/><stop offset="1" stop-color="#04050d"/></radialGradient>` +
      `<radialGradient id="${u}hz2" cx=".2" cy=".85" r=".5"><stop offset="0" stop-color="#2b3a6a" stop-opacity=".35"/><stop offset="1" stop-color="#2b3a6a" stop-opacity="0"/></radialGradient>`,
  );

  // The ring system, 230 km at a time, from the D ring to the F ring.
  const profile = (km: number): [number, string] => {
    const v = r.uniform(-1, 1);
    if (km >= 66900 && km < 74510) return [0.05, '#8d8578'];
    if (km >= 74658 && km < 92000) return [0.16 + 0.06 * v, '#a1978a'];
    if (km >= 92000 && km < 117580) {
      const t = (km - 92000) / 25580;
      return [Math.min(0.95, 0.52 + 0.38 * t + 0.12 * v), r.pick(['#eee3c8', '#e6d8b8', '#f3e8cf', '#dccca9'])];
    }
    if (km >= 117580 && km < 122170) return [Math.abs(km - 120050) < 300 ? 0.2 : 0.03, '#8f8778'];
    if (km >= 122170 && km < 136775) {
      if ((km >= 133424 && km < 133749) || (km >= 136485 && km < 136527)) return [0, '#000'];
      return [0.5 + 0.1 * v, r.pick(['#d9ccb0', '#d2c4a6', '#e0d4b9'])];
    }
    if (km >= 139900 && km < 140450) return [0.55, '#efe6d0'];
    return [0, '#000'];
  };
  let back = '', front = '';
  for (let km = 66900; km < 140500; km += 230) {
    const [op, col] = profile(km);
    if (op <= 0.01) continue;
    const rp = km * K, ry = rp * sB;
    back += `<path d="M${n(-rp)} 0A${n(rp)} ${n(ry)} 0 0 1 ${n(rp)} 0" stroke="${col}" stroke-opacity="${n(op * 0.92)}"/>`;
    front += `<path d="M${n(-rp)} 0A${n(rp)} ${n(ry)} 0 0 0 ${n(rp)} 0" stroke="${col}" stroke-opacity="${n(op)}"/>`;
  }
  const rings = (s: string) => `<g fill="none" stroke-width=".62">${s}</g>`;

  // The globe, band by band, each band everything north of a latitude circle.
  const lat = (phi: number) => {
    const p = rad(phi);
    return [-b * Math.sin(p) * cB, a * Math.cos(p), a * Math.cos(p) * sB] as const;
  };
  const bands: [number, string][] = [
    [-40, '#d3b782'], [-20, '#dcc290'], [-8, '#ecd9ab'], [4, '#f3e3ba'], [10, '#e2c792'], [16, '#caa56f'], [21, '#dcc08c'],
    [27, '#e6d0a0'], [34, '#cfb07c'], [41, '#dcc497'], [48, '#c9ae80'], [55, '#bca887'], [61, '#aaa28e'], [68, '#9aa0a0'], [74, '#8b95a1'],
  ];
  let g = `<ellipse rx="${n(a)}" ry="${n(ly)}" fill="#c7a874"/>`;
  for (const [phi, col] of bands) {
    const [yc, rx, ry] = lat(phi);
    g += phi >= 66
      ? `<ellipse cy="${n(yc)}" rx="${n(rx)}" ry="${n(ry)}" fill="${col}"/>`
      : `<path d="M${n(-rx)} ${n(yc)}A${n(rx)} ${n(ry)} 0 0 0 ${n(rx)} ${n(yc)}L${n(a + 10)} ${n(yc)}L${n(a + 10)} ${n(-ly - 10)}L${n(-a - 10)} ${n(-ly - 10)}L${n(-a - 10)} ${n(yc)}Z" fill="${col}"/>`;
  }
  let i = 0;
  for (let phi = -32; phi < 66; phi += 3, i++) {
    const [yc, rx, ry] = lat(phi + r.uniform(-0.8, 0.8));
    g += `<path d="M${n(-rx)} ${n(yc)}A${n(rx)} ${n(ry)} 0 0 0 ${n(rx)} ${n(yc)}" fill="none" stroke="${i % 2 ? '#fff4d6' : '#5a4526'}" stroke-opacity="${n(r.uniform(0.06, 0.16))}" stroke-width="${n(r.uniform(0.5, 1.6))}"/>`;
  }
  for (const [phi, lam, s] of [[41, -32, 1], [38, 18, 0.7], [-12, -50, 0.8]] as const) {
    const [yc, rx, ry] = lat(phi);
    g += `<ellipse cx="${n(rx * Math.sin(rad(lam)))}" cy="${n(yc + ry * Math.cos(rad(lam)))}" rx="${n(6 * s)}" ry="${n(2.2 * s)}" fill="#f8eed4" opacity=".55"/>`;
  }
  {
    const [yc, rx, ry] = lat(77);
    const hex = Array.from({ length: 6 }, (_, k) => `${n(rx * Math.cos(rad(60 * k + 10)))},${n(yc + ry * Math.sin(rad(60 * k + 10)))}`).join(' ');
    g += `<polygon points="${hex}" fill="#76808c" fill-opacity=".55" stroke="#56606d" stroke-width="1.1"/>`;
    const [yc2, rx2, ry2] = lat(86);
    g += `<ellipse cy="${n(yc2)}" rx="${n(rx2 + 3)}" ry="${n(ry2 + 1.2)}" fill="#4d5561" opacity=".8"/>`;
  }
  const o = 190 * 0.78, iR = 150 * 0.78;
  g += `<path d="M${n(-o)} -18A${n(o)} ${n(o * sB)} 0 0 0 ${n(o)} -18L${n(iR)} -26A${n(iR)} ${n(iR * sB)} 0 0 1 ${n(-iR)} -26Z" fill="#20170c" opacity=".5"/>`;
  g += `<ellipse rx="${n(a)}" ry="${n(ly)}" fill="url(#${u}limb)"/><ellipse rx="${n(a)}" ry="${n(ly)}" fill="url(#${u}term)"/>`;
  g += `<ellipse rx="${n(a - 0.6)}" ry="${n(ly - 0.6)}" fill="none" stroke="#fff3d6" stroke-opacity=".18" stroke-width="1.2"/>`;

  const defs =
    `<clipPath id="${u}globe"><ellipse rx="${n(a)}" ry="${n(ly)}"/></clipPath>` +
    `<clipPath id="${u}back"><path d="M-272 0A272 ${n(272 * sB)} 0 0 1 272 0Z"/></clipPath>` +
    `<radialGradient id="${u}limb" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#140a03" stop-opacity=".16"/><stop offset=".92" stop-color="#0a0602" stop-opacity=".55"/><stop offset="1" stop-color="#050301" stop-opacity=".85"/></radialGradient>` +
    `<linearGradient id="${u}term" x1=".1" y1=".05" x2=".95" y2=".95"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".56" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#03030a" stop-opacity=".55"/><stop offset="1" stop-color="#010104" stop-opacity=".9"/></linearGradient>` +
    `<radialGradient id="${u}ti" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#f4cf8c"/><stop offset=".7" stop-color="#b9823e"/><stop offset="1" stop-color="#5a3a15"/></radialGradient>` +
    `<radialGradient id="${u}glo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe3a3" stop-opacity=".22"/><stop offset="1" stop-color="#ffe3a3" stop-opacity="0"/></radialGradient>`;
  const system =
    `<ellipse rx="190" ry="170" fill="url(#${u}glo)"/>` +
    rings(back) +
    `<g clip-path="url(#${u}back)"><polygon points="18,-36 122,-6 330,-80 250,-150" fill="#04050b" opacity=".82"/></g>` +
    `<g clip-path="url(#${u}globe)">${g}</g>` +
    rings(front);
  const moons: [string, number, number, number, string][] = [
    ['TITAN', 318, -64, 4.6, `url(#${u}ti)`], ['RHEA', -300, 30, 2.1, '#dcd8d0'], ['DIONE', 296, 34, 1.8, '#d2cdc5'],
    ['TETHYS', -288, -30, 1.8, '#e2ded6'], ['ENCELADUS', 286, -18, 1.3, '#ffffff'],
  ];
  let mo = '';
  for (const [, x, y, rr_, c] of moons) {
    const [X, Y] = scr(x, y);
    mo += `<circle cx="${n(X)}" cy="${n(Y)}" r="${n(rr_)}" fill="${c}"/><circle cx="${n(X + rr_ * 0.35)}" cy="${n(Y + rr_ * 0.3)}" r="${n(rr_ * 0.9)}" fill="#000" opacity=".45"/>`;
  }
  const object = layer(W, H, `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${sc})">${system}</g>${mo}${grain(u + 'o', W, H, 0.12)}`, defs);

  let s = reticle(cx, cy, 124, 72, 8, 0.22);
  s += callout(ringPt(119875 * K, 152), [30, 452], ['CASSINI DIVISION', '4,590 KM']);
  s += callout(ringPt(105000 * K, -150), [30, 146], ['B RING', '25,580 KM WIDE']);
  s += callout(ringPt(130000 * K, 28), [552, 488], ['A RING'], 'end');
  s += callout(ringPt(133587 * K, 58), [552, 532], ['ENCKE GAP', '325 KM'], 'end');
  s += callout(scr(0, lat(77)[0]), [552, 128], ['NORTH POLAR', 'HEXAGON'], 'end');
  for (const [name, x, y] of moons) {
    const [X, Y] = scr(x, y);
    s += `<text x="${n(X)}" y="${n(Y + (y < 0 ? -9 : 15))}" fill="rgba(245,241,232,.66)" style="${LABEL_STYLE}" text-anchor="middle">${name}</text>`;
  }
  s += scalebar(552 - 50000 * K * sc, 590, 50000 * K * sc, '50,000 KM', 'end');
  s += heading('RING PLANE 24° · FLATTENING 0.098');
  return { sky, object, survey: layer(W, H, s), full: false };
}

// ------------------------------------------------------------------ The Moon
function moon(u: string): PlateLayers {
  const cx = 291, cy = 300, R = 200;
  const r = rng(1);
  const sky = layer(
    W, H,
    `<rect width="${W}" height="${H}" fill="url(#${u}hz)"/>` + starfield(W, H, 150, 21, 3, u) + `<circle cx="${cx}" cy="${cy}" r="${R + 70}" fill="url(#${u}halo)"/>`,
    spikeDefs(u) +
      `<radialGradient id="${u}hz" cx=".5" cy=".48" r=".72"><stop offset="0" stop-color="#1c2442"/><stop offset=".55" stop-color="#0a1022"/><stop offset="1" stop-color="#03050c"/></radialGradient>` +
      `<radialGradient id="${u}halo" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#c9d6ff" stop-opacity=".16"/><stop offset="1" stop-color="#c9d6ff" stop-opacity="0"/></radialGradient>`,
  );
  const defs =
    `<clipPath id="${u}disk"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>` +
    `<radialGradient id="${u}base" cx=".64" cy=".42" r=".72"><stop offset="0" stop-color="#f3f2ec"/><stop offset=".45" stop-color="#d2d0c9"/><stop offset=".82" stop-color="#a6a49e"/><stop offset="1" stop-color="#7a7874"/></radialGradient>` +
    `<radialGradient id="${u}limb" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset=".9" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>` +
    `<filter id="${u}n1" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="5" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>` +
    `<filter id="${u}n2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="9"/><feColorMatrix type="saturate" values="0"/></filter>` +
    `<filter id="${u}b2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4.5"/></filter><filter id="${u}b6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter><filter id="${u}b1"><feGaussianBlur stdDeviation=".7"/></filter>`;
  const P = (x: number, y: number): [number, number] => [cx + x * R, cy + y * R];
  let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}base)"/><rect x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${2 * R}" filter="url(#${u}n1)" opacity=".42" style="mix-blend-mode:multiply"/>`;
  // Maria at their near-side positions: Imbrium, Serenitatis, Tranquillitatis, Crisium, Fecunditatis,
  // Nectaris, Nubium, Humorum, Procellarum, Frigoris, Vaporum, Cognitum.
  const maria: [number, number, number, number][] = [
    [-0.3, -0.42, 0.26, 0.22], [0.12, -0.4, 0.15, 0.14], [0.3, -0.12, 0.19, 0.16], [0.66, -0.3, 0.08, 0.12], [0.52, 0.1, 0.11, 0.17],
    [0.34, 0.26, 0.08, 0.09], [-0.22, 0.3, 0.16, 0.12], [-0.5, 0.36, 0.08, 0.08], [-0.62, -0.05, 0.24, 0.42], [-0.02, -0.72, 0.36, 0.05],
    [0, -0.22, 0.07, 0.05], [-0.3, 0.12, 0.09, 0.07],
  ];
  let mar = '';
  for (const [x, y, rx, ry] of maria) {
    const [X, Y] = P(x, y);
    mar += `<path d="${blob(X, Y, rx * R, ry * R, r, 22, 0.16)}" fill="#5f6470" opacity=".66"/>`;
    mar += `<path d="${blob(X + r.uniform(-6, 6), Y + r.uniform(-6, 6), rx * R * 0.6, ry * R * 0.6, r, 12, 0.3)}" fill="#50555f" opacity=".4"/>`;
  }
  body += `<g filter="url(#${u}b2)">${mar}</g>`;
  body += `<rect x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${2 * R}" filter="url(#${u}n2)" opacity=".22" style="mix-blend-mode:overlay"/>`;
  const rays = (x: number, y: number, count: number, lo: number, hi: number, op: number) => {
    const [X, Y] = P(x, y);
    let out = '';
    for (let k = 0; k < count; k++) {
      const t = r.uniform(0, 2 * Math.PI), L = r.uniform(lo, hi) * R;
      out += `<line x1="${n(X)}" y1="${n(Y)}" x2="${n(X + L * Math.cos(t))}" y2="${n(Y + L * Math.sin(t))}" stroke="#f7f6f0" stroke-opacity="${n(r.uniform(op * 0.4, op))}" stroke-width="${n(r.uniform(0.7, 2.4))}" stroke-linecap="round"/>`;
    }
    return out + `<circle cx="${n(X)}" cy="${n(Y)}" r="${n(R * 0.08)}" fill="#fff" opacity=".16"/>`;
  };
  // Tycho, Copernicus, Kepler.
  body += `<g filter="url(#${u}b1)">${rays(-0.14, 0.68, 52, 0.15, 0.95, 0.17)}${rays(-0.34, -0.17, 30, 0.08, 0.36, 0.14)}${rays(-0.59, -0.13, 16, 0.05, 0.2, 0.12)}</g>`;
  let cr = '';
  const crater = (x: number, y: number, size: number) => {
    const d = Math.hypot(x, y), fo = Math.sqrt(Math.max(0.06, 1 - d * d)), ang = (Math.atan2(y, x) * 180) / Math.PI;
    const t = rad(-ang), sx = Math.cos(t), sy = Math.sin(t);
    const [X, Y] = P(x, y);
    // Sunlight from the right: a dark crescent under the sunward rim, a lit floor across from it.
    cr +=
      `<g transform="translate(${n(X)} ${n(Y)}) rotate(${n(ang)})"><ellipse rx="${n(size * fo)}" ry="${n(size)}" fill="#2c2d33" opacity=".2"/>` +
      `<ellipse cx="${n(-sx * size * 0.24 * fo)}" cy="${n(-sy * size * 0.24)}" rx="${n(size * 0.78 * fo)}" ry="${n(size * 0.78)}" fill="#e2e0d9" opacity=".2"/>` +
      `<ellipse rx="${n(size * 1.04 * fo)}" ry="${n(size * 1.04)}" fill="none" stroke="#fbfaf5" stroke-opacity=".12" stroke-width=".6"/></g>`;
  };
  for (const [x, y, s] of [[-0.14, 0.68, 9], [-0.34, -0.17, 10], [-0.59, -0.13, 5], [0.1, 0.62, 12], [-0.05, 0.4, 8], [0.44, 0.58, 10]] as const) crater(x, y, s);
  for (let placed = 0; placed < 250; ) {
    const x = r.uniform(-1, 1), y = r.uniform(-1, 1);
    if (x * x + y * y > 0.93) continue;
    const inMare = maria.some(([mx, my, mrx, mry]) => ((x - mx) / mrx) ** 2 + ((y - my) / mry) ** 2 < 1);
    if (inMare && r.next() > 0.25) continue;
    crater(x, y, 1.2 + 11 * r.next() ** 3.4);
    placed++;
  }
  body += cr;
  const [ax0, ay0] = P(-0.72, -0.38); // Aristarchus, the brightest spot on the near side
  body += `<path d="M${n(ax0)} ${n(ay0)}L${n(ax0 + 0.1)} ${n(ay0)}" stroke="#fff" stroke-opacity=".9" stroke-width="2.2" stroke-linecap="round"/>`;
  const k = 0.38; // waxing gibbous
  body += `<path d="M${cx} ${cy - R - 8}A${R + 8} ${R + 8} 0 0 0 ${cx} ${cy + R + 8}A${n(k * R)} ${R + 8} 0 0 1 ${cx} ${cy - R - 8}Z" fill="#04060d" opacity=".9" filter="url(#${u}b6)"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}limb)"/>`;
  const object = layer(
    W, H,
    `<g clip-path="url(#${u}disk)">${body}</g><circle cx="${cx}" cy="${cy}" r="${n(R - 0.5)}" fill="none" stroke="#f4f6ff" stroke-opacity=".25" stroke-width="1"/>` + grain(u + 'o', W, H, 0.1),
    defs,
  );

  let s = `<defs><clipPath id="${u}gd"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs><g clip-path="url(#${u}gd)" fill="none" stroke="rgba(245,241,232,.14)" stroke-width=".6" stroke-dasharray="2 3">`;
  for (const la of [-60, -30, 0, 30, 60]) {
    const y = cy - R * Math.sin(rad(la)), hw = R * Math.cos(rad(la));
    s += `<line x1="${n(cx - hw)}" y1="${n(y)}" x2="${n(cx + hw)}" y2="${n(y)}"/>`;
  }
  for (const lo of [-60, -30, 30, 60]) {
    s += `<path d="M${cx} ${cy - R}A${n(R * Math.abs(Math.sin(rad(lo))))} ${R} 0 0 ${lo > 0 ? 1 : 0} ${cx} ${cy + R}"/>`;
  }
  s += `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}"/></g>`;
  s += reticle(cx, cy, R + 16, 72, 4, 0.2);
  s += callout(P(-0.3, -0.42), [30, 142], ['MARE', 'IMBRIUM']);
  s += callout(P(-0.34, -0.17), [30, 262], ['COPERNICUS', '93 KM']);
  s += callout(P(-0.14, 0.68), [30, 478], ['TYCHO', '85 KM · RAYED']);
  s += callout(P(0.66, -0.3), [552, 132], ['MARE', 'CRISIUM'], 'end');
  s += callout(P(0.3, -0.12), [552, 216], ['MARE', 'TRANQUILLITATIS'], 'end');
  const [ax, ay] = P(0.398, -0.0118); // Tranquility Base, 0.674°N 23.473°E
  s += `<g stroke="#5eead4" stroke-width=".8"><line x1="${n(ax - 6)}" y1="${n(ay)}" x2="${n(ax + 6)}" y2="${n(ay)}"/><line x1="${n(ax)}" y1="${n(ay - 6)}" x2="${n(ax)}" y2="${n(ay + 6)}"/></g>`;
  s += callout([ax, ay], [552, 312], ['APOLLO 11', '0.674°N 23.473°E'], 'end', '#8ff0dc', false);
  const bar = (1000 / 1737) * R;
  s += scalebar(552 - bar, 590, bar, '1,000 KM', 'end');
  s += heading('NEAR SIDE · WAXING GIBBOUS');
  return { sky, object, survey: layer(W, H, s), full: false };
}

// ------------------------------------------------------------------ Andromeda
function andromeda(u: string): PlateLayers {
  const cx = 291, cy = 300, rot = -38;
  const q = Math.cos(rad(77));
  const r = rng(31);
  const sky = layer(
    W, H,
    `<rect width="${W}" height="${H}" fill="url(#${u}hz)"/>` + starfield(W, H, 320, 41, 7, u),
    spikeDefs(u) + `<radialGradient id="${u}hz" cx=".5" cy=".48" r=".75"><stop offset="0" stop-color="#1d2244"/><stop offset=".55" stop-color="#0b0e22"/><stop offset="1" stop-color="#03040b"/></radialGradient>`,
  );
  let defs =
    `<filter id="${u}b4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<filter id="${u}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>` +
    `<filter id="${u}b1"><feGaussianBlur stdDeviation=".5"/></filter>` + spikeDefs(u + 'x');
  for (const [id, c0, o0, c1] of [['halo', '#7086cc', 0.22, '#7086cc'], ['disk', '#b9c6ea', 0.42, '#9fb0e0'], ['inner', '#f1dcb5', 0.7, '#d8c6a8'], ['bulge', '#fff6e2', 1, '#f3d9ae']] as const) {
    defs += `<radialGradient id="${u}${id}"><stop offset="0" stop-color="${c0}" stop-opacity="${n(o0)}"/><stop offset=".55" stop-color="${c1}" stop-opacity="${n(o0 * 0.35)}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>`;
  }
  const glow =
    `<ellipse rx="345" ry="${n(345 * q * 1.5)}" fill="url(#${u}halo)"/><ellipse rx="265" ry="${n(265 * q * 1.3)}" fill="url(#${u}disk)"/>` +
    `<ellipse rx="125" ry="${n(125 * q * 1.4)}" fill="url(#${u}inner)"/><ellipse rx="58" ry="${n(58 * q * 1.9)}" fill="url(#${u}bulge)"/>`;
  // Two arms of stars, warm in the bulge, blue in the disk, a few pink HII regions.
  let blobs = '', parts = '';
  for (let i = 0; i < 1300; i++) {
    const arm = i % 2, t = r.next() ** 1.1;
    const rr_ = 22 + 300 * t, th = arm * Math.PI + t * 3.3 * Math.PI, sd = 5 + 13 * t;
    const x = rr_ * Math.cos(th) + r.gauss(0, sd), y = (rr_ * Math.sin(th) + r.gauss(0, sd)) * q;
    const col = t < 0.15 ? '#ffe4bd' : r.next() < 0.04 ? '#ff9ec7' : r.pick(['#cfe0ff', '#b6ccff', '#e6eeff', '#ffffff', '#dfe6ff']);
    parts += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.35 + r.next() ** 2)}" fill="${col}" opacity="${n(0.3 + 0.65 * r.next())}"/>`;
    if (i % 5 === 0) blobs += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(3 + 6 * r.next())}" fill="#a9bdff" opacity=".07"/>`;
  }
  let lanes = '';
  for (const lr of [92, 128, 166, 204, 246, 284]) {
    const a0 = r.uniform(150, 200), a1 = r.uniform(330, 380);
    const pts = Array.from({ length: 40 }, (_, k) => {
      const A = rad(a0 + ((a1 - a0) * k) / 39);
      return `${n(lr * Math.cos(A))} ${n(lr * Math.sin(A) * q + 2)}`;
    });
    lanes += `<path d="M${pts.join('L')}" fill="none" stroke="#150d06" stroke-width="${n(r.uniform(2.5, 5.5))}" stroke-opacity="${n(r.uniform(0.28, 0.45))}" stroke-dasharray="${r.int(30, 60)} ${r.int(6, 14)} ${r.int(14, 30)} ${r.int(4, 10)}" stroke-linecap="round"/>`;
  }
  const gal =
    `<g transform="translate(${cx} ${cy}) rotate(${rot})"><g filter="url(#${u}b4)">${glow}${blobs}</g><g filter="url(#${u}b1)">${parts}</g><g filter="url(#${u}b2)">${lanes}</g>` +
    `<circle r="10" fill="#fff4de" opacity=".5" filter="url(#${u}b2)"/><circle r="3" fill="#fff"/></g>`;
  const m32: [number, number] = [348, 360], m110: [number, number] = [176, 178];
  const sats =
    `<circle cx="${m32[0]}" cy="${m32[1]}" r="11" fill="url(#${u}bulge)"/><circle cx="${m32[0]}" cy="${m32[1]}" r="2" fill="#fff"/>` +
    `<ellipse cx="${m110[0]}" cy="${m110[1]}" rx="30" ry="12" transform="rotate(-62 ${m110[0]} ${m110[1]})" fill="url(#${u}inner)" opacity=".75"/>`;
  const object = layer(W, H, gal + sats + starfield(W, H, 40, 77, 4, u + 'x') + grain(u + 'o', W, H, 0.12), defs);
  const scr = (x: number, y: number): [number, number] => {
    const t = rad(rot);
    return [cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)];
  };
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="310" ry="${n(310 * q)}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="rgba(245,241,232,.2)" stroke-width=".6" stroke-dasharray="3 5"/>`;
  s += callout([cx, cy], [552, 150], ['NUCLEUS', 'P2 DOUBLE CORE'], 'end');
  s += callout(m32, [552, 452], ['M32', 'SATELLITE'], 'end');
  s += callout(m110, [30, 130], ['M110', 'SATELLITE']);
  s += callout(scr(166 * Math.cos(rad(250)), 166 * Math.sin(rad(250)) * q), [30, 470], ['DUST LANE']);
  s += callout(scr(310, 0), [552, 520], ['DISK', 'INCLINED 77°'], 'end', undefined, false);
  s += scalebar(472, 590, 80, '20,000 LY', 'end');
  s += heading('RA 00H 42M 44S · DEC +41° 16′');
  return { sky, object, survey: layer(W, H, s), full: false };
}

// ------------------------------------------------------------------ M87
function m87(u: string): PlateLayers {
  const cx = 291, cy = 330, R = 150;
  const r = rng(87);
  let gcs = '';
  // The galaxy's globular clusters, thick toward the core.
  for (let i = 0; i < 700; i++) {
    const d = 30 + 400 * r.next() ** 1.8, A = r.uniform(0, 2 * Math.PI);
    gcs += `<circle cx="${n(cx + d * Math.cos(A))}" cy="${n(cy + d * 0.9 * Math.sin(A))}" r="${n(0.3 + 0.6 * r.next())}" fill="#ffe9cc" opacity="${n(0.12 + 0.5 * r.next())}"/>`;
  }
  const sky = layer(
    W, HF,
    `<rect width="${W}" height="${HF}" fill="url(#${u}hz)"/>` + gcs + starfield(W, HF, 60, 88, 3, u, ['#fff1dc', '#ffe0c0', '#ffffff']),
    spikeDefs(u) + `<radialGradient id="${u}hz" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#3a2410"/><stop offset=".35" stop-color="#1a0e06"/><stop offset=".75" stop-color="#080404"/><stop offset="1" stop-color="#030203"/></radialGradient>`,
  );
  const defs =
    `<linearGradient id="${u}ring" x1=".25" y1="0" x2=".65" y2="1"><stop offset="0" stop-color="#2a0801"/><stop offset=".3" stop-color="#7a2205"/><stop offset=".58" stop-color="#d9570f"/><stop offset=".82" stop-color="#ffa347"/><stop offset="1" stop-color="#ffe0a6"/></linearGradient>` +
    `<radialGradient id="${u}glow" cx=".5" cy=".5" r=".5"><stop offset=".42" stop-color="#ff8a2a" stop-opacity="0"/><stop offset=".6" stop-color="#ff8a2a" stop-opacity=".28"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${u}shadow"><stop offset="0" stop-color="#000"/><stop offset=".9" stop-color="#040100"/><stop offset="1" stop-color="#1a0802"/></radialGradient>` +
    `<linearGradient id="${u}jet" x1="0" x2="1"><stop offset="0" stop-color="#cfe6ff" stop-opacity=".7"/><stop offset=".5" stop-color="#9fcaff" stop-opacity=".25"/><stop offset="1" stop-color="#9fcaff" stop-opacity="0"/></linearGradient>` +
    `<filter id="${u}plasma" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="8"/><feDisplacementMap in="SourceGraphic" scale="9"/><feGaussianBlur stdDeviation="2.8"/></filter>` +
    `<filter id="${u}b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>` +
    `<filter id="${u}b8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`;
  const knots = [225, 262, 300, 344, 392, 446, 500]
    .map((x, i) => `<ellipse cx="${x}" cy="0" rx="${n(6 + i * 1.3)}" ry="${n(2.4 + i * 0.5)}" fill="#e6f3ff" opacity="${n(0.75 - i * 0.07)}"/>`)
    .join('');
  const jet = `<g transform="translate(${cx} ${cy}) rotate(-44)"><path d="M150 -5L560 -30L560 30L150 5Z" fill="url(#${u}jet)" filter="url(#${u}b3)"/><g filter="url(#${u}b3)">${knots}</g></g>`;
  let arcs = '';
  // Streaks of the accretion flow, brighter on the side moving toward us.
  for (let i = 0; i < 160; i++) {
    const ar = r.uniform(112, 205), a0 = r.uniform(0, 360), L = r.uniform(18, 75);
    const boost = 0.45 + (0.55 * (1 + Math.sin(rad(a0 + L / 2)))) / 2;
    const A0 = rad(a0), A1 = rad(a0 + L);
    arcs += `<path d="M${n(cx + ar * Math.cos(A0))} ${n(cy + ar * Math.sin(A0))}A${n(ar)} ${n(ar)} 0 0 1 ${n(cx + ar * Math.cos(A1))} ${n(cy + ar * Math.sin(A1))}" fill="none" stroke="${r.pick(['#ffcf8a', '#ff9a3c', '#fff1d2', '#ffb45a'])}" stroke-opacity="${n(r.uniform(0.08, 0.32) * boost)}" stroke-width="${n(r.uniform(0.6, 2.4))}"/>`;
  }
  const ring =
    `<circle cx="${cx}" cy="${cy}" r="265" fill="url(#${u}glow)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#${u}ring)" stroke-width="58" filter="url(#${u}plasma)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="none" stroke="url(#${u}ring)" stroke-width="30" opacity=".4" filter="url(#${u}b8)"/>` +
    arcs +
    `<circle cx="${cx}" cy="${cy}" r="114" fill="none" stroke="#fff4dd" stroke-width="4" opacity=".45" filter="url(#${u}b3)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="111" fill="url(#${u}shadow)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="114" fill="none" stroke="#fff6e4" stroke-width="1.4" opacity=".9"/>`;
  const object = layer(W, HF, jet + ring + grain(u + 'o', W, HF, 0.14), defs);
  let s = reticle(cx, cy, 238, 72, 4, 0.2);
  ['0°', '90°', '180°', '270°'].forEach((t, i) => {
    const A = rad(-90 + 90 * i);
    s += `<text x="${n(cx + 258 * Math.cos(A))}" y="${n(cy + 258 * Math.sin(A) + 3)}" text-anchor="middle" fill="rgba(245,241,232,.5)" style="${LABEL_STYLE}">${t}</text>`;
  });
  s += callout([cx + 114 * Math.cos(rad(-122)), cy + 114 * Math.sin(rad(-122))], [30, 150], ['PHOTON RING']);
  s += callout([cx - 40, cy + 20], [30, 470], ['SHADOW', 'Ø 42 µAS']);
  s += callout([cx + 170 * Math.cos(rad(115)), cy + 170 * Math.sin(rad(115))], [552, 520], ['ACCRETION FLOW', 'DOPPLER-BRIGHT SOUTH'], 'end');
  s += callout([cx + 300 * Math.cos(rad(-44)), cy + 300 * Math.sin(rad(-44))], [552, 200], ['RELATIVISTIC JET', '5,000 LY'], 'end');
  s += heading('RA 12H 30M 49S · DEC +12° 23′ · EHT 2019');
  return { sky, object, survey: layer(W, HF, s), full: true };
}

const DRAW: Record<string, (u: string) => PlateLayers> = { MOON: moon, M31: andromeda, SATURN: saturn, M87: m87 };

/** The designations that have a survey plate. Every other card keeps its drawn art inside the same frame. */
export const SURVEYED = Object.keys(DRAW);

const cache = new Map<string, PlateLayers>();

/** A card's plate layers, or null where none is drawn yet. `u` prefixes every id. */
export function surveyPlate(designation: string, u: string): PlateLayers | null {
  const draw = DRAW[designation];
  if (!draw) return null;
  const key = `${designation}|${u}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = draw(u);
    if (cache.size > 64) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}
