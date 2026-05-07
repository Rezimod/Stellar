export default function JupiterArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="jup-body" cx="0.35" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#F4D9A8" />
          <stop offset="0.35" stopColor="#D8A574" />
          <stop offset="0.7" stopColor="#8B5A2E" />
          <stop offset="1" stopColor="#3D1F0A" />
        </radialGradient>
        <linearGradient id="jup-band" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C48D5A" stopOpacity="0.6" />
          <stop offset="1" stopColor="#6B3E1A" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="188" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2 6" />
      <circle cx="200" cy="200" r="118" fill="none" stroke="rgba(255, 179, 71,0.1)" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="100" fill="url(#jup-body)" />
      <ellipse cx="200" cy="170" rx="96" ry="8" fill="url(#jup-band)" opacity="0.5" />
      <ellipse cx="200" cy="195" rx="99" ry="6" fill="url(#jup-band)" opacity="0.7" />
      <ellipse cx="200" cy="215" rx="97" ry="10" fill="url(#jup-band)" opacity="0.5" />
      <ellipse cx="200" cy="235" rx="92" ry="7" fill="url(#jup-band)" opacity="0.6" />
      <ellipse cx="170" cy="215" rx="14" ry="6" fill="#8B3A1E" opacity="0.85" />
      <circle cx="88" cy="200" r="2.5" fill="#fff" opacity="0.9" />
      <circle cx="320" cy="200" r="3" fill="#fff" opacity="0.9" />
      <circle cx="200" cy="50" r="2" fill="#fff" opacity="0.7" />
      <circle cx="370" cy="200" r="2.5" fill="#fff" opacity="0.85" />
    </svg>
  );
}
