export default function MercuryNode({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mcn-body" cx="0.36" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#E8DFC8" />
          <stop offset="0.55" stopColor="#A69880" />
          <stop offset="1" stopColor="#6A5E4A" />
        </radialGradient>
        <clipPath id="mcn-clip"><circle cx="12" cy="12" r="8" /></clipPath>
      </defs>
      <circle cx="12" cy="12" r="8" fill="url(#mcn-body)" />
      <g clipPath="url(#mcn-clip)" opacity="0.6">
        <circle cx="9" cy="10" r="1.1" fill="#46402F" />
        <circle cx="9" cy="10" r="0.45" fill="#E8DFC8" opacity="0.7" />
        <circle cx="14.5" cy="13" r="0.8" fill="#46402F" />
        <circle cx="11" cy="14.5" r="0.55" fill="#46402F" />
        <circle cx="15" cy="9" r="0.55" fill="#46402F" />
      </g>
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" />
    </svg>
  );
}
