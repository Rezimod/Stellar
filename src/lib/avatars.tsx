import type { CSSProperties, ReactNode } from 'react';

export type AvatarId =
  | 'planet'
  | 'telescope'
  | 'moon'
  | 'star'
  | 'comet'
  | 'galaxy'
  | 'earth'
  | 'ufo'
  | 'initial';

type IconProps = { size: number };
type IconComponent = (props: IconProps) => ReactNode;

type AvatarDef = {
  id: AvatarId;
  label: string;
  glyph: string;
  Icon: IconComponent;
  tint: string;
};

const STROKE = 1.5;

function SaturnIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4.25" />
      <path d="M5.6 14.6c-1.4 1-2.2 2.1-1.9 2.8.6 1.5 5.7.7 11.3-1.7 5.6-2.4 9.6-5.5 9-7-.3-.7-1.7-.9-3.5-.6" />
    </svg>
  );
}

function TelescopeIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 11.5l9-4.2 2.4 5.2-9 4.2z" />
      <path d="M14.7 8.3l3 1.4" />
      <path d="M9.5 16.7L11 20" />
      <path d="M7 16.2L8.5 19.5" />
      <path d="M11 20h-3" />
      <circle cx="18.4" cy="6.3" r="1.4" />
    </svg>
  );
}

function CrescentIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16.5 4.5a8 8 0 1 0 3 11.6A6.5 6.5 0 0 1 16.5 4.5z" />
    </svg>
  );
}

function NovaIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.5L13.4 10.6L20.5 12L13.4 13.4L12 20.5L10.6 13.4L3.5 12L10.6 10.6Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 6.5v3" />
      <path d="M12 14.5v3" />
      <path d="M6.5 12h3" />
      <path d="M14.5 12h3" />
    </svg>
  );
}

function CometIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="16.5" cy="7.5" r="2.6" fill="currentColor" fillOpacity="0.14" />
      <path d="M14.6 9.4l-9 9" />
      <path d="M11 9l-6 6" />
      <path d="M15.5 12.5l-5 5" />
    </svg>
  );
}

function NebulaIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5.5 14.5c-1.5-2.5-.5-5.5 2-6.5 1.5-.6 3 .1 3.5 1 .8-1.6 2.6-2.6 4.5-2 2.4.7 3.6 3.2 2.8 5.5-.6 1.7-2.2 3-4 3H8c-1 0-2-.4-2.5-1z" />
      <circle cx="9" cy="6.5" r="0.6" fill="currentColor" />
      <circle cx="17.5" cy="16.5" r="0.6" fill="currentColor" />
      <circle cx="6" cy="18" r="0.6" fill="currentColor" />
    </svg>
  );
}

function OrbitIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-25 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(25 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ConstellationIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 7.5L9 12l3.5-3 4 5.5 3-7" />
      <circle cx="4.5" cy="7.5" r="1.3" fill="currentColor" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="9" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" />
      <circle cx="19.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export const AVATARS: AvatarDef[] = [
  { id: 'initial',   label: 'Initial',       glyph: 'A',  Icon: NovaIcon,          tint: 'var(--stl-text-bright)' },
  { id: 'planet',    label: 'Saturn',        glyph: '◯',  Icon: SaturnIcon,        tint: 'var(--stl-gold)' },
  { id: 'telescope', label: 'Telescope',     glyph: '◭',  Icon: TelescopeIcon,     tint: 'var(--stl-text-bright)' },
  { id: 'moon',      label: 'Crescent',      glyph: '☾',  Icon: CrescentIcon,      tint: 'var(--stl-text-bright)' },
  { id: 'star',      label: 'Nova',          glyph: '✦',  Icon: NovaIcon,          tint: 'var(--stl-gold)' },
  { id: 'comet',     label: 'Comet',         glyph: '⌁',  Icon: CometIcon,         tint: 'var(--stl-green)' },
  { id: 'galaxy',    label: 'Nebula',        glyph: '✺',  Icon: NebulaIcon,        tint: 'var(--stl-green)' },
  { id: 'earth',     label: 'Orbit',         glyph: '◎',  Icon: OrbitIcon,         tint: 'var(--stl-text-bright)' },
  { id: 'ufo',       label: 'Constellation', glyph: '⁂',  Icon: ConstellationIcon, tint: 'var(--stl-gold)' },
];

export function avatarById(id: string | null | undefined): AvatarDef {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0];
}

type AvatarProps = {
  avatarId?: string | null;
  initial?: string;
  size?: number;
  style?: CSSProperties;
  children?: ReactNode;
};

export function Avatar({ avatarId, initial = '✦', size = 72, style }: AvatarProps) {
  const def = avatarById(avatarId ?? 'initial');
  const isInitial = def.id === 'initial';
  const iconSize = Math.round(size * 0.55);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--stl-bg-surface)',
        border: '1px solid var(--stl-border-regular)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        color: def.tint,
        ...style,
      }}
    >
      {isInitial ? (
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: Math.round(size * 0.42),
            color: 'var(--stl-text-bright)',
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      ) : (
        <def.Icon size={iconSize} />
      )}
    </div>
  );
}
