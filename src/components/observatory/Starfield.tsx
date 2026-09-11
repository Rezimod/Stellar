/**
 * The ground every observatory page sits on: a fixed field of faint stars.
 *
 * Drawn once, deterministically, as an SVG — a few hundred points at seeded
 * positions, so the field is identical on the server and in the browser and
 * costs nothing to animate because it does not. It is a ground, not a picture:
 * the photographs on top of it are the bright things.
 */

const COUNT = 320;

/** mulberry32 — small, seeded, and the same on every render. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const next = rng(41715);
const STARS = Array.from({ length: COUNT }, () => {
  const x = +(next() * 100).toFixed(2);
  const y = +(next() * 100).toFixed(2);
  const m = next();
  // Most stars are faint; a handful are not.
  const r = m > 0.96 ? 0.09 : m > 0.8 ? 0.06 : 0.04;
  const o = m > 0.96 ? 0.9 : m > 0.8 ? 0.6 : 0.35;
  return { x, y, r, o };
});

export default function Starfield() {
  return (
    <svg
      className="obs-stars"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="currentColor" opacity={s.o} />
      ))}
    </svg>
  );
}
