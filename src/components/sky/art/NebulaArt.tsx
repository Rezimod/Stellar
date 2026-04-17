export default function NebulaArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="neb-body" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#FF8FB8" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#8465CB" stopOpacity="0.5" />
          <stop offset="1" stopColor="#060912" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="200" rx="170" ry="120" fill="url(#neb-body)" />
      <circle cx="180" cy="190" r="3" fill="#fff" />
      <circle cx="220" cy="180" r="2.5" fill="#fff" />
      <circle cx="200" cy="210" r="4" fill="#fff" />
      <circle cx="170" cy="220" r="2" fill="#fff" opacity="0.7" />
      <circle cx="240" cy="215" r="2" fill="#fff" opacity="0.8" />
      <circle cx="195" cy="170" r="1.5" fill="#fff" opacity="0.6" />
    </svg>
  );
}
