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
        background: 'rgba(3,6,18,0.78)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--stl-bg-base)',
          border: '1px solid var(--stl-border-regular)',
          borderRadius: 'var(--stl-r-lg)',
          padding: '20px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="stl-mono-kicker" style={{ color: 'var(--stl-text-dim)', marginBottom: 6 }}>
              SELECT AVATAR
            </div>
            <p className="stl-display-md" style={{ color: 'var(--stl-text-bright)', margin: 0 }}>
              Choose your sigil
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'transparent', border: '1px solid var(--stl-border-regular)',
              color: 'var(--stl-text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
            gap: 12,
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
                  background: 'transparent', border: 'none', padding: '8px 4px',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                  borderRadius: 12,
                  outline: isActive ? '1px solid var(--stl-gold)' : '1px solid transparent',
                  outlineOffset: 2,
                  transition: 'outline-color 0.15s',
                }}
              >
                <Avatar avatarId={a.id} initial={initial} size={56} />
                <span
                  className="stl-mono-data"
                  style={{
                    color: isActive ? 'var(--stl-gold)' : 'var(--stl-text-dim)',
                    textTransform: 'uppercase',
                    fontSize: 9,
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
