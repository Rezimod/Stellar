/**
 * Drawing a frame the way the sensor would produce it.
 *
 * A reference photograph supplies the content. Everything else — how large the
 * object is in the field, how badly the seeing smears it, how much the sky glow
 * lifts the background, how much noise a single sub carries — is computed from
 * the instrument, the site and the integration time. That is the difference
 * between a simulator and a slideshow.
 */

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

export function drawSky(ctx: CanvasRenderingContext2D, i: FrameInputs) {
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
  const amplitude = (i.seeingArcsec / arcsecPerPx) / Math.sqrt(Math.max(1, i.subs));
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
