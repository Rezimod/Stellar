import React from 'react';

export interface MarketIconProps {
  size?: number;
  className?: string;
}

function Base({
  size = 18,
  className,
  children,
}: MarketIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function MeteorIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M4 16l3-5 2.5 3L13 8l3 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1" />
    </Base>
  );
}

export function SunIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10 3v2M10 15v2M3 10h2M15 10h2M5.05 5.05l1.41 1.41M13.54 13.54l1.41 1.41M5.05 14.95l1.41-1.41M13.54 6.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Base>
  );
}

export function AuroraIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M3 14c2-4 5-8 7-8s5 4 7 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5 14c1.5-3 3.5-5 5-5s3.5 2 5 5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </Base>
  );
}

export function RocketIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M10 3v4M8 5l2-2 2 2M7 9h6v6l-3 2-3-2z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function TelescopeIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6 14l4 3 4-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function StarBurstIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M10 3l1.5 4L16 8l-3 3 .8 4.5L10 13l-3.8 2.5.8-4.5-3-3 4.5-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function CometIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <circle cx="14" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M11 10L4 4M11 12L3 7M12 14L5 11"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </Base>
  );
}

export function CloudIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M6 15a3 3 0 01-.5-5.96A5 5 0 0115 10a3 3 0 01.5 5.96"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M10 15v2M7 15v1.5M13 15v1.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </Base>
  );
}

export function CryptoIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 6v8M11.5 6v8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M7 7.8h4.5a1.6 1.6 0 0 1 0 3.2H7M7 11h5a1.6 1.6 0 0 1 0 3.2H7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function TrophyIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M6 4h8v3.5a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.5H4.5a1.5 1.5 0 0 0 0 3H6M14 5.5h1.5a1.5 1.5 0 0 1 0 3H14"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M10 11.5v3M7.5 17h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Base>
  );
}

export function ChipIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8" y="8" width="4" height="4" stroke="currentColor" strokeWidth="1" />
      <path
        d="M3 8h2M3 12h2M15 8h2M15 12h2M8 3v2M12 3v2M8 15v2M12 15v2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </Base>
  );
}

export function GovernmentIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M3 8l7-4 7 4M4 8v8M16 8v8M3 17h14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 9v6M10 9v6M13 9v6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </Base>
  );
}

export function FilmIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3 9h2M3 12h2M15 9h2M15 12h2M7 5v11M13 5v11"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </Base>
  );
}

export function ChartIcon(props: MarketIconProps) {
  return (
    <Base {...props}>
      <path
        d="M3 16h14M5 13l3-3 3 2 4-5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="7" r="1" fill="currentColor" />
    </Base>
  );
}

type IconComp = React.FC<MarketIconProps>;

export const CATEGORY_ICONS: Record<string, IconComp> = {
  meteor: MeteorIcon,
  solar: SunIcon,
  mission: RocketIcon,
  comet: CometIcon,
  discovery: StarBurstIcon,
  weather: CloudIcon,
  weather_event: CloudIcon,
  natural_phenomenon: AuroraIcon,
  sky_event: TelescopeIcon,
  crypto: CryptoIcon,
  sports: TrophyIcon,
  tech: ChipIcon,
  politics: GovernmentIcon,
  entertainment: FilmIcon,
  economy: ChartIcon,
};

export function getCategoryIcon(category: string): IconComp {
  return CATEGORY_ICONS[category] ?? TelescopeIcon;
}
