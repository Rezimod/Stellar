export default function SolarSystemIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ssi-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4C4" />
          <stop offset="0.4" stopColor="#FFB347" />
          <stop offset="1" stopColor="#B04818" />
        </radialGradient>
      </defs>
      <ellipse cx="28" cy="28" rx="20" ry="6" fill="none" stroke="rgba(255,180,80,0.2)" strokeWidth="0.6" />
      <ellipse cx="28" cy="28" rx="14" ry="4" fill="none" stroke="rgba(255,180,80,0.3)" strokeWidth="0.6" />
      <ellipse cx="28" cy="28" rx="24" ry="8" fill="none" stroke="rgba(255,180,80,0.15)" strokeWidth="0.6" />
      <circle cx="28" cy="28" r="7" fill="url(#ssi-sun)" />
      <g stroke="#FFB347" strokeWidth="0.4" opacity="0.6">
        <line x1="28" y1="18" x2="28" y2="21" />
        <line x1="28" y1="35" x2="28" y2="38" />
        <line x1="18" y1="28" x2="21" y2="28" />
        <line x1="35" y1="28" x2="38" y2="28" />
      </g>
      <circle cx="14" cy="32" r="1.2" fill="#E8D4A8" />
      <circle cx="42" cy="25" r="1.8" fill="#C8763A" />
      <circle cx="50" cy="30" r="1.3" fill="#8BB4D9" />
      <circle cx="10" cy="27" r="1" fill="#6B95C9" opacity="0.7" />
    </svg>
  );
}
