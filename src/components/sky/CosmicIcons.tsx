// Cosmic icons for the Sky conditions cards. Bold, filled glyphs that inherit
// `currentColor` (so they pick up each card's ring colour) with a white sheen
// and small sparkle accents — legible and lively down to ~18px.

interface IconProps {
  size?: number;
  className?: string;
}

/** Observing window — a telescope aimed at a star. */
export function TelescopeIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="currentColor">
        {/* tube */}
        <rect x="5.2" y="9.4" width="12.4" height="4.4" rx="2.2" transform="rotate(-24 11.4 11.6)" />
        {/* objective end cap */}
        <rect x="14.4" y="6.6" width="3.4" height="4.6" rx="1.7" transform="rotate(-24 16.1 8.9)" opacity="0.75" />
      </g>
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none">
        <path d="M9.1 14.3 7.9 19" />
        <path d="M11.2 13.5 13.1 18.4" />
        <path d="M8.2 18.9h5" opacity="0.55" />
      </g>
      {/* target star */}
      <path d="M19.4 3.2l.62 1.76 1.76.62-1.76.62-.62 1.76-.62-1.76-1.76-.62 1.76-.62z" style={{ fill: 'rgba(var(--ink), 0.92)' }} />
    </svg>
  );
}

/** Cloud cover — a soft, solid cloud. */
export function CloudIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.3 18h8.9a3.4 3.4 0 0 0 .5-6.77 5 5 0 0 0-9.5-1.2A3.7 3.7 0 0 0 7.3 18Z"
      />
      <path
        fill="#fff"
        opacity="0.22"
        d="M7.3 11.2a3.7 3.7 0 0 0-.7 4.1 3.7 3.7 0 0 1 1.7-4.7 5 5 0 0 1 8.2-1 5 5 0 0 0-9.2 1.6Z"
      />
    </svg>
  );
}

/** Seeing (atmospheric steadiness) — a glowing twinkle. */
export function SeeingIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.6c.55 5.1 1.7 6.25 6.8 6.8-5.1.55-6.25 1.7-6.8 6.8-.55-5.1-1.7-6.25-6.8-6.8 5.1-.55 6.25-1.7 6.8-6.8Z"
      />
      <path
        fill="currentColor"
        opacity="0.85"
        d="M6.4 14.8c.18 1.7.55 2.07 2.25 2.25-1.7.18-2.07.55-2.25 2.25-.18-1.7-.55-2.07-2.25-2.25 1.7-.18 2.07-.55 2.25-2.25Z"
      />
      <path fill="#fff" opacity="0.5" d="M12 6c.25 2.3.85 2.9 3.15 3.15-2.3.25-2.9.85-3.15 3.15-.25-2.3-.85-2.9-3.15-3.15C11.15 8.9 11.75 8.3 12 6Z" />
    </svg>
  );
}
