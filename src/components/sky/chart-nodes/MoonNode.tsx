export default function MoonNode({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mn-body" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#FAF4E2" />
          <stop offset="0.6" stopColor="#E0D6BC" />
          <stop offset="1" stopColor="#9E9378" />
        </radialGradient>
      </defs>
      {/* soft glow */}
      <circle cx="16" cy="16" r="14" fill="#FAF4E2" opacity="0.1" />
      {/* body */}
      <circle cx="16" cy="16" r="11" fill="url(#mn-body)" />
      {/* maria */}
      <ellipse cx="13" cy="12" rx="2.8" ry="1.6" fill="#7E7460" opacity="0.55" />
      <ellipse cx="19" cy="13.5" rx="1.9" ry="1.1" fill="#7E7460" opacity="0.55" />
      <ellipse cx="14.5" cy="19" rx="3.2" ry="1.8" fill="#7E7460" opacity="0.45" />
      <ellipse cx="19.5" cy="19.5" rx="1.3" ry="0.9" fill="#7E7460" opacity="0.45" />
      {/* craters (light ring + dark center) */}
      <circle cx="21" cy="10" r="0.9" fill="#5C5340" opacity="0.6" />
      <circle cx="10" cy="17" r="0.7" fill="#5C5340" opacity="0.55" />
      <circle cx="17" cy="22" r="0.8" fill="#5C5340" opacity="0.5" />
      {/* crisp edge */}
      <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.4" />
    </svg>
  );
}
