export default function TelescopeIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ti-tube" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4A6B8A" />
          <stop offset="0.5" stopColor="#8BADCE" />
          <stop offset="1" stopColor="#4A6B8A" />
        </linearGradient>
        <radialGradient id="ti-lens" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5EEAD4" />
          <stop offset="0.6" stopColor="#38A0D8" />
          <stop offset="1" stopColor="#0E3A5C" />
        </radialGradient>
      </defs>
      <g transform="translate(28 28) rotate(-25)">
        <rect x="-14" y="-4" width="28" height="8" rx="1" fill="url(#ti-tube)" />
        <ellipse cx="14" cy="0" rx="2.5" ry="5" fill="url(#ti-lens)" />
        <rect x="-15" y="-5" width="2" height="10" fill="#2A3A52" />
        <rect x="-4" y="-7" width="4" height="3" rx="0.5" fill="var(--stl-teal)" opacity="0.8" />
        <rect x="2" y="-8" width="8" height="2.5" rx="0.5" fill="#2A3A52" />
      </g>
      <g stroke="#4A6B8A" strokeWidth="1.4" fill="none" strokeLinecap="round">
        <line x1="28" y1="30" x2="20" y2="46" />
        <line x1="28" y1="30" x2="36" y2="46" />
        <line x1="28" y1="30" x2="28" y2="46" />
      </g>
      <circle cx="48" cy="12" r="1.5" fill="#fff" />
      <circle cx="48" cy="12" r="3" fill="#fff" opacity="0.3" />
      <g stroke="#fff" strokeWidth="0.3" opacity="0.5">
        <line x1="48" y1="8" x2="48" y2="16" />
        <line x1="44" y1="12" x2="52" y2="12" />
      </g>
    </svg>
  );
}
