// Imported before anything else in the page bundle: the ring strip and the
// ring particles draw from Math.random, so a card render replaces it with a
// fixed-seed generator to come out the same every time.
declare global {
  interface Window {
    __CARD__?: unknown;
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cfg = window.__CARD__ as { seed?: number } | undefined;
Math.random = mulberry32(cfg?.seed ?? 1);

export {};
