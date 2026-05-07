export default function ExplorationIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ei-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F0E6D8" />
          <stop offset="0.5" stopColor="#C8BEB0" />
          <stop offset="1" stopColor="#6B6458" />
        </linearGradient>
        <linearGradient id="ei-flame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF4C4" />
          <stop offset="0.5" stopColor="#FFB347" />
          <stop offset="1" stopColor="#FF6428" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="translate(28 30) rotate(-35)">
        <path d="M -3 10 Q 0 22 0 24 Q 0 22 3 10 Z" fill="url(#ei-flame)" />
        <path d="M -3 -16 Q -3 -20 0 -20 Q 3 -20 3 -16 L 3 10 L -3 10 Z" fill="url(#ei-body)" />
        <circle cx="0" cy="-10" r="2" fill="var(--stl-teal)" opacity="0.85" />
        <circle cx="0" cy="-10" r="2" fill="none" stroke="#2A3A52" strokeWidth="0.5" />
        <path d="M -3 6 L -7 12 L -3 10 Z" fill="#C8763A" />
        <path d="M 3 6 L 7 12 L 3 10 Z" fill="#C8763A" />
        <line x1="-3" y1="-4" x2="3" y2="-4" stroke="#FF6428" strokeWidth="1.5" opacity="0.8" />
      </g>
      <circle cx="46" cy="12" r="1.2" fill="#fff" />
      <circle cx="12" cy="46" r="0.8" fill="#fff" opacity="0.7" />
      <circle cx="48" cy="46" r="0.6" fill="#fff" opacity="0.6" />
      <circle cx="8" cy="8" r="0.5" fill="#fff" opacity="0.5" />
    </svg>
  );
}
