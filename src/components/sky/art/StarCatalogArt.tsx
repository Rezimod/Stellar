export default function StarCatalogArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="star-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.3" stopColor="#5EEAD4" stopOpacity="0.6" />
          <stop offset="1" stopColor="#060912" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="180" r="40" fill="url(#star-glow)" />
      <circle cx="150" cy="220" r="32" fill="url(#star-glow)" />
      <circle cx="250" cy="230" r="36" fill="url(#star-glow)" />
      <circle cx="180" cy="260" r="24" fill="url(#star-glow)" />
      <circle cx="230" cy="170" r="28" fill="url(#star-glow)" />
      <circle cx="120" cy="180" r="20" fill="url(#star-glow)" />
      <circle cx="280" cy="200" r="22" fill="url(#star-glow)" />
      <circle cx="200" cy="180" r="3" fill="#fff" />
      <circle cx="150" cy="220" r="2.5" fill="#fff" />
      <circle cx="250" cy="230" r="2.5" fill="#fff" />
      <circle cx="180" cy="260" r="2" fill="#fff" />
      <circle cx="230" cy="170" r="2" fill="#fff" />
    </svg>
  );
}
