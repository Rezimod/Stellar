// Quality presets. One place decides how much the surfaces draw: pixel ratio,
// the shadow map, the post chain, particle and print caps, prop density.
// The player sees three names; `auto` picks one from the device, and the
// runtime governor (moon-perf) sits underneath as the safety net: once the
// pixel ratio has nothing left to give, it steps the whole preset down a
// level. It never steps one back up, and a preset the player names outright
// overrides it.

import { getSettings, onSettingsChange, type QualityPreset } from './settings';

export type QualityLevel = Exclude<QualityPreset, 'auto'>;

export interface QualityProfile {
  level: QualityLevel;
  /** The renderer's pixel ratio is capped here; the governor may go lower. */
  maxPixelRatio: number;
  /** Shadow map edge in texels, 0 for no shadows; half-width of the shadow box, m. */
  shadowMapSize: number;
  shadowRadius: number;
  /** Bloom on, and its render scale; MSAA samples on the composer target. */
  bloom: boolean;
  bloomScale: number;
  msaa: number;
  /** Live caps on the pooled effects. */
  dustMax: number;
  printsMax: number;
  historyMax: number;
  /** Build-time counts: the starfield, and rocks per cut as a fraction of full. */
  stars: number;
  band: number;
  propDensity: number;
  /** The far-LOD reference distance, m: each model scales its own switch off it. */
  lodDistance: number;
  /** The legacy flag the builders read: `performance` builds everything the old mobile path did. */
  lite: boolean;
}

const PROFILES: Record<QualityLevel, QualityProfile> = {
  performance: {
    level: 'performance', maxPixelRatio: 1.25, shadowMapSize: 1024, shadowRadius: 42,
    bloom: false, bloomScale: 0.5, msaa: 0, dustMax: 900, printsMax: 400, historyMax: 500,
    stars: 2200, band: 4000, propDensity: 0.5, lodDistance: 25, lite: true,
  },
  balanced: {
    level: 'balanced', maxPixelRatio: 1.5, shadowMapSize: 2048, shadowRadius: 60,
    bloom: true, bloomScale: 0.5, msaa: 0, dustMax: 1600, printsMax: 900, historyMax: 1200,
    stars: 4200, band: 9000, propDensity: 1, lodDistance: 40, lite: false,
  },
  high: {
    level: 'high', maxPixelRatio: 2, shadowMapSize: 2048, shadowRadius: 60,
    bloom: true, bloomScale: 0.5, msaa: 4, dustMax: 1600, printsMax: 900, historyMax: 1200,
    stars: 4200, band: 9000, propDensity: 1, lodDistance: 60, lite: false,
  },
};

export const QUALITY_LEVELS: QualityLevel[] = ['performance', 'balanced', 'high'];

export function qualityProfile(level: QualityLevel): QualityProfile {
  return PROFILES[level];
}

export interface DeviceSignals {
  /** The unmasked GPU renderer string, '' when unknown. */
  gpu: string;
  cores: number;
  touch: boolean;
  /** CSS viewport width, px. */
  width: number;
  /** navigator.deviceMemory in GB, 0 when unknown. */
  memoryGB: number;
}

const WEAK_GPU = /swiftshader|llvmpipe|software|mali|adreno|powervr|videocore|intel\(r\) hd graphics [2-5]\d{3}/i;
const INTEGRATED_GPU = /intel|iris|uhd|radeon\s*(vega|graphics)|apple gpu|apple a\d/i;
const STRONG_GPU = /apple m\d|nvidia|geforce|rtx|radeon (rx|pro)|arc/i;

/** Which preset a device should start on. Pure, so it is tested. */
export function detectQuality(s: DeviceSignals): QualityLevel {
  if (s.touch || s.width <= 768 || s.cores <= 2 || (s.memoryGB > 0 && s.memoryGB <= 2)) return 'performance';
  if (WEAK_GPU.test(s.gpu)) return 'performance';
  if (STRONG_GPU.test(s.gpu) && s.cores >= 6) return 'high';
  if (INTEGRATED_GPU.test(s.gpu) || s.cores <= 4) return 'balanced';
  return 'balanced';
}

function gpuString(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const s = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return s;
  } catch {
    return '';
  }
}

let detected: QualityLevel | null = null;

export function deviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    gpu: gpuString(),
    cores: navigator.hardwareConcurrency || 4,
    touch: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    width: window.innerWidth,
    memoryGB: nav.deviceMemory ?? 0,
  };
}

/** How far the governor has had to come down, under `auto` only. */
let governed: QualityLevel | null = null;
const listeners = new Set<() => void>();

function autoLevel(): QualityLevel {
  if (!detected) detected = typeof window === 'undefined' ? 'balanced' : detectQuality(deviceSignals());
  return governed ?? detected;
}

/** The preset in force: the player's choice, or the device's as the governor left it. */
export function currentQuality(): QualityProfile {
  const pick = getSettings().quality;
  if (pick !== 'auto') return PROFILES[pick];
  return PROFILES[autoLevel()];
}

/** The level the governor has settled on, or null while it has not had to act. */
export function governedQuality(): QualityLevel | null {
  return governed;
}

/** The frame is over budget with the pixel ratio already at its floor: take
 *  a level off. Only under `auto` — a named preset is the player's call — and
 *  only ever downwards, so a mission cannot be interrupted twice by the same
 *  stretch of slow frames. Returns whether anything moved. */
export function stepQualityDown(): boolean {
  if (getSettings().quality !== 'auto') return false;
  const i = QUALITY_LEVELS.indexOf(autoLevel());
  if (i <= 0) return false;
  governed = QUALITY_LEVELS[i - 1];
  for (const fn of listeners) fn();
  return true;
}

/** The player has named a preset (or asked for `auto` again): the governor's
 *  own finding is theirs to discard. */
export function clearQualityGovernor() {
  governed = null;
}

/** Fires with the new profile when the resolved preset changes. */
export function onQualityChange(fn: (q: QualityProfile) => void): () => void {
  let last = currentQuality().level;
  const check = () => {
    const next = currentQuality();
    if (next.level === last) return;
    last = next.level;
    fn(next);
  };
  listeners.add(check);
  const offSettings = onSettingsChange(check);
  return () => { listeners.delete(check); offSettings(); };
}

/** Development and tests: pretend the device detected this preset, so the
 *  governor and the presets can be exercised on hardware that would not
 *  otherwise reach them. */
export function setDetectedQuality(level: QualityLevel) {
  detected = level;
  governed = null;
  for (const fn of listeners) fn();
}

/** Tests only. */
export function resetQualityDetection() {
  detected = null;
  governed = null;
}
