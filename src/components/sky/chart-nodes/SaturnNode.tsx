export default function SaturnNode({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sn-body" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FBE7BD" />
          <stop offset="0.6" stopColor="#D9A965" />
          <stop offset="1" stopColor="#8F6A38" />
        </radialGradient>
        <clipPath id="sn-planetclip"><circle cx="20" cy="14" r="8" /></clipPath>
      </defs>
      {/* ring back half (behind planet) */}
      <g transform="rotate(-18 20 14)">
        <ellipse cx="20" cy="14" rx="18" ry="3.2" fill="none" stroke="#D8B070" strokeWidth="1.4" opacity="0.85" />
        <ellipse cx="20" cy="14" rx="15" ry="2.4" fill="none" stroke="#B88A50" strokeWidth="0.8" opacity="0.7" />
      </g>
      {/* planet body */}
      <circle cx="20" cy="14" r="8" fill="url(#sn-body)" />
      {/* subtle bands */}
      <g clipPath="url(#sn-planetclip)" opacity="0.55">
        <rect x="11" y="11.5" width="18" height="1" fill="#B17B42" />
        <rect x="11" y="14.5" width="18" height="1.2" fill="#8A5A2E" />
        <rect x="11" y="17.5" width="18" height="1" fill="#9A6436" />
      </g>
      {/* ring front half (over planet) */}
      <g transform="rotate(-18 20 14)">
        <path d="M 2 14 Q 20 20 38 14" stroke="#F0D094" strokeWidth="1.2" fill="none" opacity="0.9" />
        <path d="M 4 14 Q 20 18.5 36 14" stroke="#C99560" strokeWidth="0.7" fill="none" opacity="0.7" />
      </g>
      {/* crisp edge */}
      <circle cx="20" cy="14" r="8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" />
    </svg>
  );
}
