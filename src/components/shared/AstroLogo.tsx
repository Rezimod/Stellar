interface AstroLogoProps {
  heightClass?: string;
  className?: string;
}

export default function AstroLogo({ heightClass = 'h-8', className = '' }: AstroLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" className={heightClass} style={{ width: 'auto' }}>
        <defs>
          <radialGradient id="planet" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
          <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Ring back half */}
        <ellipse cx="20" cy="22" rx="17" ry="5" stroke="url(#ring)" strokeWidth="1.5" fill="none" opacity="0.5" />
        {/* Planet */}
        <circle cx="20" cy="18" r="11" fill="url(#planet)" />
        {/* Ring front half */}
        <ellipse cx="20" cy="22" rx="17" ry="5" stroke="url(#ring)" strokeWidth="1.5" fill="none"
          strokeDasharray="27 27" strokeDashoffset="0" />
        {/* Sparkles */}
        <path d="M6 8 L6.5 9.5 L8 10 L6.5 10.5 L6 12 L5.5 10.5 L4 10 L5.5 9.5Z" fill="#38bdf8" opacity="0.9" />
        <path d="M33 4 L33.4 5.2 L34.6 5.6 L33.4 6 L33 7.2 L32.6 6 L31.4 5.6 L32.6 5.2Z" fill="#f97316" opacity="0.9" />
        <path d="M36 18 L36.3 19 L37.3 19.3 L36.3 19.6 L36 20.6 L35.7 19.6 L34.7 19.3 L35.7 19Z" fill="#c084fc" opacity="0.8" />
        <path d="M10 32 L10.3 33 L11.3 33.3 L10.3 33.6 L10 34.6 L9.7 33.6 L8.7 33.3 L9.7 33Z" fill="#f472b6" opacity="0.7" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.14em', color: 'white', fontFamily: 'Georgia, serif' }}>
        STELLAR
      </span>
    </div>
  );
}
