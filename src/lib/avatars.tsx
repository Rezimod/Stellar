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

type IconProps = { size: number; tint: string };
type IconComponent = (props: IconProps) => ReactNode;

type AvatarDef = {
  id: AvatarId;
  label: string;
  glyph: string;
  Icon: IconComponent;
  /** Solid color for legacy callers (Nav fallback, etc.) */
  tint: string;
  /** Subtle outer glow tint, used by AvatarPicker active state. */
  glow: string;
  /** Premium spherical gradient — Hub style, refined. */
  gradient: string;
};

const STROKE = 1.4;
const ICON_TINT = '#FFFFFF';

function SaturnIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="12" rx="10" ry="2.4" transform="rotate(-18 12 12)" stroke={tint} strokeWidth={STROKE} strokeOpacity="0.95" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill={tint} fillOpacity="0.22" stroke={tint} strokeWidth={STROKE} />
      <path d="M9.4 11.6h5.2M9.8 13.2h4.4" stroke={tint} strokeOpacity="0.55" strokeWidth="0.85" strokeLinecap="round" />
    </svg>
  );
}

function TelescopeIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l9-4 1.7 3.7-9 4z" stroke={tint} strokeWidth={STROKE} strokeLinejoin="round" fill={tint} fillOpacity="0.18" />
      <path d="M14 9l3 1.4" stroke={tint} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M9 16.6L11 20M11 20H8.5" stroke={tint} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.4" cy="7.2" r="1" stroke={tint} strokeWidth={STROKE} fill={tint} fillOpacity="0.35" />
    </svg>
  );
}

function CrescentIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M16.4 4.6a8 8 0 1 0 3 11.6A6.4 6.4 0 0 1 16.4 4.6z" stroke={tint} strokeWidth={STROKE} strokeLinejoin="round" fill={tint} fillOpacity="0.20" />
      <circle cx="12.6" cy="9.4" r="0.6" fill={tint} fillOpacity="0.6" />
      <circle cx="14.2" cy="13.6" r="0.5" fill={tint} fillOpacity="0.5" />
      <circle cx="11.4" cy="13.8" r="0.4" fill={tint} fillOpacity="0.45" />
    </svg>
  );
}

function NovaIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="1.8" fill={tint} />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke={tint} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M5.6 5.6l2.6 2.6M15.8 15.8l2.6 2.6M5.6 18.4l2.6-2.6M15.8 8.2l2.6-2.6" stroke={tint} strokeWidth="0.85" strokeOpacity="0.7" strokeLinecap="round" />
    </svg>
  );
}

function CometIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 7L5 19" stroke={tint} strokeWidth={STROKE} strokeLinecap="round" strokeOpacity="0.95" />
      <path d="M15.4 6.4L4.4 17.4" stroke={tint} strokeWidth="0.85" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M18.4 8.4L7 19.6" stroke={tint} strokeWidth="0.85" strokeLinecap="round" strokeOpacity="0.5" />
      <circle cx="17" cy="7" r="2.4" stroke={tint} strokeWidth={STROKE} fill={tint} fillOpacity="0.22" />
      <circle cx="17" cy="7" r="0.85" fill={tint} />
    </svg>
  );
}

function NebulaIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5c-2.4 0.6-4 2.2-4.4 4.4-0.4 2.2 0.6 4 2.4 4.6 1.4 0.45 2 1.4 1.6 2.6-0.4 1.2-1.8 1.9-3.4 1.5"
        stroke={tint}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 19.5c2.4-0.6 4-2.2 4.4-4.4 0.4-2.2-0.6-4-2.4-4.6-1.4-0.45-2-1.4-1.6-2.6 0.4-1.2 1.8-1.9 3.4-1.5"
        stroke={tint}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeOpacity="0.75"
        fill="none"
      />
      <circle cx="12" cy="12" r="1.2" fill={tint} />
      <circle cx="6" cy="6.4" r="0.5" fill={tint} fillOpacity="0.65" />
      <circle cx="18.4" cy="17.6" r="0.5" fill={tint} fillOpacity="0.65" />
    </svg>
  );
}

function OrbitIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(-22 12 12)" stroke={tint} strokeWidth={STROKE} strokeOpacity="0.95" fill="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(22 12 12)" stroke={tint} strokeWidth={STROKE} strokeOpacity="0.55" fill="none" />
      <circle cx="12" cy="12" r="2.2" fill={tint} fillOpacity="0.30" stroke={tint} strokeWidth={STROKE} />
      <circle cx="20.2" cy="9.2" r="1" fill={tint} />
    </svg>
  );
}

function ConstellationIcon({ size, tint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 8L9 12L13 9.4L17 14.6L20 7.6" stroke={tint} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.65" fill="none" />
      <circle cx="5" cy="8" r="1.1" fill={tint} />
      <circle cx="9" cy="12" r="1.3" fill={tint} />
      <circle cx="13" cy="9.4" r="1.1" fill={tint} />
      <circle cx="17" cy="14.6" r="1.2" fill={tint} />
      <circle cx="20" cy="7.6" r="1.2" fill={tint} />
      <circle cx="3.5" cy="18" r="0.45" fill={tint} fillOpacity="0.6" />
      <circle cx="20" cy="18.6" r="0.45" fill={tint} fillOpacity="0.55" />
    </svg>
  );
}

export const AVATARS: AvatarDef[] = [
  {
    id: 'initial',
    label: 'Initial',
    glyph: '✦',
    Icon: NovaIcon,
    tint: '#E8E2D2',
    glow: 'rgba(232, 226, 210, 0.18)',
    gradient: 'linear-gradient(135deg, #2C3148 0%, #15192C 100%)',
  },
  {
    id: 'planet',
    label: 'Saturn',
    glyph: '◯',
    Icon: SaturnIcon,
    tint: '#D4B886',
    glow: 'rgba(212, 184, 134, 0.24)',
    gradient: 'linear-gradient(135deg, #E8C28F 0%, #9C6E3D 100%)',
  },
  {
    id: 'telescope',
    label: 'Telescope',
    glyph: '◭',
    Icon: TelescopeIcon,
    tint: '#9BB1CC',
    glow: 'rgba(110, 145, 196, 0.26)',
    gradient: 'linear-gradient(135deg, #7298CC 0%, #2D4775 100%)',
  },
  {
    id: 'moon',
    label: 'Crescent',
    glyph: '☾',
    Icon: CrescentIcon,
    tint: '#D9D6CC',
    glow: 'rgba(212, 216, 224, 0.22)',
    gradient: 'linear-gradient(135deg, #DDE0E8 0%, #6F7588 100%)',
  },
  {
    id: 'star',
    label: 'Nova',
    glyph: '✦',
    Icon: NovaIcon,
    tint: '#D4AF6B',
    glow: 'rgba(240, 204, 122, 0.30)',
    gradient: 'linear-gradient(135deg, #F4D080 0%, #B0843A 100%)',
  },
  {
    id: 'comet',
    label: 'Comet',
    glyph: '⌁',
    Icon: CometIcon,
    tint: '#A4C8C2',
    glow: 'rgba(124, 194, 188, 0.26)',
    gradient: 'linear-gradient(135deg, #82CCC6 0%, #2E6F6A 100%)',
  },
  {
    id: 'galaxy',
    label: 'Nebula',
    glyph: '✺',
    Icon: NebulaIcon,
    tint: '#C39AA2',
    glow: 'rgba(194, 142, 151, 0.26)',
    gradient: 'linear-gradient(135deg, #C99AA3 0%, #6E3D4D 100%)',
  },
  {
    id: 'earth',
    label: 'Orbit',
    glyph: '◎',
    Icon: OrbitIcon,
    tint: '#90AABF',
    glow: 'rgba(138, 170, 208, 0.26)',
    gradient: 'linear-gradient(135deg, #8FB1D6 0%, #3D5C82 100%)',
  },
  {
    id: 'ufo',
    label: 'Constellation',
    glyph: '⁂',
    Icon: ConstellationIcon,
    tint: '#D4C18C',
    glow: 'rgba(220, 195, 136, 0.28)',
    gradient: 'linear-gradient(135deg, #DCC388 0%, #8B7340 100%)',
  },
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
  const iconSize = Math.round(size * 0.56);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: def.gradient,
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: `
          0 ${Math.round(size * 0.10)}px ${Math.round(size * 0.28)}px ${-Math.round(size * 0.10)}px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(255,255,255,0.22),
          inset 0 ${-Math.round(size * 0.12)}px ${Math.round(size * 0.26)}px rgba(0,0,0,0.28)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Spherical highlight — top-left, gives a planet-like roundness */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 30% 22%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 28%, transparent 55%)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }}
      />

      {isInitial ? (
        <span
          style={{
            position: 'relative',
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: Math.round(size * 0.42),
            color: 'var(--stl-text-bright, #E8E2D2)',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          {initial}
        </span>
      ) : (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <def.Icon size={iconSize} tint={ICON_TINT} />
        </span>
      )}
    </div>
  );
}
