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
};

export function getCategoryIcon(category: string): IconComp {
  return CATEGORY_ICONS[category] ?? TelescopeIcon;
}
