'use client';

import { useEffect, useRef } from 'react';
import {
  drawNoise,
  drawScene,
  makeNoiseTile,
  type FrameInputs,
} from '@/lib/observatory/render';
import type { MissionState } from '@/lib/observatory/mission';

export type LiveViewProps = {
  state: MissionState;
  /** 0-1 through the current phase, used to walk the target into the centre. */
  progress: number;
  photoSrc: string | null;
  fovArcmin: number;
  targetArcmin: number;
  seeingArcsec: number;
  diffractionArcsec: number;
  plateScaleArcsecPx: number;
  bortle: number;
  subs: number;
  gain: number;
  rotationDeg: number;
  /** Deterministic field seed — the pointing, rounded. */
  seed: number;
  frameSpan: number;
  /** A lunar or planetary sub is far too short to record a field star. */
  showFieldStars: boolean;
  /**
   * Fraction of the frame width showing a single raw sub instead of the stack.
   * Null hides the comparison entirely.
   */
  splitAt: number | null;
};

/** States in which the target is somewhere in the frame. */
const ON_SKY: MissionState[] = ['CENTERING', 'OBSERVING', 'CAPTURING', 'PROCESSING'];

export default function LiveView(props: LiveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const noiseRef = useRef<HTMLCanvasElement | null>(null);
  // The draw loop reads the newest props without being torn down and rebuilt
  // on every frame, which would restart the animation each render.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!props.photoSrc) {
      imageRef.current = null;
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    image.src = props.photoSrc;
    image.onload = () => {
      imageRef.current = image;
    };
    return () => {
      image.onload = null;
    };
  }, [props.photoSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    noiseRef.current = makeNoiseTile();
    let frame = 0;
    let running = true;
    let lastNoiseSwap = 0;

    const render = (time: number) => {
      if (!running) return;
      frame += 1;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.width * 9 / 16);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const p = latest.current;
      const slewing = p.state === 'SLEWING';

      const inputs: FrameInputs = {
        width,
        height,
        fovArcmin: p.fovArcmin,
        targetArcmin: p.targetArcmin,
        seeingArcsec: p.seeingArcsec,
        diffractionArcsec: p.diffractionArcsec,
        plateScaleArcsecPx: p.plateScaleArcsecPx,
        bortle: p.bortle,
        subs: p.subs,
        gain: p.gain,
        rotationDeg: p.rotationDeg,
        // The mount lands close, then walks the target in over the centring
        // phase — it does not arrive perfectly framed.
        centeringOffset: p.state === 'CENTERING' ? 0.18 * (1 - p.progress) : 0,
        // A moving mount smears the field; regenerating the seed each frame is
        // what that looks like at video rate.
        seed: slewing ? frame * 2654435761 : p.seed,
        frameSpan: p.frameSpan,
      };

      const scene = {
        image: imageRef.current,
        showFieldStars: p.state !== 'PREPARING' && p.showFieldStars,
        showTarget: ON_SKY.includes(p.state),
      };

      if (p.splitAt === null) {
        drawScene(ctx, inputs, frame, scene);
      } else {
        const boundary = Math.round(width * p.splitAt);

        // Left: one raw sub, the frame as the sensor delivered it.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, boundary, height);
        ctx.clip();
        drawScene(ctx, { ...inputs, subs: 1, jitterSubs: inputs.subs }, frame, scene);
        ctx.restore();

        // Right: the stack as it stands.
        ctx.save();
        ctx.beginPath();
        ctx.rect(boundary, 0, width - boundary, height);
        ctx.clip();
        drawScene(ctx, inputs, frame, scene);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boundary + 0.5, 0);
        ctx.lineTo(boundary + 0.5, height);
        ctx.stroke();
        ctx.restore();
      }

      // Regrain a few times a second rather than every frame — the tile is an
      // ImageData round-trip and the eye cannot tell.
      if (noiseRef.current && time - lastNoiseSwap > 180) {
        noiseRef.current = makeNoiseTile();
        lastNoiseSwap = time;
      }
      if (noiseRef.current) {
        if (p.splitAt === null) {
          drawNoise(ctx, inputs, noiseRef.current);
        } else {
          // Noise is the loudest part of a single sub, so it has to respect
          // the split too or the comparison understates the difference.
          const boundary = Math.round(width * p.splitAt);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, boundary, height);
          ctx.clip();
          drawNoise(ctx, { ...inputs, subs: 1, jitterSubs: inputs.subs }, noiseRef.current);
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.rect(boundary, 0, width - boundary, height);
          ctx.clip();
          drawNoise(ctx, inputs, noiseRef.current);
          ctx.restore();
        }
      }

      requestAnimationFrame(render);
    };

    const handle = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(handle);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-lg"
      style={{ aspectRatio: '16 / 9', background: '#05070c' }}
      role="img"
      aria-label="Simulated telescope camera view"
    />
  );
}
