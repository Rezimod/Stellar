'use client';

/**
 * Hero scene — refined refractor aimed at the Andromeda Galaxy.
 * Galaxy: stacked elliptical layers (halo / mid / bulge / nucleus),
 * primary + secondary dust lanes, M32 + M110, foreground stars.
 * Telescope: long-focal refractor with dew shield, brass objective,
 * dual tube rings, finder scope, focuser drawtube + 2" eyepiece, on a
 * GEM-style mount with counterweight, sturdy tripod.
 */

const STARS: { cx: number; cy: number; r: number; o: number; d: number }[] = [
  { cx:  40, cy:  44, r: 0.9, o: 0.75, d: 0.0 },
  { cx: 392, cy:  68, r: 0.8, o: 0.65, d: 1.4 },
  { cx: 320, cy:  32, r: 0.5, o: 0.5,  d: 2.7 },
  { cx:  90, cy: 102, r: 0.5, o: 0.45, d: 0.9 },
  { cx: 422, cy: 156, r: 0.7, o: 0.6,  d: 2.1 },
  { cx:  30, cy: 224, r: 0.6, o: 0.5,  d: 3.4 },
  { cx: 248, cy:  18, r: 0.4, o: 0.4,  d: 1.8 },
  { cx: 184, cy: 320, r: 0.5, o: 0.45, d: 0.4 },
  { cx:  64, cy: 376, r: 0.7, o: 0.55, d: 2.5 },
  { cx: 448, cy: 282, r: 0.6, o: 0.5,  d: 1.1 },
  { cx: 444, cy:  18, r: 0.5, o: 0.45, d: 3.0 },
  { cx:  18, cy: 132, r: 0.4, o: 0.4,  d: 0.7 },
  { cx: 380, cy: 228, r: 0.4, o: 0.4,  d: 2.3 },
  { cx: 116, cy: 388, r: 0.5, o: 0.45, d: 1.6 },
  { cx: 462, cy: 392, r: 0.5, o: 0.45, d: 2.9 },
  { cx: 274, cy:  78, r: 0.4, o: 0.4,  d: 0.2 },
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
          0%, 100% { transform: rotate(-44.6deg); }
          50%      { transform: rotate(-45.4deg); }
        }
        @keyframes hero-rotate-galaxy {
          from { transform: rotate(-22deg); }
          to   { transform: rotate(-23deg); }
        }
        @keyframes hero-photon {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(355px, 358px); opacity: 0; }
        }
        @keyframes hero-photon-trail {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          12%  { opacity: 0.5; }
          92%  { opacity: 0.5; }
          100% { transform: translate(355px, 358px); opacity: 0; }
        }
        @keyframes hero-reticle {
          0%, 88%, 100% { opacity: 0.45; }
          92%, 96%      { opacity: 1; }
        }
        @keyframes hero-pulse-core {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.82; }
        }
        @keyframes hero-finder-led {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 0.4; }
        }

        .star    { animation: hero-twinkle 5s ease-in-out infinite; }
        .scope   { animation: hero-track   8s ease-in-out infinite;
                   transform-origin: 360px 400px; transform-box: view-box; }
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
        .led     { animation: hero-finder-led 2.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .star, .scope, .galaxy, .photon,
          .photon-trail-a, .photon-trail-b,
          .reticle, .core, .led { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 480 480" className="w-full h-auto block" fill="none">
        <defs>
          {/* ─── Andromeda gradients ─────────────────────────────────── */}
          <radialGradient id="m31-nucleus" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFFEF5" stopOpacity="1" />
            <stop offset="50%"  stopColor="#FFF1C8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFE9B4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-bulge" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFE6A8" stopOpacity="0.95" />
            <stop offset="60%"  stopColor="#E5BE74" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#B89858" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-disk" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E2C68C" stopOpacity="0.55" />
            <stop offset="50%"  stopColor="#A88B5C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7A6440" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#8C7250" stopOpacity="0.22" />
            <stop offset="60%"  stopColor="#5C4A34" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#5C4A34" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31-arm" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#F8E2B0" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#F8E2B0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m110" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E0C28E" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#A88B5C" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m32" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFF1C8" stopOpacity="1" />
            <stop offset="100%" stopColor="#E5BE74" stopOpacity="0" />
          </radialGradient>

          {/* ─── Telescope materials ────────────────────────────────── */}
          <linearGradient id="tube-skin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0A0E18" />
            <stop offset="35%"  stopColor="#1A2336" />
            <stop offset="55%"  stopColor="#26304A" />
            <stop offset="80%"  stopColor="#11192A" />
            <stop offset="100%" stopColor="#070A12" />
          </linearGradient>
          <linearGradient id="dewshield" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#070A12" />
            <stop offset="50%"  stopColor="#13192A" />
            <stop offset="100%" stopColor="#070A12" />
          </linearGradient>
          <radialGradient id="objective" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1B2238" />
            <stop offset="60%"  stopColor="#0A0E1A" />
            <stop offset="100%" stopColor="#06080F" />
          </radialGradient>
          <linearGradient id="tripod-leg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2F3852" />
            <stop offset="100%" stopColor="#0F1424" />
          </linearGradient>
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#B8893E" />
            <stop offset="50%"  stopColor="#FFD166" />
            <stop offset="100%" stopColor="#8A6328" />
          </linearGradient>

          <clipPath id="galaxy-clip">
            <ellipse cx="0" cy="0" rx="190" ry="48" />
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

        {/* faint horizon glow */}
        <line x1="20" y1="446" x2="460" y2="446" stroke="#1B2238" strokeWidth="1" strokeDasharray="2 6" opacity="0.55" />

        {/* sight line */}
        <line
          x1="151" y1="170"
          x2="354" y2="356"
          stroke="#FFD166"
          strokeWidth="0.8"
          strokeDasharray="2 5"
          strokeOpacity="0.32"
        />

        {/* ═══════════════ ANDROMEDA ═══════════════ */}
        <g className="galaxy">
          <g transform="translate(150 168)">
            {/* faint outer halo */}
            <ellipse cx="0" cy="0" rx="200" ry="50" fill="url(#m31-halo)" />
            {/* outer disk */}
            <ellipse cx="0" cy="0" rx="170" ry="42" fill="url(#m31-disk)" />
            <ellipse cx="0" cy="0" rx="138" ry="34" fill="url(#m31-disk)" opacity="0.85" />

            {/* spiral arm hints — brighter regions on the disk plane */}
            <g clipPath="url(#galaxy-clip)" opacity="0.95">
              <ellipse cx="56"  cy="-2" rx="80" ry="20" fill="url(#m31-arm)" />
              <ellipse cx="-56" cy="2"  rx="80" ry="20" fill="url(#m31-arm)" />
              <ellipse cx="92"  cy="0"  rx="40" ry="10" fill="url(#m31-arm)" opacity="0.5" />
              <ellipse cx="-92" cy="0"  rx="40" ry="10" fill="url(#m31-arm)" opacity="0.4" />
            </g>

            {/* primary dust lane — prominent dark arc on the near (south) side */}
            <g clipPath="url(#galaxy-clip)">
              <path
                d="M -170 8 Q -90 22 0 18 Q 90 14 170 4"
                stroke="#000" strokeOpacity="0.55" strokeWidth="4.5" fill="none"
              />
              <path
                d="M -170 8 Q -90 22 0 18 Q 90 14 170 4"
                stroke="#000" strokeOpacity="0.85" strokeWidth="2" fill="none"
              />
              {/* secondary dust streak */}
              <path
                d="M -130 -2 Q -50 6 30 4 Q 90 2 130 -2"
                stroke="#000" strokeOpacity="0.4" strokeWidth="1.4" fill="none"
              />
              {/* tertiary outer dust */}
              <path
                d="M -160 14 Q -80 26 40 22 Q 110 18 160 12"
                stroke="#000" strokeOpacity="0.18" strokeWidth="2" fill="none"
              />
            </g>

            {/* central bulge — bright golden */}
            <ellipse cx="0" cy="0" rx="56" ry="18" fill="url(#m31-bulge)" opacity="0.9" />
            <ellipse cx="0" cy="0" rx="32" ry="11" fill="url(#m31-bulge)" />
            {/* nucleus glow */}
            <circle cx="0" cy="0" r="14" fill="url(#m31-nucleus)" opacity="0.6" />
            <circle cx="0" cy="0" r="6"  fill="url(#m31-nucleus)" />
            {/* very bright center */}
            <circle cx="0" cy="0" r="2.6" fill="#FFFEF5" className="core" />

            {/* M32 — compact bright elliptical, just south-east of disk */}
            <circle cx="62" cy="26" r="8" fill="url(#m32)" opacity="0.55" />
            <circle cx="62" cy="26" r="3.4" fill="#FFF1C8" />
            <circle cx="62" cy="26" r="1.6" fill="#FFFEF5" />

            {/* M110 — diffuse elongated companion, north-west */}
            <ellipse cx="-78" cy="-30" rx="18" ry="8" fill="url(#m110)" transform="rotate(-15 -78 -30)" />
            <ellipse cx="-78" cy="-30" rx="9" ry="4"  fill="#E5BE74" opacity="0.55" transform="rotate(-15 -78 -30)" />

            {/* foreground stars overlaying */}
            <g fill="#FFFFFF">
              <circle cx="42"  cy="-12" r="0.7" opacity="0.95" />
              <circle cx="-30" cy="6"   r="0.6" opacity="0.85" />
              <circle cx="106" cy="2"   r="0.5" opacity="0.7"  />
              <circle cx="-110" cy="-4" r="0.5" opacity="0.7"  />
              <circle cx="20"  cy="-20" r="0.4" opacity="0.6"  />
            </g>

            {/* reticle — corner brackets on core */}
            <g className="reticle" stroke="#FFD166" strokeWidth="0.9" strokeOpacity="0.45">
              <path d="M -34 -16 L -42 -16 L -42 -8" />
              <path d="M  34 -16 L  42 -16 L  42 -8" />
              <path d="M -34  16 L -42  16 L -42  8" />
              <path d="M  34  16 L  42  16 L  42  8" />
            </g>
          </g>
        </g>

        {/* M31 label */}
        <g style={{ fontFamily: 'var(--font-mono)' }}>
          <line x1="282" y1="118" x2="298" y2="106" stroke="#3A4256" strokeWidth="1" strokeOpacity="0.7" />
          <text x="302" y="100" fontSize="9" fill="#6B7280" letterSpacing="0.22em">M31</text>
          <text x="302" y="114" fontSize="9" fill="#9BA3B4" letterSpacing="0.14em">ANDROMEDA</text>
          <text x="302" y="126" fontSize="8" fill="#4A5269" letterSpacing="0.18em">2.5 Mly · MAG 3.4</text>
        </g>

        {/* photon trail */}
        <circle r="1.4" cx="0" cy="0" fill="#FFD166" opacity="0.55" className="photon-trail-b" />
        <circle r="1.8" cx="0" cy="0" fill="#FFD166" opacity="0.75" className="photon-trail-a" />
        <circle r="2.4" cx="0" cy="0" fill="#FFE9B4" className="photon" />

        {/* ═══════════════ TELESCOPE ═══════════════ */}
        {/* Tripod */}
        <g>
          {/* back leg (centered) */}
          <path d="M 360 462 L 360 400" stroke="url(#tripod-leg)" strokeWidth="3.6" strokeLinecap="round" />
          {/* left leg */}
          <path d="M 308 462 L 358 402" stroke="url(#tripod-leg)" strokeWidth="3.8" strokeLinecap="round" />
          {/* right leg */}
          <path d="M 412 462 L 362 402" stroke="url(#tripod-leg)" strokeWidth="3.8" strokeLinecap="round" />
          {/* leg locks */}
          <rect x="306" y="430" width="6" height="3.5" rx="0.8" fill="#FFD166" opacity="0.55" transform="rotate(-50 309 432)" />
          <rect x="408" y="430" width="6" height="3.5" rx="0.8" fill="#FFD166" opacity="0.55" transform="rotate(50 411 432)" />
          <rect x="357" y="430" width="6" height="3.5" rx="0.8" fill="#FFD166" opacity="0.55" />
          {/* feet caps */}
          <circle cx="308" cy="462" r="2.6" fill="#11172A" stroke="#3A4256" strokeWidth="0.6" />
          <circle cx="412" cy="462" r="2.6" fill="#11172A" stroke="#3A4256" strokeWidth="0.6" />
          <circle cx="360" cy="462" r="2.6" fill="#11172A" stroke="#3A4256" strokeWidth="0.6" />
          {/* accessory tray */}
          <ellipse cx="360" cy="438" rx="22" ry="3.5" fill="#0E131F" stroke="#2A3148" strokeWidth="0.6" />
          {/* tripod head */}
          <rect x="346" y="394" width="28" height="10" rx="1.5" fill="#1B2238" />
          <rect x="346" y="392" width="28" height="2" fill="#0A0E1A" />
        </g>

        {/* GEM mount — RA + Dec axes, counterweight */}
        <g>
          {/* RA axis housing */}
          <rect x="350" y="380" width="20" height="16" rx="2" fill="#22293F" stroke="#3A4256" strokeWidth="0.6" />
          <circle cx="360" cy="394" r="2" fill="#11172A" stroke="#FFD166" strokeWidth="0.6" />
          {/* Dec axis */}
          <rect x="354" y="370" width="12" height="14" rx="1.5" fill="#1B2238" stroke="#3A4256" strokeWidth="0.6" />
          <circle cx="360" cy="378" r="3.5" fill="#0E131F" stroke="#FFD166" strokeWidth="0.5" />
          {/* polar scope cap */}
          <circle cx="360" cy="378" r="1.2" fill="#FFD166" opacity="0.55" />
        </g>

        {/* Counterweight bar + weight — points opposite of tube */}
        <g className="scope">
          <line x1="360" y1="378" x2="394" y2="412"
                stroke="#3A4256" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="396" cy="414" r="6.5" fill="#11172A" stroke="#3A4256" strokeWidth="0.8" />
          <circle cx="396" cy="414" r="3"   fill="#22293F" />
          {/* small bolt */}
          <circle cx="396" cy="414" r="0.8" fill="#FFD166" opacity="0.6" />

          {/* TUBE assembly — saddle + rings + tube + finder + focuser */}
          <g transform="rotate(-45 360 378)">
            {/* saddle plate */}
            <rect x="350" y="362" width="20" height="6" rx="1" fill="#22293F" stroke="#3A4256" strokeWidth="0.5" />

            {/* tube body — long refractor, rings around it */}
            {/* main tube */}
            <rect x="349" y="226" width="22" height="138" rx="3" fill="url(#tube-skin)" />
            {/* tube highlight stripe */}
            <rect x="357" y="228" width="3" height="134" fill="#3A4670" opacity="0.55" />
            <rect x="362" y="228" width="1.5" height="134" fill="#5A6B96" opacity="0.35" />

            {/* tube rings (two) */}
            <rect x="346" y="244" width="28" height="9" rx="2" fill="#0E131F" stroke="#FFD166" strokeWidth="0.7" />
            <rect x="346" y="336" width="28" height="9" rx="2" fill="#0E131F" stroke="#FFD166" strokeWidth="0.7" />
            {/* ring tightening knobs */}
            <circle cx="376" cy="248.5" r="1.5" fill="#FFD166" opacity="0.85" />
            <circle cx="344" cy="248.5" r="1.5" fill="#FFD166" opacity="0.85" />
            <circle cx="376" cy="340.5" r="1.5" fill="#FFD166" opacity="0.85" />
            <circle cx="344" cy="340.5" r="1.5" fill="#FFD166" opacity="0.85" />

            {/* dew shield — slightly wider than tube */}
            <rect x="346" y="208" width="28" height="22" rx="3" fill="url(#dewshield)" stroke="#1F2740" strokeWidth="0.6" />
            {/* objective cell */}
            <rect x="345" y="206" width="30" height="6" rx="2" fill="#0A0E1A" stroke="#FFD166" strokeWidth="0.7" />
            {/* objective lens */}
            <circle cx="360" cy="208" r="11" fill="url(#objective)" stroke="url(#brass)" strokeWidth="1.4" />
            <circle cx="360" cy="208" r="8"  fill="none" stroke="#FFD166" strokeWidth="0.5" strokeOpacity="0.5" />
            {/* lens glint */}
            <circle cx="356" cy="204" r="1.6" fill="#FFD166" opacity="0.6" />

            {/* rear cell — slightly wider */}
            <rect x="345" y="362" width="30" height="6" rx="1.5" fill="#0A0E1A" stroke="#2A3148" strokeWidth="0.6" />

            {/* focuser — drawtube + 2" eyepiece */}
            <rect x="370" y="350" width="14" height="10" rx="1" fill="#11172A" stroke="#3A4256" strokeWidth="0.6" />
            {/* focuser knobs */}
            <circle cx="384" cy="352" r="1.6" fill="#FFD166" opacity="0.85" />
            <circle cx="384" cy="358" r="1.6" fill="#FFD166" opacity="0.85" />
            {/* drawtube extension */}
            <rect x="383" y="354" width="8" height="3" fill="#1B2238" stroke="#3A4256" strokeWidth="0.4" />
            {/* eyepiece body */}
            <rect x="391" y="351" width="8" height="9" rx="0.8" fill="#0A0E1A" stroke="#FFD166" strokeWidth="0.7" />
            {/* eyepiece eye lens */}
            <circle cx="395" cy="355.5" r="2.2" fill="#06080F" stroke="#FFD166" strokeWidth="0.5" />
            {/* eyecup */}
            <rect x="399" y="352.5" width="2.5" height="6" rx="0.6" fill="#0A0E1A" />

            {/* finder scope — small parallel tube above main */}
            <rect x="338" y="248" width="6.5" height="64" rx="1.5" fill="#0E131F" stroke="#2A3148" strokeWidth="0.5" />
            {/* finder objective rim */}
            <circle cx="341.2" cy="246" r="3" fill="#06080F" stroke="#FFD166" strokeWidth="0.7" />
            {/* finder eyepiece */}
            <rect x="339.8" y="312" width="3" height="6" fill="#11172A" stroke="#FFD166" strokeWidth="0.4" />
            {/* finder mount brackets */}
            <rect x="344.5" y="252" width="4" height="2.4" fill="#2A3148" />
            <rect x="344.5" y="304" width="4" height="2.4" fill="#2A3148" />
            {/* red-dot LED */}
            <circle cx="341.2" cy="320" r="1.1" fill="#EF4444" className="led" />

            {/* dust cap aside — none, lens exposed (observing) */}
          </g>
        </g>

        {/* tiny stamp */}
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
