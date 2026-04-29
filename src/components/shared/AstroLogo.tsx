interface AstroLogoProps {
  heightClass?: string;
  className?: string;
  /** Rendered size in px (square). */
  size?: number;
  /** 'white' for dark surfaces (default), 'black' for light surfaces. */
  variant?: 'white' | 'black';
  /** Show the STELLAR wordmark next to the mark. */
  showWordmark?: boolean;
}

export default function AstroLogo({
  className = '',
  size = 28,
  variant = 'white',
  showWordmark = true,
}: AstroLogoProps) {
  const fg = variant === 'black' ? 'var(--canvas)' : 'var(--text)';
  const bg = variant === 'black' ? 'var(--text)' : 'var(--canvas)';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-72 -72 144 144"
        width={size}
        height={size}
        aria-label="Stellar logo"
        role="img"
      >
        <circle cx="0" cy="0" r="56" stroke={fg} strokeWidth="2.4" fill="none" />
        <g transform="rotate(14)">
          <circle cx="0" cy="-21" r="21" fill={fg} />
          <circle cx="0" cy="21" r="21" fill={fg} />
          <circle cx="21" cy="-21" r="12.5" fill={bg} />
          <circle cx="-21" cy="21" r="12.5" fill={bg} />
        </g>
      </svg>
      {showWordmark && (
        <span
          style={{
            fontWeight: 400,
            fontSize: 15,
            letterSpacing: '0.3em',
            color: fg,
            fontFamily: 'Georgia, serif',
          }}
        >
          STELLAR
        </span>
      )}
    </div>
  );
}
