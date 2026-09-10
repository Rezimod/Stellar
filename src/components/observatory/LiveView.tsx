'use client';

import { useEffect, useRef } from 'react';
import {
  drawLiveScene,
  drawNoise,
  makeNoiseTile,
  type FrameInputs,
  type LiveScene,
} from '@/lib/observatory/render';
import type { SkyObject } from '@/lib/observatory/sky-field';
import type { AltAz } from '@/lib/observatory/safety';

export type MountSample = { pointing: AltAz; azRate: number; altRate: number };

export type LiveViewProps = {
  /** Read once per frame: where the axes are right now, and how fast they move. */
  sample: () => MountSample;
  /** Everything real near the pointing, refreshed a few times a second. */
  objects: SkyObject[];
  latDeg: number;
  lstHours: number;
  sunAltitudeDeg: number;
  exposureSec: number;
  fovArcmin: number;
  seeingArcsec: number;
  diffractionArcsec: number;
  plateScaleArcsecPx: number;
  bortle: number;
  subs: number;
  gain: number;
  /**
   * Fraction of the frame width showing a single raw sub instead of the stack.
   * Null hides the comparison entirely.
   */
  splitAt: number | null;
};

export default function LiveView(props: LiveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const noiseRef = useRef<HTMLCanvasElement | null>(null);
  // The draw loop reads the newest props without being torn down and rebuilt
  // on every frame, which would restart the animation each render.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    noiseRef.current = makeNoiseTile();
    let frame = 0;
    let running = true;
    let lastNoiseSwap = 0;

    // Reference photos load the first time an object comes near the field and
    // are drawn from the next frame on; until then the object is a plain disc.
    const image = (src: string): HTMLImageElement | null => {
      const cached = imagesRef.current.get(src);
      if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
      const el = new Image();
      el.decoding = 'async';
      el.src = src;
      imagesRef.current.set(src, el);
      return null;
    };

    const render = (time: number) => {
      if (!running) return;
      frame += 1;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round((rect.width * 9) / 16);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const p = latest.current;
      const mount = p.sample();

      const inputs: FrameInputs = {
        width,
        height,
        fovArcmin: p.fovArcmin,
        targetArcmin: 0,
        seeingArcsec: p.seeingArcsec,
        diffractionArcsec: p.diffractionArcsec,
        plateScaleArcsecPx: p.plateScaleArcsecPx,
        bortle: p.bortle,
        subs: p.subs,
        gain: p.gain,
        rotationDeg: 0,
        centeringOffset: 0,
        seed: 0,
        frameSpan: 1,
      };

      const scene: LiveScene = {
        pointing: mount.pointing,
        azRate: mount.azRate,
        altRate: mount.altRate,
        latDeg: p.latDeg,
        lstHours: p.lstHours,
        objects: p.objects,
        image,
        exposureSec: p.exposureSec,
        sunAltitudeDeg: p.sunAltitudeDeg,
      };

      // Regrain a few times a second rather than every frame — the tile is an
      // ImageData round-trip and the eye cannot tell.
      if (noiseRef.current && time - lastNoiseSwap > 180) {
        noiseRef.current = makeNoiseTile();
        lastNoiseSwap = time;
      }
      const noise = noiseRef.current;

      if (p.splitAt === null) {
        drawLiveScene(ctx, inputs, frame, scene);
        if (noise) drawNoise(ctx, inputs, noise);
      } else {
        const boundary = Math.round(width * p.splitAt);
        // Left: one raw sub, the frame as the sensor delivered it. Right: the
        // stack as it stands. Noise is the loudest part of a single sub, so it
        // respects the split too.
        const raw: FrameInputs = { ...inputs, subs: 1, jitterSubs: inputs.subs };
        for (const [x, w, frameInputs] of [
          [0, boundary, raw],
          [boundary, width - boundary, inputs],
        ] as const) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, 0, w, height);
          ctx.clip();
          drawLiveScene(ctx, frameInputs, frame, scene);
          if (noise) drawNoise(ctx, frameInputs, noise);
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boundary + 0.5, 0);
        ctx.lineTo(boundary + 0.5, height);
        ctx.stroke();
        ctx.restore();
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
