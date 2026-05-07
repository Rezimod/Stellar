export default function ConstellationsIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ci-star" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor="#5EEAD4" />
          <stop offset="1" stopColor="#3E5580" />
        </radialGradient>
      </defs>
      <polyline points="12,16 22,24 32,14 44,22 38,36 26,40 14,32 12,16"
        fill="none" stroke="rgba(184,212,255,0.3)" strokeWidth="0.7" />
      <circle cx="12" cy="16" r="1.5" fill="#fff" />
      <circle cx="22" cy="24" r="2" fill="url(#ci-star)" />
      <circle cx="32" cy="14" r="1.8" fill="#5EEAD4" />
      <circle cx="44" cy="22" r="1.4" fill="#fff" />
      <circle cx="38" cy="36" r="2.2" fill="url(#ci-star)" />
      <circle cx="26" cy="40" r="1.5" fill="#5EEAD4" />
      <circle cx="14" cy="32" r="1.3" fill="#fff" />
      <circle cx="28" cy="28" r="3" fill="url(#ci-star)" />
      <g stroke="#fff" strokeWidth="0.5" opacity="0.7">
        <line x1="28" y1="22" x2="28" y2="34" />
        <line x1="22" y1="28" x2="34" y2="28" />
      </g>
      <circle cx="8" cy="44" r="0.5" fill="#5EEAD4" opacity="0.5" />
      <circle cx="48" cy="42" r="0.5" fill="#5EEAD4" opacity="0.5" />
      <circle cx="42" cy="10" r="0.6" fill="#fff" opacity="0.6" />
    </svg>
  );
}
