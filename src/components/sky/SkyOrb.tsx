import type { CSSProperties } from 'react';

// Real NASA/observatory photography for each target. All are framed on a black
// space background, so `mix-blend-mode: screen` (set in CSS) drops the black and
// floats the body — rings, moons, nebulosity and all — onto the dark cards with
// no hard edges. The orb fills its parent container, so callers size it by sizing
// the wrapper (.mis-quest-art, .mis-nearby-art, .mis-row-art, …).
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

export function SkyOrb({ name, fit }: { name: string; fit?: 'cover' | 'contain' }) {
  const key = name.toLowerCase();
  const src = ORB_SRC[key];
  if (!src) return <span className="sky-orb sky-orb--blank" aria-hidden />;
  const style: CSSProperties = { objectFit: fit ?? 'cover' };
  return (
    <span className="sky-orb" aria-hidden>
      <img src={src} alt="" loading="lazy" decoding="async" style={style} />
    </span>
  );
}
