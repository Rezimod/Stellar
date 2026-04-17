export default function SaturnArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sat-body" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#F5E0B2" />
          <stop offset="0.6" stopColor="#C7994F" />
          <stop offset="1" stopColor="#4A2E10" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      <ellipse cx="200" cy="200" rx="170" ry="34" fill="none" stroke="#D4B078" strokeWidth="2" opacity="0.7" />
      <ellipse cx="200" cy="200" rx="150" ry="30" fill="none" stroke="#A8824A" strokeWidth="1" opacity="0.5" />
      <ellipse cx="200" cy="200" rx="130" ry="26" fill="none" stroke="#8B6A3A" strokeWidth="0.5" opacity="0.5" />
      <circle cx="200" cy="200" r="82" fill="url(#sat-body)" />
      <ellipse cx="200" cy="200" rx="170" ry="34" fill="none" stroke="#D4B078" strokeWidth="2" opacity="0.7" strokeDasharray="340 1200" strokeDashoffset="-170" />
    </svg>
  );
}
