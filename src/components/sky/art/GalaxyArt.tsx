export default function GalaxyArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gal-body" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.15" stopColor="var(--stars)" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#8465CB" stopOpacity="0.35" />
          <stop offset="1" stopColor="#060912" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(200 200) rotate(-28)">
        <ellipse cx="0" cy="0" rx="180" ry="52" fill="url(#gal-body)" />
        <ellipse cx="0" cy="0" rx="135" ry="34" fill="url(#gal-body)" opacity="0.8" />
        <ellipse cx="0" cy="0" rx="60" ry="18" fill="var(--stars)" opacity="0.5" />
      </g>
    </svg>
  );
}
