export default function AndromedaNode({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.75)} viewBox="0 0 40 30" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="an-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE3A3" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#B48CE0" stopOpacity="0.45" />
          <stop offset="0.85" stopColor="#3A2A5C" stopOpacity="0.14" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="an-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF8DC" />
          <stop offset="0.4" stopColor="#FFD580" />
          <stop offset="1" stopColor="#C08838" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <g transform="translate(20 15) rotate(-22)">
        {/* halo ellipse */}
        <ellipse cx="0" cy="0" rx="18" ry="5.5" fill="url(#an-halo)" />
        {/* inner disc */}
        <ellipse cx="0" cy="0" rx="12" ry="3" fill="#E6D4FF" opacity="0.3" />
        {/* spiral hint */}
        <path d="M -14 1 Q -4 -1.5 0 0 Q 4 1.5 14 -1" stroke="#FFD9A8" strokeWidth="0.4" fill="none" opacity="0.7" />
        <path d="M -12 -0.5 Q -4 1 0 0 Q 4 -1 12 0.5" stroke="#C5A4F0" strokeWidth="0.3" fill="none" opacity="0.55" />
        {/* bright core */}
        <ellipse cx="0" cy="0" rx="4.2" ry="1.6" fill="url(#an-core)" />
        <circle cx="0" cy="0" r="1.1" fill="#FFFFFF" />
        {/* companion galaxies */}
        <circle cx="-10" cy="-3" r="0.9" fill="#F0E0C0" opacity="0.75" />
        <circle cx="7" cy="2.6" r="0.7" fill="#F0E0C0" opacity="0.65" />
      </g>
    </svg>
  );
}
