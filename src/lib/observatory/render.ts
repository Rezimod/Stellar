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

/** Sky background luminance from the site's Bortle class, 0-1. */
function skyGlow(bortle: number): number {
  // Bortle 1 is effectively black; 9 is a bright grey that eats faint detail.
  return Math.min(0.34, Math.max(0.01, (bortle - 1) / 8) * 0.34);
}

export function drawSky(ctx: CanvasRenderingContext2D, i: FrameInputs) {
  const glow = skyGlow(i.bortle) * (0.6 + i.gain / 150);
  const level = Math.round(glow * 255);
  // Light pollution is warm and brightest toward the horizon; a flat fill
  // would read as a black rectangle rather than a real sky.
  const gradient = ctx.createLinearGradient(0, i.height, 0, 0);
  gradient.addColorStop(0, `rgb(${level + 8}, ${level + 5}, ${level})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, level - 4)}, ${Math.max(0, level - 3)}, ${level})`);
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
  const blurPx = seeingPx(i);

  for (let n = 0; n < count; n++) {
    const x = random() * i.width;
    const y = random() * i.height;
    // Faint stars vastly outnumber bright ones; the cube pushes the
    // distribution that way without needing a real luminosity function.
    const brightness = random() ** 3;
    const radius = Math.max(0.4, blurPx * (0.35 + brightness * 0.5));

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
    halo.addColorStop(0, `rgba(255, 252, 245, ${0.25 + brightness * 0.75})`);
    halo.addColorStop(1, 'rgba(255, 252, 245, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Seeing disc radius in pixels for the current field. */
function seeingPx(i: FrameInputs): number {
  const arcsecPerPx = (i.fovArcmin * 60) / i.width;
  return Math.max(0.6, i.seeingArcsec / arcsecPerPx / 2);
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
  image: CanvasImageSource,
  i: FrameInputs,
) {
  const diameterPx = targetDiameterPx(i.targetArcmin, i.fovArcmin, i.width);
  const cx = i.width / 2 + i.centeringOffset * i.width;
  const cy = i.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((i.rotationDeg * Math.PI) / 180);
  // Astronomical signal adds to the sky rather than covering it.
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${seeingPx(i).toFixed(2)}px)`;
  ctx.drawImage(image, -diameterPx / 2, -diameterPx / 2, diameterPx, diameterPx);
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
