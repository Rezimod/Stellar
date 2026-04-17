export default function MoonArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moon-body" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#EEEAE1" />
          <stop offset="0.7" stopColor="#9A9588" />
          <stop offset="1" stopColor="#3E3A33" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="140" fill="url(#moon-body)" />
      <circle cx="160" cy="150" r="16" fill="#7A7568" opacity="0.5" />
      <circle cx="245" cy="215" r="11" fill="#7A7568" opacity="0.4" />
      <circle cx="195" cy="250" r="8" fill="#7A7568" opacity="0.5" />
      <circle cx="260" cy="165" r="5" fill="#7A7568" opacity="0.4" />
      <circle cx="140" cy="225" r="6" fill="#7A7568" opacity="0.35" />
      <path d="M 200 60 A 140 140 0 0 1 200 340 A 84 140 0 0 0 200 60" fill="#060912" opacity="0.5" />
    </svg>
  );
}
