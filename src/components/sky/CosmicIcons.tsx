// Simple, cosmic line-art icons for the Sky conditions cards.
// Stroke-based, inherit `currentColor`, legible down to ~16px.

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Observing window — a telescope pointed at a star. */
export function TelescopeIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M3.4 13.1 14 8.2l2 4.2-10.6 4.9z" />
      <path d="m13 7.4 1.8-.8 1.8 3.8-1.8.8" />
      <path d="M8.5 15.4 10 19" />
      <path d="M6 16.5 7 19" />
      <circle cx="18.6" cy="5.2" r="1.3" />
    </svg>
  );
}

/** Cloud cover — a soft cloud. */
export function CloudIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M7 18h9.5a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.6-1.27A3.8 3.8 0 0 0 7 18Z" />
    </svg>
  );
}

/** Seeing (atmospheric steadiness) — a four-point twinkle. */
export function SeeingIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M12 3c.4 4.6 1.4 5.6 6 6-4.6.4-5.6 1.4-6 6-.4-4.6-1.4-5.6-6-6 4.6-.4 5.6-1.4 6-6Z" />
      <path d="M5.5 4.5c.15 1.4.45 1.7 1.8 1.85-1.35.15-1.65.45-1.8 1.85-.15-1.4-.45-1.7-1.8-1.85 1.35-.15 1.65-.45 1.8-1.85Z" />
    </svg>
  );
}
