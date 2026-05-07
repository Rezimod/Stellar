'use client';

/**
 * Live cosmic orrery with real NASA-style equirectangular planet textures.
 * Each planet wraps a tiled texture inside a clipping circle and translates
 * horizontally to simulate axial rotation. Orbits run at proportional speeds.
 *
 * Textures: solarsystemscope.com (CC BY 4.0) via Wikimedia Commons.
 */

import { useEffect, useRef, useState } from 'react';

const CX = 240;
const CY = 240;

type Planet = {
  key: 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
  body: number;       // planet radius in svg units
  orbit: number;      // distance from sun
  period: number;     // orbital period (seconds)
  phase: number;      // starting angle (degrees)
  spin: number;       // axial rotation period (seconds)
  retrograde?: boolean;
  glow?: string;      // atmosphere tint
  rings?: boolean;
};

const PLANETS: Planet[] = [
  { key: 'mercury', body: 2.8,  orbit:  34, period:  8, phase:  20, spin: 32 },
  { key: 'venus',   body: 3.8,  orbit:  56, period: 14, phase: 130, spin: 50, retrograde: true, glow: '#E8C77C' },
  { key: 'earth',   body: 4.0,  orbit:  80, period: 20, phase: 245, spin: 8,  glow: '#5C8FCC' },
  { key: 'mars',    body: 3.2,  orbit: 104, period: 28, phase:  60, spin: 8.2 },
  { key: 'jupiter', body: 8.4,  orbit: 138, period: 46, phase: 290, spin: 3.6 },
  { key: 'saturn',  body: 7.4,  orbit: 174, period: 72, phase: 200, spin: 4,  rings: true },
  { key: 'uranus',  body: 5.4,  orbit: 204, period: 110, phase:  85, spin: 6, retrograde: true, glow: '#A8E0E8' },
  { key: 'neptune', body: 5.2,  orbit: 232, period: 150, phase: 320, spin: 5.6, glow: '#5577CC' },
];

const STARS: { cx: number; cy: number; r: number; o: number; d: number }[] = [
  { cx:  28, cy:  44, r: 0.8, o: 0.65, d: 0.0 },
  { cx: 444, cy:  68, r: 0.7, o: 0.6,  d: 1.4 },
  { cx: 130, cy:  18, r: 0.5, o: 0.5,  d: 2.7 },
  { cx: 372, cy:  18, r: 0.5, o: 0.45, d: 0.9 },
  { cx: 462, cy: 196, r: 0.7, o: 0.6,  d: 2.1 },
  { cx:  18, cy: 224, r: 0.6, o: 0.5,  d: 3.4 },
  { cx: 240, cy:  10, r: 0.4, o: 0.4,  d: 1.8 },
  { cx: 196, cy: 460, r: 0.5, o: 0.45, d: 0.4 },
  { cx:  44, cy: 392, r: 0.7, o: 0.55, d: 2.5 },
  { cx: 442, cy: 412, r: 0.5, o: 0.45, d: 1.1 },
  { cx: 460, cy: 312, r: 0.4, o: 0.4,  d: 2.3 },
  { cx:  20, cy: 332, r: 0.5, o: 0.45, d: 1.6 },
  { cx: 320, cy: 460, r: 0.5, o: 0.45, d: 2.9 },
  { cx:  64, cy: 112, r: 0.4, o: 0.4,  d: 0.2 },
  { cx:  88, cy:  72, r: 0.5, o: 0.45, d: 3.1 },
  { cx: 388, cy: 100, r: 0.4, o: 0.35, d: 1.2 },
  { cx: 296, cy:  36, r: 0.5, o: 0.4,  d: 0.6 },
  { cx: 412, cy: 256, r: 0.6, o: 0.5,  d: 2.8 },
  { cx:  72, cy: 264, r: 0.4, o: 0.35, d: 0.8 },
  { cx: 354, cy: 442, r: 0.6, o: 0.45, d: 1.7 },
  { cx: 124, cy: 432, r: 0.5, o: 0.4,  d: 3.3 },
  { cx: 256, cy: 442, r: 0.4, o: 0.35, d: 0.5 },
];

// Deterministic asteroid field between Mars (orbit 104) and Jupiter (orbit 138).
// Pre-computed once so it's stable across renders.
const ASTEROIDS = Array.from({ length: 42 }, (_, i) => {
  const baseAngle = (i / 42) * Math.PI * 2;
  const angleJit = Math.sin(i * 11.37) * 0.09;
  const radJit = Math.cos(i * 7.71) * 6.5;
  const angle = baseAngle + angleJit;
  const r = 121 + radJit;
  return {
    cx: CX + r * Math.cos(angle),
    cy: CY + r * Math.sin(angle),
    size: 0.35 + Math.abs(Math.sin(i * 4.13)) * 0.55,
    op: 0.28 + Math.abs(Math.cos(i * 2.71)) * 0.32,
  };
});

// Comet — its own orbit between Saturn (174) and Uranus (204), faster than Saturn
// to read as a transient visitor. Tail always points away from the sun in local coords.
const COMET = { orbit: 192, period: 22, phase: 35, tailLen: 28 };

// Sun rendering constants
const SUN_R = 16;
const SUN_SPIN = 60;

export default function HeroSkyPanel() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(true);

  // Pause CSS animations when the orrery scrolls off-screen — saves
  // GPU/battery on long pages, especially on mobile.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? true),
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-[560px] md:max-w-[720px] lg:max-w-[820px] mx-auto select-none"
      data-paused={!visible}
    >
      <style jsx>{`
        [data-paused='true'] :global(.orbit),
        [data-paused='true'] :global(.spin),
        [data-paused='true'] :global(.spin-rev),
        [data-paused='true'] :global(.corona),
        [data-paused='true'] :global(.star) {
          animation-play-state: paused !important;
        }
      `}</style>
      <style jsx>{`
        @keyframes orrery-orbit {
          from { transform: rotate(var(--from, 0deg)); }
          to   { transform: rotate(calc(var(--from, 0deg) + 360deg)); }
        }
        @keyframes orrery-spin {
          from { transform: translateX(0); }
          to   { transform: translateX(var(--spin-dist)); }
        }
        @keyframes orrery-spin-rev {
          from { transform: translateX(var(--spin-dist)); }
          to   { transform: translateX(0); }
        }
        @keyframes orrery-corona {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.06); }
        }
        @keyframes orrery-twinkle {
          0%, 100% { opacity: var(--o, 0.5); }
          50%      { opacity: calc(var(--o, 0.5) * 0.4); }
        }

        .orbit {
          animation: orrery-orbit linear infinite;
          transform-origin: ${CX}px ${CY}px;
          transform-box: view-box;
        }
        .spin     { animation: orrery-spin     linear infinite; }
        .spin-rev { animation: orrery-spin-rev linear infinite; }

        .corona { animation: orrery-corona 5s ease-in-out infinite; transform-origin: ${CX}px ${CY}px; transform-box: view-box; }
        .star   { animation: orrery-twinkle 5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .orbit, .spin, .spin-rev, .corona, .star { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 480 480" className="w-full h-auto block" fill="none">
        <defs>
          {/* nebula tint behind sun */}
          <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2A1A4A" stopOpacity="0.5" />
            <stop offset="40%"  stopColor="#1A1430" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </radialGradient>
          {/* sun corona */}
          <radialGradient id="sun-corona" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFD166" stopOpacity="0" />
            <stop offset="55%"  stopColor="#FFD166" stopOpacity="0.18" />
            <stop offset="80%"  stopColor="#FF9933" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
          </radialGradient>
          {/* limb darkening — applied to each planet for spherical depth */}
          <radialGradient id="limb" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="85%" stopColor="#000000" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
          </radialGradient>
          {/* atmospheric glow for Earth/Venus */}
          <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
            <stop offset="80%"  stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="92%"  stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          {/* saturn ring bands — fade at edges so the ring "recedes" into space */}
          <linearGradient id="ring-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#8A6D45" stopOpacity="0" />
            <stop offset="18%"  stopColor="#B8945C" stopOpacity="0.7" />
            <stop offset="50%"  stopColor="#D9B886" stopOpacity="0.95" />
            <stop offset="82%"  stopColor="#B8945C" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8A6D45" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ring-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#A88656" stopOpacity="0" />
            <stop offset="15%"  stopColor="#E0C088" stopOpacity="0.85" />
            <stop offset="50%"  stopColor="#F2DDB0" stopOpacity="1" />
            <stop offset="85%"  stopColor="#E0C088" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#A88656" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ring-c" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6B563A" stopOpacity="0" />
            <stop offset="22%"  stopColor="#8E7551" stopOpacity="0.45" />
            <stop offset="50%"  stopColor="#A38863" stopOpacity="0.55" />
            <stop offset="78%"  stopColor="#8E7551" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6B563A" stopOpacity="0" />
          </linearGradient>
          {/* comet tail — bright at head, fading along the trail */}
          <linearGradient id="comet-tail" x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%"   stopColor="#E8F2FF" stopOpacity="0.9" />
            <stop offset="35%"  stopColor="#9CC4FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#9CC4FF" stopOpacity="0" />
          </linearGradient>
          {/* comet head soft halo */}
          <radialGradient id="comet-head" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="55%"  stopColor="#5EEAD4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#9CC4FF" stopOpacity="0" />
          </radialGradient>

          {/* clip paths — one per planet, anchored at (0,0) so they
              translate with the planet's parent group */}
          {PLANETS.map((p) => (
            <clipPath key={p.key} id={`clip-${p.key}`} clipPathUnits="userSpaceOnUse">
              <circle cx="0" cy="0" r={p.body} />
            </clipPath>
          ))}
          <clipPath id="clip-sun" clipPathUnits="userSpaceOnUse">
            <circle cx={CX} cy={CY} r={SUN_R} />
          </clipPath>
          {/* saturn ring half-clips */}
          <clipPath id="ring-back" clipPathUnits="userSpaceOnUse">
            <rect x="-40" y="-20" width="80" height="20" />
          </clipPath>
          <clipPath id="ring-front" clipPathUnits="userSpaceOnUse">
            <rect x="-40" y="0" width="80" height="20" />
          </clipPath>
        </defs>

        {/* deep nebula glow */}
        <circle cx={CX} cy={CY} r="240" fill="url(#nebula)" />

        {/* background stars */}
        <g fill="#FFFFFF">
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              className="star"
              style={{
                ['--o' as string]: s.o,
                animationDelay: `${s.d}s`,
              } as React.CSSProperties}
            />
          ))}
        </g>

        {/* orbital paths */}
        <g stroke="#1F2740" fill="none" strokeWidth="0.6" strokeDasharray="1.5 4">
          {PLANETS.map((p) => (
            <circle key={p.key} cx={CX} cy={CY} r={p.orbit} />
          ))}
        </g>

        {/* asteroid belt — single rotating group, drifts slowly */}
        <g
          className="orbit"
          style={{
            ['--from' as string]: '0deg',
            animationDuration: '110s',
          } as React.CSSProperties}
        >
          {ASTEROIDS.map((a, i) => (
            <circle
              key={i}
              cx={a.cx}
              cy={a.cy}
              r={a.size}
              fill="#9099AD"
              opacity={a.op}
            />
          ))}
        </g>

        {/* ═══════════════ SUN ═══════════════ */}
        {/* corona pulse */}
        <circle cx={CX} cy={CY} r={SUN_R * 2.6} fill="url(#sun-corona)" className="corona" />
        {/* textured photosphere */}
        <g clipPath="url(#clip-sun)">
          <g
            className="spin"
            style={{
              ['--spin-dist' as string]: `${-4 * SUN_R}px`,
              animationDuration: `${SUN_SPIN}s`,
              transformBox: 'view-box',
              transformOrigin: `${CX}px ${CY}px`,
            } as React.CSSProperties}
          >
            <image
              href="/hero/planets/sun.jpg"
              x={CX - 2 * SUN_R}
              y={CY - SUN_R}
              width={4 * SUN_R}
              height={2 * SUN_R}
              preserveAspectRatio="none"
            />
            <image
              href="/hero/planets/sun.jpg"
              x={CX + 2 * SUN_R}
              y={CY - SUN_R}
              width={4 * SUN_R}
              height={2 * SUN_R}
              preserveAspectRatio="none"
            />
          </g>
        </g>
        {/* sun edge tint — warm rim */}
        <circle cx={CX} cy={CY} r={SUN_R} fill="none" stroke="#FFD166" strokeWidth="0.8" strokeOpacity="0.35" />
        <circle cx={CX} cy={CY} r={SUN_R + 0.5} fill="none" stroke="#FF9933" strokeWidth="0.6" strokeOpacity="0.22" />

        {/* ═══════════════ PLANETS ═══════════════ */}
        {PLANETS.map((p) => {
          const r = p.body;
          const W = 4 * r;
          const H = 2 * r;
          return (
            <g
              key={p.key}
              className="orbit"
              style={{
                ['--from' as string]: `${p.phase}deg`,
                animationDuration: `${p.period}s`,
              } as React.CSSProperties}
            >
              <g transform={`translate(${CX + p.orbit} ${CY})`}>
                {/* atmospheric outer glow (Venus, Earth) */}
                {p.glow && (
                  <circle cx="0" cy="0" r={r + 1.6} fill="url(#atmo)" />
                )}

                {/* SATURN — back half of rings (rendered before body) */}
                {p.rings && (
                  <g transform="rotate(-22)" clipPath="url(#ring-back)" opacity="0.85">
                    {/* C ring (innermost, dim) */}
                    <ellipse cx="0" cy="0" rx={r * 1.42} ry={r * 0.38} stroke="url(#ring-c)" strokeWidth="0.7" fill="none" />
                    {/* B ring (brightest, widest) */}
                    <ellipse cx="0" cy="0" rx={r * 1.74} ry={r * 0.46} stroke="url(#ring-b)" strokeWidth="1.7" fill="none" />
                    {/* A ring (outer) */}
                    <ellipse cx="0" cy="0" rx={r * 2.08} ry={r * 0.55} stroke="url(#ring-a)" strokeWidth="1.0" fill="none" />
                  </g>
                )}

                {/* textured body */}
                <g clipPath={`url(#clip-${p.key})`}>
                  <g
                    className={p.retrograde ? 'spin-rev' : 'spin'}
                    style={{
                      ['--spin-dist' as string]: `${-W}px`,
                      animationDuration: `${p.spin}s`,
                    } as React.CSSProperties}
                  >
                    <image
                      href={`/hero/planets/${p.key}.jpg`}
                      x={-2 * r}
                      y={-r}
                      width={W}
                      height={H}
                      preserveAspectRatio="none"
                    />
                    <image
                      href={`/hero/planets/${p.key}.jpg`}
                      x={2 * r}
                      y={-r}
                      width={W}
                      height={H}
                      preserveAspectRatio="none"
                    />
                  </g>
                </g>

                {/* limb darkening for spherical depth */}
                <circle cx="0" cy="0" r={r} fill="url(#limb)" />

                {/* SATURN — front half of rings */}
                {p.rings && (
                  <g transform="rotate(-22)" clipPath="url(#ring-front)">
                    {/* C ring (innermost, dim) */}
                    <ellipse cx="0" cy="0" rx={r * 1.42} ry={r * 0.38} stroke="url(#ring-c)" strokeWidth="0.8" fill="none" />
                    {/* B ring (brightest) */}
                    <ellipse cx="0" cy="0" rx={r * 1.74} ry={r * 0.46} stroke="url(#ring-b)" strokeWidth="1.9" fill="none" />
                    {/* A ring */}
                    <ellipse cx="0" cy="0" rx={r * 2.08} ry={r * 0.55} stroke="url(#ring-a)" strokeWidth="1.15" fill="none" />
                    {/* Cassini Division (gap between B and A) */}
                    <ellipse cx="0" cy="0" rx={r * 1.92} ry={r * 0.51} stroke="#0A0E1A" strokeWidth="0.55" fill="none" />
                    {/* Encke Gap (faint dark line in A) */}
                    <ellipse cx="0" cy="0" rx={r * 2.04} ry={r * 0.54} stroke="#0A1735" strokeWidth="0.25" fill="none" opacity="0.7" />
                  </g>
                )}

                {/* EARTH — tiny moon (SMIL rotation around Earth's center) */}
                {p.key === 'earth' && (
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="5s"
                      repeatCount="indefinite"
                    />
                    <circle cx={r * 2.4} cy="0" r="1.1" fill="#C8C8D0" />
                  </g>
                )}
              </g>
            </g>
          );
        })}

        {/* ═══════════════ COMET ═══════════════ */}
        <g
          className="orbit"
          style={{
            ['--from' as string]: `${COMET.phase}deg`,
            animationDuration: `${COMET.period}s`,
          } as React.CSSProperties}
        >
          <g transform={`translate(${CX + COMET.orbit} ${CY})`}>
            {/* tail — fades from head outward (away from sun in local +x) */}
            <path
              d={`M 0 0 L ${COMET.tailLen} -0.7 L ${COMET.tailLen} 0.7 Z`}
              fill="url(#comet-tail)"
            />
            {/* outer halo */}
            <circle cx="0" cy="0" r="3.2" fill="url(#comet-head)" />
            {/* hot core */}
            <circle cx="0" cy="0" r="1.1" fill="#FFFFFF" />
          </g>
        </g>

      </svg>
    </div>
  );
}
