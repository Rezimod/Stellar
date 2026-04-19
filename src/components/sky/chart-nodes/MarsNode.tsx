export default function MarsNode({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mrn-body" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FFC49A" />
          <stop offset="0.55" stopColor="#D96A32" />
          <stop offset="1" stopColor="#8A3714" />
        </radialGradient>
        <clipPath id="mrn-clip"><circle cx="14" cy="14" r="10" /></clipPath>
      </defs>
      {/* body */}
      <circle cx="14" cy="14" r="10" fill="url(#mrn-body)" />
      <g clipPath="url(#mrn-clip)">
        {/* dark albedo */}
        <ellipse cx="10" cy="11" rx="3.2" ry="1.4" fill="#6E2410" opacity="0.55" />
        <ellipse cx="17" cy="15" rx="3.6" ry="1.7" fill="#5D1E0C" opacity="0.5" />
        <ellipse cx="12" cy="17" rx="1.8" ry="0.9" fill="#5D1E0C" opacity="0.45" />
        {/* polar caps */}
        <ellipse cx="14" cy="5.8" rx="3.6" ry="1.3" fill="#FFF2DC" opacity="0.85" />
        <ellipse cx="14" cy="22.2" rx="2.4" ry="0.9" fill="#FFE5BC" opacity="0.7" />
      </g>
      {/* crisp edge */}
      <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" />
    </svg>
  );
}
