import type { CSSProperties, ReactNode } from 'react';

export type AvatarId = 'planet' | 'telescope' | 'moon' | 'star' | 'comet' | 'galaxy' | 'earth' | 'ufo' | 'initial';

type AvatarDef = {
  id: AvatarId;
  label: string;
  glyph: string;
  ring: string;
};

export const AVATARS: AvatarDef[] = [
  { id: 'initial',   label: 'Initial',   glyph: 'A', ring: 'linear-gradient(135deg,#FFD166,#F59E0B)' },
  { id: 'planet',    label: 'Saturn',    glyph: '🪐', ring: 'linear-gradient(135deg,#FFD166,#CC9A33)' },
  { id: 'telescope', label: 'Telescope', glyph: '🔭', ring: 'linear-gradient(135deg,#34d399,#0ea5e9)' },
  { id: 'moon',      label: 'Moon',      glyph: '🌙', ring: 'linear-gradient(135deg,#E8ECF4,#9CA3AF)' },
  { id: 'star',      label: 'Star',      glyph: '✦',  ring: 'linear-gradient(135deg,#FFD166,#FF8FB8)' },
  { id: 'comet',     label: 'Comet',     glyph: '☄️', ring: 'linear-gradient(135deg,#38F0FF,#8465CB)' },
  { id: 'galaxy',    label: 'Galaxy',    glyph: '🌌', ring: 'linear-gradient(135deg,#8465CB,#FF8FB8)' },
  { id: 'earth',     label: 'Earth',     glyph: '🌍', ring: 'linear-gradient(135deg,#0ea5e9,#34d399)' },
  { id: 'ufo',       label: 'UFO',       glyph: '🛸', ring: 'linear-gradient(135deg,#34d399,#FFD166)' },
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
  const padding = Math.max(2, Math.round(size / 30));
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          padding,
          background: def.ring,
        }}
      >
        <div
          style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--stl-bg-deep, #030612)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {isInitial ? (
            <span style={{
              fontWeight: 700,
              fontSize: Math.round(size * 0.42),
              color: 'var(--stl-text-bright)',
              fontFamily: 'var(--font-serif)',
              lineHeight: 1,
            }}>
              {initial}
            </span>
          ) : (
            <span style={{
              fontSize: Math.round(size * 0.5),
              lineHeight: 1,
              filter: 'saturate(0.95)',
            }}>
              {def.glyph}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
