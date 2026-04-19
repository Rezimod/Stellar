export default function CrabNode({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cn-cloud" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFB8A0" stopOpacity="0.7" />
          <stop offset="0.4" stopColor="#D07A90" stopOpacity="0.4" />
          <stop offset="0.8" stopColor="#5A3A6E" stopOpacity="0.18" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="cn-cloud2" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7FD3FF" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#3F6FB0" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="cn-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#C4E4FF" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* outer pink-red haze */}
      <ellipse cx="16" cy="16" rx="13" ry="10" fill="url(#cn-cloud)" />
      {/* inner blue glow */}
      <ellipse cx="16" cy="16" rx="8" ry="6" fill="url(#cn-cloud2)" />
      {/* filaments */}
      <g stroke="#FFA680" strokeWidth="0.5" fill="none" opacity="0.75">
        <path d="M 5 13 Q 11 15 16 13 Q 21 11 27 12" />
        <path d="M 5 18 Q 10 17 16 19 Q 22 21 28 19" />
        <path d="M 7 22 Q 12 20 16 22 Q 21 24 25 22" />
      </g>
      <g stroke="#7FD3FF" strokeWidth="0.4" fill="none" opacity="0.6">
        <path d="M 9 10 Q 14 13 19 9" />
        <path d="M 13 24 Q 17 21 22 25" />
      </g>
      {/* neutron star core */}
      <circle cx="16" cy="16" r="3" fill="url(#cn-core)" />
      <circle cx="16" cy="16" r="1.1" fill="#FFFFFF" />
    </svg>
  );
}
