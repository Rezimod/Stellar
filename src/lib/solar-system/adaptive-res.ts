// Both 3D scenes are fill-rate bound: frame time tracks the pixel count almost
// exactly (measured on an Intel Iris Plus 640 — 0.26 Mpx 17 ms, 1.0 Mpx 31 ms,
// 3.1 Mpx 81 ms). A Retina laptop asks for the top of that range and gets
// fifteen frames a second, which is the "slow and laggy" everyone reports.
//
// So the renderer stops asking for a fixed resolution. It starts at the device
// ratio and steps down through these factors until the frame lands inside its
// budget, then climbs back the moment there is headroom. The steps are coarse
// and the cooldown long, so it settles instead of pumping.

const STEPS = [1, 0.85, 0.72, 0.6, 0.5];
/** Never render below three quarters of a CSS pixel — past that it is mush. */
const MIN_RATIO = 0.75;
/** Step down above this frame time (~41 fps), up below this one (~75 fps). */
const SLOW = 0.024;
const FAST = 0.0133;
const WINDOW = 30;
const COOLDOWN = 2;

export interface AdaptiveRes {
  /** Call once per rendered frame with the frame's delta in seconds. */
  tick: (dtSec: number) => void;
}

/** `apply` receives the pixel ratio to render at; it owns setSize/setPixelRatio. */
export function makeAdaptiveRes(maxRatio: number, apply: (ratio: number) => void): AdaptiveRes {
  const at = (i: number) => Math.max(MIN_RATIO, maxRatio * STEPS[i]);
  let step = 0;
  let acc = 0;
  let frames = 0;
  let cooldown = COOLDOWN;
  apply(at(0));
  return {
    tick(dtSec) {
      cooldown -= dtSec;
      // A frame lost to a tab switch or a texture upload is not a verdict on
      // the resolution, so it does not count.
      if (dtSec > 0.2) return;
      acc += dtSec;
      frames += 1;
      if (frames < WINDOW) return;
      const avg = acc / frames;
      acc = 0;
      frames = 0;
      if (cooldown > 0) return;
      const next = Math.max(0, Math.min(STEPS.length - 1, avg > SLOW ? step + 1 : avg < FAST ? step - 1 : step));
      if (next === step || at(next) === at(step)) return;
      step = next;
      cooldown = COOLDOWN;
      apply(at(step));
    },
  };
}
