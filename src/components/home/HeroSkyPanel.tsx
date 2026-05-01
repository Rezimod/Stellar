'use client';

/**
 * Hero scene — a refractor on a tripod, aimed at the Andromeda Galaxy.
 * A photon travels down the sight line from M31 to the eyepiece every
 * cycle, telling the "ancient light, modern instrument" story.
 *
 * Andromeda is rendered as stacked elliptical layers (halo / mid-disk /
 * core) with a curved dust lane and the M32 + M110 satellite galaxies.
 * The telescope is a solid silhouette with brass accents — no line art.
 */

const STARS: { cx: number; cy: number; r: number; o: number; d: number }[] = [
  { cx:  40, cy:  44, r: 0.8, o: 0.7,  d: 0.0 },
  { cx: 392, cy:  68, r: 0.7, o: 0.6,  d: 1.4 },
  { cx: 320, cy:  32, r: 0.5, o: 0.5,  d: 2.7 },
  { cx:  90, cy: 102, r: 0.5, o: 0.45, d: 0.9 },
  { cx: 422, cy: 156, r: 0.7, o: 0.6,  d: 2.1 },
  { cx:  30, cy: 224, r: 0.6, o: 0.5,  d: 3.4 },
  { cx: 248, cy:  18, r: 0.4, o: 0.4,  d: 1.8 },
  { cx: 184, cy: 320, r: 0.5, o: 0.45, d: 0.4 },
  { cx:  80, cy: 392, r: 0.7, o: 0.55, d: 2.5 },
  { cx: 432, cy: 372, r: 0.6, o: 0.5,  d: 1.1 },
  { cx: 444, cy:  18, r: 0.5, o: 0.45, d: 3.0 },
  { cx:  18, cy: 132, r: 0.4, o: 0.4,  d: 0.7 },
  { cx: 380, cy: 240, r: 0.4, o: 0.4,  d: 2.3 },
  { cx: 142, cy: 388, r: 0.5, o: 0.45, d: 1.6 },
];

export default function HeroSkyPanel() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      <style jsx>{`
        @keyframes hero-twinkle {
          0%, 100% { opacity: var(--o, 0.5); }
          50%      { opacity: calc(var(--o, 0.5) * 0.35); }
        }
        @keyframes hero-track {
          0%, 100% { transform: rotate(-44.5deg); }
          50%      { transform: rotate(-45.5deg); }
        }
        @keyframes hero-rotate-galaxy {
          from { transform: rotate(-22deg); }
          to   { transform: rotate(-23deg); }
        }
        @keyframes hero-photon {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(353px, 343px); opacity: 0; }
        }
        @keyframes hero-photon-trail {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          12%  { opacity: 0.5; }
          92%  { opacity: 0.5; }
          100% { transform: translate(353px, 343px); opacity: 0; }
        }
        @keyframes hero-reticle {
          0%, 88%, 100% { opacity: 0.5; }
          92%, 96%      { opacity: 1; }
        }
        @keyframes hero-pulse-core {
          0%, 100% { opacity: 0.95; }
          50%      { opacity: 0.78; }
        }

        .star    { animation: hero-twinkle 5s ease-in-out infinite; }
        .scope   { animation: hero-track   8s ease-in-out infinite;
                   transform-origin: 360px 388px; transform-box: view-box; }
        .galaxy  { animation: hero-rotate-galaxy 90s ease-in-out infinite alternate;
                   transform-origin: 150px 168px; transform-box: view-box; }
        .photon  { animation: hero-photon 6s ease-in infinite;
                   transform-box: view-box; }
        .photon-trail-a { animation: hero-photon-trail 6s ease-in infinite;
                          animation-delay: 0.3s; transform-box: view-box; }
        .photon-trail-b { animation: hero-photon-trail 6s ease-in infinite;
                          animation-delay: 0.6s; transform-box: view-box; }
        .reticle { animation: hero-reticle 4s ease-in-out infinite; }
        .core    { animation: hero-pulse-core 7s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .star, .scope, .galaxy, .photon,
          .photon-trail-a, .photon-trail-b,
          .reticle, .core { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 480 480" className="w-full h-auto block" fill="none">
        <defs>
          {/* Andromeda — core, halo, faint outer */}
          <radialGradient id="m31-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFF6DC" stopOpacity="1" />
            <stop offset="35%"  stopColor="#F2DDA4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F2DDA4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-mid" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E6CC95" stopOpacity="0.55" />
            <stop offset="55%"  stopColor="#B89868" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8A6F4A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#9C8460" stopOpacity="0.22" />
            <stop offset="60%"  stopColor="#6B5A40" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#6B5A40" stopOpacity="0" />
          </radialGradient>

          {/* Telescope tube body — subtle vertical highlight */}
          <linearGradient id="tube-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0E131F" />
            <stop offset="40%"  stopColor="#1B2334" />
            <stop offset="55%"  stopColor="#222A3F" />
            <stop offset="100%" stopColor="#0E131F" />
          </linearGradient>
          <linearGradient id="tripod-leg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2A3148" />
            <stop offset="100%" stopColor="#11172A" />
          </linearGradient>

          <clipPath id="galaxy-clip">
            <ellipse cx="0" cy="0" rx="170" ry="44" />
          </clipPath>
        </defs>

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

        {/* faint horizon */}
        <line x1="20" y1="448" x2="460" y2="448" stroke="#1B2238" strokeWidth="1" strokeDasharray="2 6" opacity="0.6" />

        {/* sight line — eyepiece → galaxy */}
        <line
          x1="151" y1="170"
          x2="352" y2="342"
          stroke="#FFD166"
          strokeWidth="0.8"
          strokeDasharray="2 5"
          strokeOpacity="0.32"
        />

        {/* Andromeda galaxy */}
        <g className="galaxy">
          <g transform="translate(150 168)">
            {/* outer halo */}
            <ellipse cx="0" cy="0" rx="170" ry="44" fill="url(#m31-halo)" />
            {/* mid disk */}
            <ellipse cx="0" cy="0" rx="138" ry="34" fill="url(#m31-mid)" />
            <ellipse cx="0" cy="0" rx="100" ry="24" fill="url(#m31-mid)" opacity="0.65" />

            {/* dust lane — faint dark arc on the southern edge */}
            <g clipPath="url(#galaxy-clip)" opacity="0.55">
              <path
                d="M -150 8 Q -70 22 0 18 Q 70 14 150 6"
                stroke="#0A0E1A"
                strokeWidth="3.5"
                strokeOpacity="0.55"
                fill="none"
              />
              <path
                d="M -150 8 Q -70 22 0 18 Q 70 14 150 6"
                stroke="#0A0E1A"
                strokeWidth="1.6"
                strokeOpacity="0.7"
                fill="none"
              />
            </g>

            {/* inner bulge */}
            <ellipse cx="0" cy="0" rx="42" ry="14" fill="url(#m31-core)" opacity="0.85" />
            <ellipse cx="0" cy="0" rx="22" ry="9" fill="url(#m31-core)" />
            {/* very bright nucleus */}
            <circle cx="0" cy="0" r="3.2" fill="#FFFAEC" className="core" />
            <circle cx="0" cy="0" r="6"   fill="#FFF6DC" opacity="0.35" />

            {/* M32 — small bright satellite, lower-right of core */}
            <circle cx="44" cy="20" r="2.6" fill="#F2DDA4" />
            <circle cx="44" cy="20" r="5"   fill="#F2DDA4" opacity="0.18" />

            {/* M110 — fainter, larger, upper-left */}
            <ellipse cx="-58" cy="-22" rx="9" ry="4" fill="#C9AC78" opacity="0.45" transform="rotate(-12 -58 -22)" />
            <ellipse cx="-58" cy="-22" rx="5" ry="2.4" fill="#E0C28E" opacity="0.6" transform="rotate(-12 -58 -22)" />

            {/* reticle — corner brackets framing the core */}
            <g className="reticle" stroke="#FFD166" strokeWidth="0.9" strokeOpacity="0.5">
              <path d="M -30 -14 L -36 -14 L -36 -8" />
              <path d="M  30 -14 L  36 -14 L  36 -8" />
              <path d="M -30  14 L -36  14 L -36  8" />
              <path d="M  30  14 L  36  14 L  36  8" />
            </g>
          </g>
        </g>

        {/* M31 label — outside the galaxy, mono */}
        <g style={{ fontFamily: 'var(--font-mono)' }}>
          <line x1="280" y1="118" x2="296" y2="106" stroke="#3A4256" strokeWidth="1" strokeOpacity="0.7" />
          <text x="300" y="100" fontSize="9" fill="#6B7280" letterSpacing="0.22em">M31</text>
          <text x="300" y="114" fontSize="9" fill="#9BA3B4" letterSpacing="0.14em">ANDROMEDA</text>
          <text x="300" y="126" fontSize="8" fill="#4A5269" letterSpacing="0.18em">2.5 Mly · MAG 3.4</text>
        </g>

        {/* photon trail — three particles staggered along the sight line */}
        <circle r="1.4" cx="0" cy="0" fill="#FFD166" opacity="0.6" className="photon-trail-b" />
        <circle r="1.8" cx="0" cy="0" fill="#FFD166" opacity="0.75" className="photon-trail-a" />
        <circle r="2.3" cx="0" cy="0" fill="#FFE4A0" className="photon" />

        {/* Telescope */}
        <g>
          {/* tripod legs */}
          <path d="M 322 448 L 360 392" stroke="url(#tripod-leg)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 398 448 L 360 392" stroke="url(#tripod-leg)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 360 460 L 360 392" stroke="url(#tripod-leg)" strokeWidth="3" strokeLinecap="round" />
          {/* tripod feet caps */}
          <circle cx="322" cy="448" r="2.2" fill="#1B2238" />
          <circle cx="398" cy="448" r="2.2" fill="#1B2238" />
          <circle cx="360" cy="460" r="2.2" fill="#1B2238" />

          {/* mount head */}
          <rect x="346" y="380" width="28" height="14" rx="2" fill="#1B2238" />
          <circle cx="360" cy="388" r="6" fill="#22293F" stroke="#3A4256" strokeWidth="0.8" />
          <circle cx="360" cy="388" r="2" fill="#FFD166" opacity="0.7" />

          {/* tube — pointed at Andromeda (tracks ±0.5° around mount) */}
          <g className="scope">
            {/* counterweight bar */}
            <line
              x1="360" y1="388"
              x2="384" y2="412"
              stroke="#2A3148" strokeWidth="2" strokeLinecap="round"
            />
            <circle cx="386" cy="414" r="4.5" fill="#11172A" stroke="#3A4256" strokeWidth="0.8" />

            {/* main tube — long thin rectangle, rotated -45 from vertical to face up-left */}
            <g transform="rotate(-45 360 388)">
              {/* tube */}
              <rect x="354" y="270" width="12" height="118" rx="3.5" fill="url(#tube-body)" />
              {/* tube bands */}
              <rect x="352" y="282" width="16" height="4" fill="#0A0E1A" />
              <rect x="352" y="370" width="16" height="4" fill="#0A0E1A" />
              {/* dew shield */}
              <rect x="352" y="262" width="16" height="14" rx="2" fill="#0A0E1A" />
              {/* objective lens — brass rim */}
              <circle cx="360" cy="262" r="9" fill="#06080F" stroke="#FFD166" strokeWidth="1.4" />
              <circle cx="360" cy="262" r="6" fill="none" stroke="#FFD166" strokeWidth="0.6" strokeOpacity="0.5" />

              {/* focuser drawtube */}
              <rect x="368" y="350" width="12" height="6" fill="#11172A" stroke="#3A4256" strokeWidth="0.7" />
              {/* eyepiece */}
              <rect x="380" y="348" width="4" height="10" fill="#1B2238" stroke="#FFD166" strokeWidth="0.6" />
              <rect x="384" y="346" width="2" height="14" fill="#0A0E1A" />

              {/* finder scope */}
              <rect x="343" y="300" width="6" height="44" rx="1.5" fill="#0E131F" stroke="#2A3148" strokeWidth="0.6" />
              <circle cx="346" cy="300" r="2.4" fill="#06080F" stroke="#FFD166" strokeWidth="0.6" />
              {/* finder mount brackets */}
              <rect x="349" y="304" width="5" height="2" fill="#2A3148" />
              <rect x="349" y="338" width="5" height="2" fill="#2A3148" />
            </g>
          </g>
        </g>

        {/* tiny stamp — bottom edge */}
        <g style={{ fontFamily: 'var(--font-mono)' }}>
          <text x="20" y="468" fontSize="8" fill="#3A4256" letterSpacing="0.2em">
            41.7°N 44.8°E · 21:42
          </text>
          <text x="460" y="468" fontSize="8" fill="#3A4256" letterSpacing="0.2em" textAnchor="end">
            STELLAR · TRACKING
          </text>
        </g>
      </svg>
    </div>
  );
}
