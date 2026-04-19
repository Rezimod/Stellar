'use client';

import type { Mission } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

interface Props {
  mission: Mission;
  Art: React.ComponentType<{ size?: number }>;
  metaLine: string;
  badge?: { label: string; color: string; bg: string };
  isPrime?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function MissionListRow({ mission, Art, metaLine, badge, isPrime, disabled, onClick }: Props) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className="relative w-full flex items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-55 disabled:cursor-default"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {isPrime && (
        <span
          className="absolute left-0 top-3.5 bottom-3.5 w-[2px] rounded-r-sm"
          style={{ background: 'var(--stl-gold)' }}
        />
      )}

      <div
        className="flex-shrink-0 relative flex items-center justify-center"
        style={{ width: 56, height: 56 }}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: disabled
              ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 62%)'
              : 'radial-gradient(circle at 50% 50%, rgba(255,209,102,0.09) 0%, transparent 62%)',
            filter: 'blur(2px)',
          }}
        />
        <Art size={54} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 19,
              color: '#F2F0EA',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {mission.name}
          </span>
          {badge && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: badge.color,
                letterSpacing: '0.15em',
                background: badge.bg,
                padding: '2px 5px',
                borderRadius: 3,
                fontWeight: 500,
              }}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.05em',
          }}
        >
          {metaLine}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            color: 'var(--stl-gold)',
            fontWeight: 700,
          }}
        >
          +{mission.stars} ✦
        </span>
        <ChevronRight size={11} color="rgba(255,255,255,0.35)" />
      </div>
    </button>
  );
}
