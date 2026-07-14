'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('profileUi');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const overlay = (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(3,6,18,0.82)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--stl-bg-surface)',
          border: '1px solid var(--stl-border-regular)',
          borderRadius: 'var(--stl-r-lg)',
          padding: '22px 22px 24px',
          position: 'relative',
          boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('avatar.close')}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--stl-bg-elevated)',
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
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--stl-text-muted)', marginBottom: 6,
            }}
          >
            {t('avatar.pick')}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19, fontWeight: 500,
              color: 'var(--stl-text-bright)',
              margin: 0, lineHeight: 1.15,
            }}
          >
            {t('avatar.heading')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))',
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
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '12px 8px',
                  background: isActive ? 'var(--stl-bg-elevated)' : 'var(--stl-bg-surface)',
                  border: `1px solid ${isActive ? 'var(--stl-gold)' : 'var(--stl-border-regular)'}`,
                  borderRadius: 'var(--stl-r-md)',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                  boxShadow: isActive ? `0 0 0 1px var(--stl-gold), 0 0 24px ${a.glow}` : 'none',
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
                <Avatar avatarId={a.id} initial={initial} size={48} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5, fontWeight: 600,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: isActive ? 'var(--stl-gold)' : 'var(--stl-text-dim)',
                    lineHeight: 1, textAlign: 'center',
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

  return createPortal(overlay, document.body);
}
