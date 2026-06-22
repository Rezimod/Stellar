import type { CSSProperties } from 'react';

// Real NASA/observatory photography for each target, framed on black space.
// Default: cover-cropped inside a circular orb. `raw` mode (see below) uses the
// alpha-cut PNG instead so the bare body floats frameless. The orb fills its
// parent, so callers size it via the wrapper (.mis-quest-art, .mis-nearby-art, …).
const ORB_SRC: Record<string, string> = {
  moon: '/images/planets/moon.jpg',
  mercury: '/images/planets/mercury.jpg',
  venus: '/images/planets/venus.jpg',
  mars: '/images/planets/mars.jpg',
  jupiter: '/images/planets/jupiter.jpg',
  saturn: '/images/planets/saturn.jpg',
  uranus: '/images/planets/uranus.jpg',
  neptune: '/images/planets/neptune.jpg',
  earth: '/images/planets/earth.jpg',
  pleiades: '/images/dso/m45.jpg',
  orion: '/images/dso/m42.jpg',
  andromeda: '/images/dso/m31.jpg',
  crab: '/images/dso/m1.jpg',
};

// `raw` swaps to the alpha-cut PNG (black space removed) and drops the circular
// frame, so the bare planet — Saturn's rings and all — floats on the card.
export function SkyOrb({ name, fit, raw }: { name: string; fit?: 'cover' | 'contain'; raw?: boolean }) {
  const key = name.toLowerCase();
  const base = ORB_SRC[key];
  if (!base) return <span className={`sky-orb sky-orb--blank${raw ? ' sky-orb--raw' : ''}`} aria-hidden />;
  const src = raw ? base.replace('.jpg', '.png') : base;
  const style: CSSProperties = { objectFit: fit ?? (raw ? 'contain' : 'cover') };
  return (
    <span className={`sky-orb${raw ? ' sky-orb--raw' : ''}`} aria-hidden>
      <img src={src} alt="" loading="lazy" decoding="async" style={style} />
    </span>
  );
}
