export default function JupiterNode({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="jn-body" cx="0.38" cy="0.32" r="0.82">
          <stop offset="0" stopColor="#FBE6BC" />
          <stop offset="0.55" stopColor="#E0B07A" />
          <stop offset="1" stopColor="#9C7348" />
        </radialGradient>
        <clipPath id="jn-clip"><circle cx="16" cy="16" r="11" /></clipPath>
      </defs>
      {/* body */}
      <circle cx="16" cy="16" r="11" fill="url(#jn-body)" />
      {/* cloud bands */}
      <g clipPath="url(#jn-clip)">
        <rect x="5" y="10.5" width="22" height="1.4" fill="#B98856" opacity="0.55" />
        <rect x="5" y="13.5" width="22" height="1.7" fill="#8A5A2E" opacity="0.55" />
        <rect x="5" y="17" width="22" height="2" fill="#9A6436" opacity="0.55" />
        <rect x="5" y="20.6" width="22" height="1.3" fill="#A0724A" opacity="0.5" />
        {/* Great Red Spot */}
        <ellipse cx="11" cy="18" rx="2.4" ry="1.1" fill="#C44828" opacity="0.8" />
      </g>
      {/* crisp edge */}
      <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" />
    </svg>
  );
}
