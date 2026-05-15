import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

export interface PlanetPalette {
  light: string;
  mid: string;
  dark: string;
  rim: string;
}

/** Shared with sky `PlanetIcon` SVG glyphs — keep in sync visually. */
export const PLANET_PALETTES: Record<SolarBodyId, PlanetPalette> = {
  sun: { light: '#fffbe1', mid: '#ffbf54', dark: '#ff7b1a', rim: '#7a3108' },
  mercury: { light: '#e2dccd', mid: '#a89e88', dark: '#57503d', rim: '#292621' },
  venus: { light: '#fff2cd', mid: '#e1c272', dark: '#7f6124', rim: '#4a3312' },
  earth: { light: '#b8daf0', mid: '#4a8ab8', dark: '#1a4568', rim: '#0c2840' },
  mars: { light: '#ee936d', mid: '#cf6038', dark: '#5a230f', rim: '#341208' },
  jupiter: { light: '#faecc4', mid: '#d4a574', dark: '#52311b', rim: '#302014' },
  saturn: { light: '#f3e2a5', mid: '#c79a45', dark: '#695022', rim: '#362714' },
  uranus: { light: '#c9f0ea', mid: '#76c5cf', dark: '#2b6170', rim: '#123643' },
  neptune: { light: '#89b9f0', mid: '#3d75c4', dark: '#18325e', rim: '#10203d' },
  pluto: { light: '#d4c4b4', mid: '#a89888', dark: '#5a5048', rim: '#2a2420' },
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

export function rgbStr(c: [number, number, number], alpha = 1): string {
  return alpha < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${alpha})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}
