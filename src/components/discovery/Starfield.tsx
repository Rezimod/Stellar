/**
 * Pure-CSS starfield — no canvas, no rAF, no JS at runtime.
 *
 * Positions come from a seeded PRNG evaluated at module load, so the server and
 * the client generate byte-identical markup (Math.random() here would hydrate
 * with a mismatch on every field).
 *
 * Three depth layers: distant dots stay dim and twinkle slowly, near dots are
 * larger, brighter and faster. That parallax-by-timing is what keeps a static
 * field from reading as noise.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Layer = {
  count: number;
  size: [number, number];
  dim: [number, number];
  bright: [number, number];
  duration: [number, number];
};

const LAYERS: Layer[] = [
  { count: 70, size: [1, 1.6], dim: [0.1, 0.22], bright: [0.4, 0.62], duration: [5.5, 9] },
  { count: 38, size: [1.6, 2.3], dim: [0.16, 0.3], bright: [0.6, 0.85], duration: [3.6, 6] },
  { count: 14, size: [2.3, 3.2], dim: [0.24, 0.4], bright: [0.85, 1], duration: [2.4, 4] },
];

type Star = {
  top: number;
  left: number;
  size: number;
  dim: number;
  bright: number;
  duration: number;
  delay: number;
  accent: boolean;
};

const STARS: Star[] = (() => {
  const rand = mulberry32(0x5731_11a2);
  const span = ([lo, hi]: [number, number]) => lo + rand() * (hi - lo);

  return LAYERS.flatMap((layer) =>
    Array.from({ length: layer.count }, (): Star => ({
      top: rand() * 100,
      left: rand() * 100,
      size: span(layer.size),
      dim: span(layer.dim),
      bright: span(layer.bright),
      duration: span(layer.duration),
      delay: rand() * 6,
      // ~1 in 9 picks up the cyan accent.
      accent: rand() < 0.11,
    })),
  );
})();

export default function Starfield() {
  return (
    <div className="dsc-starfield" aria-hidden="true">
      {STARS.map((s, i) => (
        <span
          key={i}
          className={s.accent ? 'dsc-star dsc-star--accent' : 'dsc-star'}
          style={
            {
              top: `${s.top.toFixed(3)}%`,
              left: `${s.left.toFixed(3)}%`,
              width: `${s.size.toFixed(2)}px`,
              height: `${s.size.toFixed(2)}px`,
              '--dsc-dim': s.dim.toFixed(3),
              '--dsc-bright': s.bright.toFixed(3),
              '--dsc-dur': `${s.duration.toFixed(2)}s`,
              '--dsc-delay': `${s.delay.toFixed(2)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
