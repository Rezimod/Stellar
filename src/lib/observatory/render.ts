/**
 * Drawing a frame the way the sensor would produce it.
 *
 * A reference photograph supplies the content. Everything else — how large the
 * object is in the field, how badly the seeing smears it, how much the sky glow
 * lifts the background, how much noise a single sub carries — is computed from
 * the instrument, the site and the integration time. That is the difference
 * between a simulator and a slideshow.
 */

import {
  altAzToRaDec,
  fieldStarsNear,
  limitingMagnitude,
  northAngleDeg,
  raDecToAltAz,
  tangentOffsetDeg,
  type SkyObject,
} from './sky-field';
import type { AltAz } from './safety';

export type FrameInputs = {
  /** Canvas size in device-independent pixels. */
  width: number;
  height: number;
  /** Field of view across the long axis, arcminutes. */
  fovArcmin: number;
  /** Apparent size of the target, arcminutes. */
  targetArcmin: number;
  /** Seeing FWHM in arcseconds — 1.5 is excellent, 4 is poor. */
  seeingArcsec: number;
  /** Dawes limit for the aperture — the floor stacking can approach, never beat. */
  diffractionArcsec: number;
  /** Arcseconds per sensor pixel at the current focal length. */
  plateScaleArcsecPx: number;
  /** Bortle class at the site, 1-9. Sets the background level. */
  bortle: number;
  /** Subframes stacked so far. Noise falls as the square root of this. */
  subs: number;
  /**
   * Stack depth used for the atmospheric shift only.
   *
   * In the split comparison both halves must sit on the same pixels or the
   * seam reads as a broken image rather than a before and after. Registering
   * them is also the truer statement: stacking *aligns* frames, so what a
   * stack removes is the noise and the blur, not the object's position.
   */
  jitterSubs?: number;
  /** Camera gain, 0-100. Raises signal and noise together. */
  gain: number;
  /** Field rotation accumulated since the stack began, degrees. */
  rotationDeg: number;
  /** How far off-centre the target still is, as a fraction of frame width. */
  centeringOffset: number;
  /** Deterministic seed so a given pointing always draws the same field. */
  seed: number;
  /**
   * How many target diameters the reference photo spans across its width.
   * Saturn's rings run about 2.3 globe diameters, so a ring-cropped photo is
   * that wide; a tight planetary disc is barely wider than 1.
   */
  frameSpan: number;
};

/** Mulberry32 — small, fast, and repeatable, so a field does not shimmer. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sky background luminance from the site's Bortle class, 0-1.
 *
 * Even a Bortle 8 city sky is dark grey on a short sub, not the pale fog that
 * a naive linear ramp produces — the eye adapts, the sensor does not, and an
 * over-bright background hides exactly the faint structure the simulator is
 * supposed to reveal as the stack builds.
 */
function skyGlow(bortle: number): number {
  const ceiling = 0.13;
  return Math.min(ceiling, Math.max(0.008, (bortle - 1) / 8) * ceiling);
}

export function drawSky(ctx: CanvasRenderingContext2D, i: FrameInputs, wash = 0) {
  const glow = skyGlow(i.bortle) * (0.6 + i.gain / 150);
  const level = Math.round(glow * 255);
  // Light pollution is warm and brightest toward the horizon; a flat fill
  // would read as a black rectangle rather than a real sky.
  const gradient = ctx.createLinearGradient(0, i.height, 0, 0);
  // Light pollution is warm and strongest toward the horizon, but only just —
  // a heavy tint reads as brown haze rather than sky.
  gradient.addColorStop(0, `rgb(${level + 5}, ${level + 3}, ${level})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, level - 2)}, ${Math.max(0, level - 1)}, ${level})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, i.width, i.height);

  // Daylight. The sensor does not adapt the way the eye does: a sub of any
  // real length under a lit sky is pale blue, and the stars are gone.
  if (wash > 0) {
    ctx.fillStyle = `rgba(158, 186, 232, ${Math.min(1, wash).toFixed(3)})`;
    ctx.fillRect(0, 0, i.width, i.height);
  }
}

/**
 * Field stars.
 *
 * At 26 arcminutes there are no famous stars in frame — just anonymous field
 * stars, which is exactly what a real capture looks like. Count scales with
 * field area and falls away under a bright sky.
 */
export function drawFieldStars(ctx: CanvasRenderingContext2D, i: FrameInputs) {
  const random = rng(i.seed);
  const areaFactor = (i.fovArcmin / 26) ** 2;
  const count = Math.round(90 * areaFactor * (1 - skyGlow(i.bortle)));
  const starBlur = blurPx(i);

  for (let n = 0; n < count; n++) {
    const x = random() * i.width;
    const y = random() * i.height;
    // Faint stars vastly outnumber bright ones; the cube pushes the
    // distribution that way without needing a real luminosity function.
    const brightness = random() ** 3;
    const radius = Math.max(0.4, starBlur * (0.35 + brightness * 0.5));

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
    halo.addColorStop(0, `rgba(255, 252, 245, ${0.25 + brightness * 0.75})`);
    halo.addColorStop(1, 'rgba(255, 252, 245, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Effective blur, in display pixels.
 *
 * This is lucky imaging in one line. A single frame is smeared by the seeing;
 * stacking the best of many averages the turbulence out and the result walks
 * toward the aperture's diffraction limit, which it can never beat. It is why
 * a planet starts as a soft blob and resolves into belts and a Cassini
 * division as the stack builds — the thing the simulator most needs to show.
 */
export function effectiveBlurArcsec(i: {
  seeingArcsec: number;
  diffractionArcsec: number;
  subs: number;
}): number {
  const averaged = i.seeingArcsec / Math.sqrt(Math.max(1, i.subs));
  return Math.max(i.diffractionArcsec, averaged);
}

/** Gaussian sigma for a given FWHM. CSS blur() takes sigma, seeing is quoted as FWHM. */
const FWHM_TO_SIGMA = 1 / 2.355;

function blurPx(i: FrameInputs): number {
  const arcsecPerPx = (i.fovArcmin * 60) / i.width;
  return Math.max(0.3, (effectiveBlurArcsec(i) / arcsecPerPx) * FWHM_TO_SIGMA);
}

/**
 * Atmospheric wobble for the current frame, in display pixels.
 *
 * Seeing does not only blur, it moves the image around between frames. The
 * stack aligns them, so the shake dies away as subs accumulate.
 */
export function jitterPx(i: FrameInputs, frame: number): { x: number; y: number } {
  const arcsecPerPx = (i.fovArcmin * 60) / i.width;
  const amplitude = (i.seeingArcsec / arcsecPerPx) / Math.sqrt(Math.max(1, i.jitterSubs ?? i.subs));
  // Two incommensurate frequencies read as turbulence rather than a wobble.
  return {
    x: Math.sin(frame * 0.31) * amplitude * 0.5 + Math.sin(frame * 0.11) * amplitude * 0.3,
    y: Math.cos(frame * 0.27) * amplitude * 0.5 + Math.cos(frame * 0.13) * amplitude * 0.3,
  };
}

/**
 * The target itself, at its true angular size in this field.
 *
 * Jupiter really is 2.5% of the frame width, and M31 really does overflow it
 * six times over. Scaling to the viewport instead would be the one lie that
 * makes the whole exercise worthless.
 */
/**
 * How many pixels across the target is in this frame.
 *
 * The single number the whole simulation rests on: scale to the viewport
 * instead and Jupiter becomes a dinner plate, which is the one lie that would
 * make the exercise worthless.
 */
export function targetDiameterPx(targetArcmin: number, fovArcmin: number, widthPx: number): number {
  return (targetArcmin / fovArcmin) * widthPx;
}

export function drawTarget(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  i: FrameInputs,
  frame: number,
) {
  const diameterPx = targetDiameterPx(i.targetArcmin, i.fovArcmin, i.width);
  // Honour the photo's own proportions. Forcing a 640x310 ring-crop of Saturn
  // into a square stretches the globe into an egg.
  const drawW = diameterPx * i.frameSpan;
  const drawH = image.naturalWidth ? drawW * (image.naturalHeight / image.naturalWidth) : drawW;
  const shake = jitterPx(i, frame);
  const cx = i.width / 2 + i.centeringOffset * i.width + shake.x;
  const cy = i.height / 2 + shake.y;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((i.rotationDeg * Math.PI) / 180);
  // Astronomical signal adds to the sky rather than covering it.
  ctx.globalCompositeOperation = 'lighter';
  // Contrast climbs with the stack: a single sub is too noisy to stretch, and
  // stretching it is exactly the mistake the sources warn against.
  const contrast = 1 + Math.min(0.45, Math.log2(Math.max(1, i.subs)) * 0.09);
  ctx.filter = `blur(${blurPx(i).toFixed(2)}px) contrast(${contrast.toFixed(2)}) brightness(1.06)`;
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Sensor noise, falling as the square root of the stack.
 *
 * One sub is mostly noise; sixteen is four times cleaner. This is the whole
 * reason live stacking exists, so it is the one thing the simulator must get
 * qualitatively right.
 */
export function drawNoise(ctx: CanvasRenderingContext2D, i: FrameInputs, tile: CanvasImageSource) {
  const amplitude = (0.5 + i.gain / 120) / Math.sqrt(Math.max(1, i.subs));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.6, amplitude);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, i.width, i.height);
  }
  ctx.restore();
}

/** A small monochrome noise tile, redrawn occasionally so grain does not freeze. */
export function makeNoiseTile(size = 96): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const data = ctx.createImageData(size, size);
  for (let p = 0; p < data.data.length; p += 4) {
    const v = Math.random() * 255;
    data.data[p] = v;
    data.data[p + 1] = v;
    data.data[p + 2] = v;
    data.data[p + 3] = 26;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/**
 * One complete frame, so the same scene can be drawn twice under different
 * stack depths and clipped side by side. That comparison — a single raw sub
 * against the built stack — is the clearest statement the simulator makes
 * about what stacking actually buys you.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  i: FrameInputs,
  frame: number,
  opts: { image: HTMLImageElement | null; showFieldStars: boolean; showTarget: boolean },
) {
  drawSky(ctx, i);
  if (opts.showFieldStars) drawFieldStars(ctx, i);
  if (opts.image && opts.showTarget) drawTarget(ctx, opts.image, i, frame);
}

/* --- the live frame ----------------------------------------------------- */

export type LiveScene = {
  pointing: AltAz;
  /** Signed axis rates, degrees per second. A moving field streaks. */
  azRate: number;
  altRate: number;
  latDeg: number;
  lstHours: number;
  objects: SkyObject[];
  image: (src: string) => HTMLImageElement | null;
  exposureSec: number;
  sunAltitudeDeg: number;
};

/** Frame time the streaks are integrated over: a planetary camera at 30 fps. */
const STREAK_S = 1 / 30;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * One live frame, built from the sky rather than from a single target.
 *
 * Whatever is inside the field at the current pointing is drawn where it
 * really is — the anonymous star field, the catalogue objects, the planets
 * and their moons — so steering by hand shows the sky sliding past at the
 * commanded rate, and a target arrives at the edge of the frame before it
 * is centred rather than materialising in the middle.
 */
export function drawLiveScene(
  ctx: CanvasRenderingContext2D,
  i: FrameInputs,
  frame: number,
  s: LiveScene,
) {
  const pxPerDeg = i.width / (i.fovArcmin / 60);
  // Twilight ends at -12 degrees for the sky; the wash ramps from there.
  const daylight = clamp((s.sunAltitudeDeg + 12) / 18, 0, 1);
  drawSky(ctx, i, daylight * clamp(s.exposureSec / 0.004, 0.35, 1));

  const limit = limitingMagnitude(s.exposureSec, i.subs, i.bortle) - daylight * 14;
  const north = northAngleDeg(s.pointing, s.latDeg, s.lstHours);
  const shake = jitterPx(i, frame);
  const sigma = blurPx(i);
  const cosAlt = Math.cos((s.pointing.altitude * Math.PI) / 180);
  const streak = {
    x: -s.azRate * cosAlt * pxPerDeg * STREAK_S,
    y: s.altRate * pxPerDeg * STREAK_S,
  };

  const project = (o: AltAz) => {
    const d = tangentOffsetDeg(s.pointing, o);
    return { x: i.width / 2 + d.x * pxPerDeg + shake.x, y: i.height / 2 - d.y * pxPerDeg + shake.y };
  };
  const margin = 40;
  const inFrame = (p: { x: number; y: number }, reach: number) =>
    p.x > -reach - margin && p.x < i.width + reach + margin && p.y > -reach - margin && p.y < i.height + reach + margin;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const eq = altAzToRaDec(s.pointing, s.latDeg, s.lstHours);
  const radiusDeg = Math.hypot(i.width, i.height) / pxPerDeg / 2 + 0.05;
  for (const star of fieldStarsNear(eq, radiusDeg)) {
    if (star.mag > limit) continue;
    const p = project(raDecToAltAz(star, s.latDeg, s.lstHours));
    if (!inFrame(p, 0)) continue;
    drawStar(ctx, p.x, p.y, limit - star.mag, star.tint, sigma, streak);
  }

  // Extended objects sit behind the planets, and stars on top of everything —
  // a Galilean moon in transit is in front of the disc.
  const order: Record<SkyObject['kind'], number> = { dso: 0, body: 1, star: 2 };
  const objects = [...s.objects].sort((a, b) => order[a.kind] - order[b.kind]);

  for (const o of objects) {
    const p = project(o);
    const diameter = targetDiameterPx(o.sizeArcmin, i.fovArcmin, i.width) * (o.frameSpan ?? 1);
    if (!inFrame(p, diameter / 2 + 30)) continue;

    if (o.kind === 'star') {
      if (o.mag > limit) continue;
      drawStar(ctx, p.x, p.y, limit - o.mag, 0.45, sigma, streak);
    } else if (o.kind === 'body') {
      drawBody(ctx, i, o, p, north, sigma, s);
    } else {
      drawDeepSky(ctx, i, o, p, north, sigma, s);
    }
  }

  ctx.restore();
}

/** Star colour by a 0-1 tint: blue-white through white to orange. */
function starColor(tint: number): [number, number, number] {
  if (tint < 0.5) {
    const t = tint / 0.5;
    return [Math.round(205 + 50 * t), Math.round(220 + 35 * t), 255];
  }
  const t = (tint - 0.5) / 0.5;
  return [255, Math.round(255 - 45 * t), Math.round(255 - 95 * t)];
}

/**
 * A star, as the sensor records it: a seeing-blurred spot whose size and
 * brightness grow with how far above the limit it sits. Past saturation the
 * spot blooms, which is why Vega on a one-second sub is a blob and not a dot.
 * This is an SCT, so there are no diffraction spikes.
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  excess: number,
  tint: number,
  sigma: number,
  streak: { x: number; y: number },
) {
  const e = Math.max(0, excess);
  const bloom = e > 6 ? Math.pow(1.35, e - 6) : 1;
  const radius = Math.min(60, Math.max(0.8, sigma * (0.7 + Math.min(e, 6) * 0.3) * bloom));
  // A capture program stretches the display, so a star at the limit is a
  // visible speck rather than a value hidden in the noise.
  const alpha = Math.min(1, 0.32 + e * 0.15);
  const [r, g, b] = starColor(tint);
  const length = Math.hypot(streak.x, streak.y);

  if (length > 1) {
    // The light of a moving star is spread along its trail.
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * Math.max(0.3, Math.min(1, (radius * 2.5) / length))).toFixed(3)})`;
    ctx.lineWidth = radius * 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - streak.x / 2, y - streak.y / 2);
    ctx.lineTo(x + streak.x / 2, y + streak.y / 2);
    ctx.stroke();
    return;
  }

  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
  halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
  halo.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.35).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
  ctx.fill();

  if (e > 8) {
    ctx.fillStyle = `rgba(255, 255, 255, 0.95)`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A planet or the Moon. The photo at its true angular size, rotated to the
 * frame's north, unless the sub is long enough to burn the disc out — at
 * which point it is a white blob with a bloom, which is exactly what a
 * 30-second sub of Jupiter looks like.
 */
function drawBody(
  ctx: CanvasRenderingContext2D,
  i: FrameInputs,
  o: SkyObject,
  p: { x: number; y: number },
  northDeg: number,
  sigma: number,
  s: LiveScene,
) {
  const diameter = targetDiameterPx(o.sizeArcmin, i.fovArcmin, i.width);
  const factor = s.exposureSec / (o.saturateSec ?? 1);

  if (factor > 6) {
    const radius = (diameter / 2) * (1 + 0.35 * Math.log10(factor)) + sigma * 2;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 1.6);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(radius / (radius * 1.6), 'rgba(255, 250, 240, 0.95)');
    glow.addColorStop(1, 'rgba(255, 245, 225, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const image = o.photoSrc ? s.image(o.photoSrc) : null;
  const brightness = clamp(Math.pow(factor, 0.5), 0.3, 1.25);
  const contrast = 1 + Math.min(0.45, Math.log2(Math.max(1, i.subs)) * 0.09);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((northDeg * Math.PI) / 180);
  ctx.filter = `blur(${sigma.toFixed(2)}px) contrast(${contrast.toFixed(2)}) brightness(${brightness.toFixed(2)})`;
  if (image) {
    const w = diameter * (o.frameSpan ?? 1);
    const h = image.naturalWidth ? w * (image.naturalHeight / image.naturalWidth) : w;
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = 'rgba(235, 225, 205, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, diameter / 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * How much of a faint extended object this sub and stack reveal, 0-1.
 * Nothing at planetary exposures, the bright ones from half a second, and
 * the stack keeps lifting the faint ones out of the noise.
 */
function deepSkyVisibility(mag: number, exposureSec: number, subs: number): number {
  const exposure = clamp((Math.log10(Math.max(0.001, exposureSec)) + 1.3) / 2.2, 0, 1);
  const faintness = clamp(1 - (mag - 4) / 8, 0.25, 1);
  return clamp(exposure * faintness * (1 + 0.2 * Math.log10(Math.max(1, subs))), 0, 1);
}

function seedFrom(id: string): number {
  let h = 2166136261;
  for (let n = 0; n < id.length; n++) h = Math.imul(h ^ id.charCodeAt(n), 16777619);
  return h >>> 0;
}

/**
 * A deep-sky object. Three have photographs; the rest are drawn from their
 * catalogued shape, size and orientation — a galaxy is a tilted glow, a
 * globular a dense ball of stars, an open cluster a loose scatter of bright
 * ones, a planetary a small ring. Illustrated where there is no photograph,
 * never a photograph of something else.
 */
function drawDeepSky(
  ctx: CanvasRenderingContext2D,
  i: FrameInputs,
  o: SkyObject,
  p: { x: number; y: number },
  northDeg: number,
  sigma: number,
  s: LiveScene,
) {
  const alpha = deepSkyVisibility(o.mag, s.exposureSec, i.subs);
  if (alpha <= 0.01) return;

  const major = targetDiameterPx(o.sizeArcmin, i.fovArcmin, i.width);
  const minor = targetDiameterPx(o.minorArcmin ?? o.sizeArcmin, i.fovArcmin, i.width);
  const image = o.photoSrc ? s.image(o.photoSrc) : null;

  ctx.save();
  ctx.translate(p.x, p.y);
  // Position angle runs east of north, and east is anticlockwise on the sensor.
  ctx.rotate(((northDeg - (o.paDeg ?? 0)) * Math.PI) / 180);
  ctx.globalAlpha = alpha;

  if (image) {
    const contrast = 1 + Math.min(0.45, Math.log2(Math.max(1, i.subs)) * 0.09);
    ctx.rotate(((o.paDeg ?? 0) * Math.PI) / 180);
    ctx.filter = `blur(${sigma.toFixed(2)}px) contrast(${contrast.toFixed(2)}) brightness(1.06)`;
    const w = major * (o.frameSpan ?? 1);
    const h = image.naturalWidth ? w * (image.naturalHeight / image.naturalWidth) : w;
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  const random = rng(seedFrom(o.id));
  switch (o.shape) {
    case 'galaxy': {
      ctx.filter = `blur(${(sigma * 2).toFixed(2)}px)`;
      ctx.scale(1, Math.max(0.15, minor / major));
      const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, major / 2);
      disc.addColorStop(0, 'rgba(255, 244, 222, 0.95)');
      disc.addColorStop(0.12, 'rgba(240, 228, 205, 0.55)');
      disc.addColorStop(0.5, 'rgba(210, 205, 200, 0.18)');
      disc.addColorStop(1, 'rgba(190, 190, 200, 0)');
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(0, 0, major / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'globular': {
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, major / 2);
      core.addColorStop(0, 'rgba(255, 246, 228, 0.8)');
      core.addColorStop(0.3, 'rgba(250, 240, 220, 0.25)');
      core.addColorStop(1, 'rgba(240, 235, 225, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, major / 2, 0, Math.PI * 2);
      ctx.fill();
      for (let n = 0; n < 260; n++) {
        // Gaussian-ish scatter: dense in the middle, thinning outward.
        const r = (major / 2) * Math.pow(random(), 1.6);
        const t = random() * Math.PI * 2;
        drawStar(ctx, Math.cos(t) * r, Math.sin(t) * r, 1 + random() * 3.5, 0.6, sigma, { x: 0, y: 0 });
      }
      break;
    }
    case 'open': {
      const count = Math.round(clamp(major / 6, 12, 60));
      if (o.id === 'm45') {
        ctx.filter = `blur(${(sigma * 3).toFixed(2)}px)`;
        const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, major / 3);
        haze.addColorStop(0, 'rgba(180, 200, 255, 0.12)');
        haze.addColorStop(1, 'rgba(180, 200, 255, 0)');
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(0, 0, major / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
      }
      for (let n = 0; n < count; n++) {
        const r = (major / 2) * Math.sqrt(random());
        const t = random() * Math.PI * 2;
        drawStar(ctx, Math.cos(t) * r, Math.sin(t) * r, 2 + random() * 6, 0.3 + random() * 0.4, sigma, { x: 0, y: 0 });
      }
      break;
    }
    case 'nebula': {
      ctx.filter = `blur(${(sigma * 2.5).toFixed(2)}px)`;
      ctx.scale(1, Math.max(0.2, minor / major));
      for (let n = 0; n < 4; n++) {
        const r = (major / 2) * (0.45 + random() * 0.35);
        const cx = (random() - 0.5) * major * 0.35;
        const cy = (random() - 0.5) * major * 0.35;
        const blob = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        blob.addColorStop(0, 'rgba(225, 190, 205, 0.32)');
        blob.addColorStop(0.5, 'rgba(200, 175, 200, 0.14)');
        blob.addColorStop(1, 'rgba(180, 170, 200, 0)');
        ctx.fillStyle = blob;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'planetary': {
      ctx.filter = `blur(${(sigma * 1.5).toFixed(2)}px)`;
      ctx.scale(1, Math.max(0.3, minor / major));
      const ring = ctx.createRadialGradient(0, 0, 0, 0, 0, major / 2);
      ring.addColorStop(0, 'rgba(160, 200, 205, 0.12)');
      ring.addColorStop(0.55, 'rgba(170, 215, 215, 0.2)');
      ring.addColorStop(0.85, 'rgba(180, 225, 220, 0.6)');
      ring.addColorStop(1, 'rgba(180, 225, 220, 0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, major / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
