export default function CosmologyIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ki-gal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.15" stopColor="#FFE1A8" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="var(--terracotta)" stopOpacity="0.7" />
          <stop offset="0.8" stopColor="#5B4191" stopOpacity="0.3" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <g transform="translate(28 28) rotate(-25)">
        <ellipse cx="0" cy="0" rx="26" ry="8" fill="url(#ki-gal)" />
        <ellipse cx="0" cy="0" rx="18" ry="5" fill="url(#ki-gal)" opacity="0.8" />
        <ellipse cx="0" cy="0" rx="10" ry="3" fill="#FFE1A8" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="26" ry="1.2" fill="#0a0012" opacity="0.6" />
      </g>
      <circle cx="8" cy="12" r="0.6" fill="#fff" opacity="0.7" />
      <circle cx="48" cy="14" r="0.5" fill="#fff" opacity="0.6" />
      <circle cx="10" cy="46" r="0.5" fill="#fff" opacity="0.6" />
      <circle cx="46" cy="44" r="0.7" fill="#fff" opacity="0.8" />
      <circle cx="4" cy="28" r="0.4" fill="#B8D4FF" opacity="0.5" />
      <circle cx="52" cy="30" r="0.4" fill="#B8D4FF" opacity="0.5" />
    </svg>
  );
}
