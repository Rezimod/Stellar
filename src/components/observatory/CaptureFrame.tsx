'use client';

import { useEffect, useRef } from 'react';
import {
  drawNoise,
  drawScene,
  makeNoiseTile,
  type FrameInputs,
} from '@/lib/observatory/render';
import type { FrameRecipe } from '@/lib/observatory/gallery';

/**
 * One stored capture, redrawn.
 *
 * A still, not a loop: the mission has ended, so there is nothing left to
 * animate and an animated thumbnail would only claim otherwise. The draw runs
 * once per recipe and once more if the reference photo arrives late.
 */
export default function CaptureFrame({
  recipe,
  alt,
  className,
}: {
  recipe: FrameRecipe;
  alt: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.clientWidth || 320;
    const height = Math.round(width * 0.5625);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // A finished capture is a centred one: the mission only reaches CAPTURING
    // after the target has been walked into the middle of the frame.
    const inputs: FrameInputs = { ...recipe, width, height, centeringOffset: 0 };
    const noise = makeNoiseTile();

    let cancelled = false;
    const paint = (image: HTMLImageElement | null) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, inputs, 0, {
        image,
        showFieldStars: recipe.showFieldStars,
        showTarget: true,
      });
      drawNoise(ctx, inputs, noise);
    };

    // The sky is drawn immediately so the card is never blank; the target
    // lands on top of it when its reference photo has decoded.
    paint(null);

    const image = new Image();
    image.decoding = 'async';
    image.src = recipe.photoSrc;
    image.onload = () => paint(image);

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [recipe]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
      style={{ display: 'block', width: '100%', aspectRatio: '16 / 9' }}
    />
  );
}
