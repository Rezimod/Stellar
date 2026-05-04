'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { AVATARS, Avatar, type AvatarId } from '@/lib/avatars';

type Props = {
  open: boolean;
  current: string | null;
  initial: string;
  saving?: boolean;
  onClose: () => void;
  onSelect: (id: AvatarId) => void;
};

export function AvatarPicker({ open, current, initial, saving, onClose, onSelect }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(3,6,18,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--stl-bg-surface)',
          border: '1px solid var(--stl-border-regular)',
          borderRadius: 'var(--stl-r-lg)',
          padding: '22px 22px 20px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--stl-bg-surface)',
            border: '1px solid var(--stl-border-regular)',
            color: 'var(--stl-text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <X size={14} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--stl-text-dim)',
              marginBottom: 6,
            }}
          >
            SELECT AVATAR
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--stl-text-bright)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Choose your sigil
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
            gap: 10,
          }}
        >
          {AVATARS.map(a => {
            const isActive = (current ?? 'initial') === a.id;
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                disabled={saving}
                aria-pressed={isActive}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 8px',
                  background: 'var(--stl-bg-surface)',
                  border: `1px solid ${isActive ? 'var(--stl-gold)' : 'var(--stl-border-regular)'}`,
                  borderRadius: 'var(--stl-r-md)',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                  boxShadow: isActive ? '0 0 0 1px var(--stl-gold)' : 'none',
                  transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
                }}
                onMouseEnter={e => {
                  if (saving || isActive) return;
                  e.currentTarget.style.background = 'var(--stl-bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--stl-border-strong)';
                }}
                onMouseLeave={e => {
                  if (saving || isActive) return;
                  e.currentTarget.style.background = 'var(--stl-bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--stl-border-regular)';
                }}
              >
                <Avatar avatarId={a.id} initial={initial} size={44} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--stl-gold)' : 'var(--stl-text-dim)',
                    lineHeight: 1,
                  }}
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
