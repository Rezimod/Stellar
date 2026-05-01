'use client';

/**
 * Hero scene — real photograph of M31 (Adam Evans / CC BY 2.0) blended
 * deep into the starfield, with a minimalist white refractor aimed at it.
 * Premium = restraint. Pure white + brass + black, no decorative accents.
 */

const STARS: { cx: number; cy: number; r: number; o: number; d: number }[] = [
  { cx:  40, cy:  44, r: 0.9, o: 0.75, d: 0.0 },
  { cx: 392, cy:  68, r: 0.8, o: 0.65, d: 1.4 },
  { cx: 320, cy:  32, r: 0.5, o: 0.5,  d: 2.7 },
  { cx: 422, cy: 156, r: 0.7, o: 0.6,  d: 2.1 },
  { cx:  30, cy: 224, r: 0.6, o: 0.5,  d: 3.4 },
  { cx: 248, cy:  18, r: 0.4, o: 0.4,  d: 1.8 },
  { cx: 184, cy: 320, r: 0.5, o: 0.45, d: 0.4 },
  { cx:  64, cy: 376, r: 0.7, o: 0.55, d: 2.5 },
  { cx: 444, cy:  18, r: 0.5, o: 0.45, d: 3.0 },
  { cx: 462, cy: 392, r: 0.5, o: 0.45, d: 2.9 },
  { cx: 274, cy:  78, r: 0.4, o: 0.4,  d: 0.2 },
  { cx: 432, cy: 264, r: 0.4, o: 0.4,  d: 1.7 },
  { cx:  18, cy: 322, r: 0.5, o: 0.45, d: 0.5 },
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
        @keyframes hero-photon {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(355px, 358px); opacity: 0; }
        }
        @keyframes hero-photon-trail {
          0%   { transform: translate(150px, 168px); opacity: 0; }
          12%  { opacity: 0.45; }
          92%  { opacity: 0.45; }
          100% { transform: translate(355px, 358px); opacity: 0; }
        }
        @keyframes hero-reticle {
          0%, 88%, 100% { opacity: 0.32; }
          92%, 96%      { opacity: 0.85; }
        }

        .star    { animation: hero-twinkle 5s ease-in-out infinite; }
        .scope   { animation: hero-track 9s ease-in-out infinite;
                   transform-origin: 360px 396px; transform-box: view-box; }
        .photon  { animation: hero-photon 6s ease-in infinite;
                   transform-box: view-box; }
        .photon-trail-a { animation: hero-photon-trail 6s ease-in infinite;
                          animation-delay: 0.3s; transform-box: view-box; }
        .photon-trail-b { animation: hero-photon-trail 6s ease-in infinite;
                          animation-delay: 0.6s; transform-box: view-box; }
        .reticle { animation: hero-reticle 5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .star, .scope, .photon, .photon-trail-a, .photon-trail-b,
          .reticle { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 480 480" className="w-full h-auto block" fill="none">
        <defs>
          {/* Ultra-soft mask — ellipse with 6-stop gentle falloff so the
              photo dissolves into the starfield instead of cutting off. */}
          <radialGradient id="andromeda-mask" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFF" stopOpacity="1" />
            <stop offset="35%"  stopColor="#FFF" stopOpacity="0.92" />
            <stop offset="55%"  stopColor="#FFF" stopOpacity="0.62" />
            <stop offset="72%"  stopColor="#FFF" stopOpacity="0.28" />
            <stop offset="86%"  stopColor="#FFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
          </radialGradient>
          <mask id="andromeda-fade" maskUnits="userSpaceOnUse">
            <ellipse cx="150" cy="168" rx="320" ry="190" fill="url(#andromeda-mask)" />
          </mask>

          {/* glossy white tube — multi-stop cylindrical shading */}
          <linearGradient id="tube-white" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#3A3D45" />
            <stop offset="10%"  stopColor="#7E8089" />
            <stop offset="22%"  stopColor="#C7C9D0" />
            <stop offset="40%"  stopColor="#F4F5F7" />
            <stop offset="50%"  stopColor="#FFFFFF" />
            <stop offset="60%"  stopColor="#F0F1F4" />
            <stop offset="78%"  stopColor="#B7B9C0" />
            <stop offset="92%"  stopColor="#5A5C66" />
            <stop offset="100%" stopColor="#1F2128" />
          </linearGradient>
          {/* mount white — softer */}
          <linearGradient id="mount-white" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5A5C66" />
            <stop offset="50%"  stopColor="#F4F5F7" />
            <stop offset="100%" stopColor="#3A3D45" />
          </linearGradient>
          {/* black anodized */}
          <linearGradient id="anod-black" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#080A10" />
            <stop offset="50%"  stopColor="#1E2230" />
            <stop offset="100%" stopColor="#080A10" />
          </linearGradient>
          {/* objective lens */}
          <radialGradient id="lens" cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#3D5870" stopOpacity="0.7" />
            <stop offset="40%"  stopColor="#10202F" />
            <stop offset="100%" stopColor="#020409" />
          </radialGradient>
          {/* brass — single accent */}
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#7A5520" />
            <stop offset="50%"  stopColor="#FFD166" />
            <stop offset="100%" stopColor="#5C3F18" />
          </linearGradient>
          {/* chrome */}
          <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E8EAF0" />
            <stop offset="50%"  stopColor="#888B95" />
            <stop offset="100%" stopColor="#2A2D36" />
          </linearGradient>
          {/* tripod leg — dark gunmetal */}
          <linearGradient id="leg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0D1018" />
            <stop offset="50%"  stopColor="#3F4350" />
            <stop offset="100%" stopColor="#0D1018" />
          </linearGradient>

          {/* photo blend: subtle vignette to merge with sky */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
            <stop offset="60%"  stopColor="#0A0E1A" stopOpacity="0" />
            <stop offset="100%" stopColor="#0A0E1A" stopOpacity="0.85" />
          </radialGradient>
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

        {/* faint horizon line */}
        <line x1="20" y1="446" x2="460" y2="446" stroke="#1B2238" strokeWidth="1" strokeDasharray="2 6" opacity="0.5" />

        {/* ═══════ ANDROMEDA — large image, soft mask, blend overlay ═══════ */}
        <g mask="url(#andromeda-fade)">
          {/* zoomed-in larger image so its rectangular edges are far off-canvas */}
          <image
            href="/hero/andromeda.jpg"
            x="-220"
            y="-90"
            width="760"
            height="500"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.88"
          />
          {/* subtle vignette to ease the photo's natural background into the sky */}
          <ellipse cx="150" cy="168" rx="320" ry="190" fill="url(#vignette)" />
        </g>

        {/* faint reticle around galaxy core — barely visible, just a hint */}
        <g className="reticle" stroke="#FFD166" strokeWidth="0.7" transform="translate(150 168)">
          <path d="M -42 -18 L -50 -18 L -50 -10" />
          <path d="M  42 -18 L  50 -18 L  50 -10" />
          <path d="M -42  18 L -50  18 L -50  10" />
          <path d="M  42  18 L  50  18 L  50  10" />
        </g>

        {/* M31 label — minimal, lower contrast */}
        <g style={{ fontFamily: 'var(--font-mono)' }}>
          <line x1="298" y1="118" x2="312" y2="106" stroke="#3A4256" strokeWidth="1" strokeOpacity="0.5" />
          <text x="316" y="100" fontSize="9" fill="#6B7280" letterSpacing="0.22em">M31</text>
          <text x="316" y="114" fontSize="8" fill="#4A5269" letterSpacing="0.18em">2.5 Mly · MAG 3.4</text>
        </g>

        {/* sight line */}
        <line
          x1="151" y1="170"
          x2="354" y2="356"
          stroke="#FFD166"
          strokeWidth="0.7"
          strokeDasharray="2 5"
          strokeOpacity="0.28"
        />

        {/* photon trail */}
        <circle r="1.4" cx="0" cy="0" fill="#FFD166" opacity="0.5" className="photon-trail-b" />
        <circle r="1.8" cx="0" cy="0" fill="#FFD166" opacity="0.7" className="photon-trail-a" />
        <circle r="2.4" cx="0" cy="0" fill="#FFE9B4" className="photon" />

        {/* ═══════════════ MINIMALIST WHITE REFRACTOR ═══════════════ */}
        {/* Tripod */}
        <g>
          <path d="M 318 462 L 358 400" stroke="url(#leg)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M 402 462 L 362 400" stroke="url(#leg)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M 360 464 L 360 398" stroke="url(#leg)" strokeWidth="2.8" strokeLinecap="round" />
          {/* feet */}
          <ellipse cx="318" cy="462" rx="2.6" ry="1.4" fill="#080A10" />
          <ellipse cx="402" cy="462" rx="2.6" ry="1.4" fill="#080A10" />
          <ellipse cx="360" cy="464" rx="2.6" ry="1.4" fill="#080A10" />
          {/* simple top platform */}
          <rect x="350" y="394" width="20" height="6" rx="1" fill="#15181F" />
        </g>

        {/* Mount head — small, clean, white */}
        <g>
          {/* RA housing */}
          <rect x="350" y="378" width="20" height="16" rx="2.5" fill="url(#mount-white)" stroke="#3A3D45" strokeWidth="0.5" />
          {/* polar scope */}
          <circle cx="360" cy="386" r="2.2" fill="#080A10" stroke="#3A3D45" strokeWidth="0.4" />
          <circle cx="360" cy="386" r="0.7" fill="#FFD166" opacity="0.5" />
          {/* setting circle band */}
          <rect x="350" y="376.6" width="20" height="1.6" fill="#080A10" />
        </g>

        {/* Counterweight bar + weight (rotates with scope) */}
        <g className="scope">
          <line x1="360" y1="386" x2="396" y2="422"
                stroke="url(#chrome)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="398" cy="424" r="7" fill="#080A10" stroke="#3A3D45" strokeWidth="0.6" />
          <circle cx="398" cy="424" r="2.6" fill="#1E2230" />

          {/* TUBE — rotated to point at galaxy */}
          <g transform="rotate(-45 360 386)">
            {/* saddle plate */}
            <rect x="350" y="370" width="20" height="6" rx="1" fill="#080A10" />
            <rect x="350" y="370" width="20" height="1.2" fill="#FFFFFF" opacity="0.18" />

            {/* main white tube — long, elegant */}
            <rect x="352" y="222" width="16" height="148" rx="1.5" fill="url(#tube-white)" />
            {/* specular highlight band */}
            <rect x="358.5" y="226" width="0.9" height="142" fill="#FFFFFF" opacity="0.7" />
            <rect x="362"   y="226" width="0.5" height="142" fill="#FFFFFF" opacity="0.4" />

            {/* single tube ring (mid) */}
            <rect x="346" y="290" width="28" height="9" rx="1.4" fill="url(#anod-black)" />
            <rect x="346" y="290" width="28" height="1.6" fill="#FFFFFF" opacity="0.16" />
            {/* knob */}
            <circle cx="376" cy="294.5" r="1.8" fill="url(#chrome)" stroke="#080A10" strokeWidth="0.3" />

            {/* dew shield */}
            <rect x="349" y="200" width="22" height="22" rx="2" fill="url(#tube-white)" />
            <rect x="357" y="202" width="0.9" height="18" fill="#FFFFFF" opacity="0.7" />
            <rect x="361" y="202" width="0.5" height="18" fill="#FFFFFF" opacity="0.4" />
            {/* dew shield trim */}
            <rect x="349" y="221" width="22" height="1.6" fill="#080A10" />

            {/* objective cell */}
            <rect x="348" y="194" width="24" height="6" rx="2" fill="#080A10" />
            <circle cx="360" cy="196" r="11" fill="url(#lens)" stroke="url(#brass)" strokeWidth="1.6" />
            <circle cx="360" cy="196" r="8.5" fill="none" stroke="#FFD166" strokeOpacity="0.25" strokeWidth="0.4" />
            <circle cx="356" cy="192" r="2.2" fill="#A8C9E5" opacity="0.5" />
            <circle cx="357" cy="191" r="0.7" fill="#FFFFFF" opacity="0.85" />

            {/* rear cell */}
            <rect x="348" y="370" width="24" height="6" rx="1.5" fill="#080A10" />
            <rect x="348" y="369.4" width="24" height="0.6" fill="url(#brass)" opacity="0.55" />

            {/* focuser body — single clean block */}
            <rect x="372" y="360" width="14" height="14" rx="1.2" fill="url(#anod-black)" />
            {/* drawtube */}
            <rect x="384" y="365" width="9" height="4" fill="#15181F" stroke="#3A3D45" strokeWidth="0.4" />
            {/* one large chrome focus knob */}
            <circle cx="386" cy="361" r="2.6" fill="url(#chrome)" stroke="#080A10" strokeWidth="0.5" />
            <circle cx="386" cy="361" r="0.8" fill="#080A10" />
            <circle cx="386" cy="372" r="2.6" fill="url(#chrome)" stroke="#080A10" strokeWidth="0.5" />
            <circle cx="386" cy="372" r="0.8" fill="#080A10" />

            {/* eyepiece */}
            <rect x="393" y="364" width="6" height="6" rx="0.5" fill="#080A10" stroke="url(#brass)" strokeWidth="0.5" />
            <rect x="399" y="362" width="6" height="10" rx="0.7" fill="#080A10" />
            <circle cx="402" cy="367" r="2.4" fill="#020409" stroke="#3A3D45" strokeWidth="0.4" />
            <rect x="405" y="364" width="2.2" height="6" rx="0.4" fill="#080A10" />
          </g>
        </g>

        {/* tiny stamp / credit */}
        <g style={{ fontFamily: 'var(--font-mono)' }}>
          <text x="20" y="468" fontSize="8" fill="#3A4256" letterSpacing="0.2em">
            41.7°N 44.8°E · 21:42
          </text>
          <text x="460" y="468" fontSize="7.5" fill="#3A4256" letterSpacing="0.16em" textAnchor="end">
            M31 · ADAM EVANS · CC BY 2.0
          </text>
        </g>
      </svg>
    </div>
  );
}
