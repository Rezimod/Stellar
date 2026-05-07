'use client';

import { useState, useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'reward';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  exiting: boolean;
}

// Module-level store — no Provider needed
const store: { toasts: ToastItem[]; listeners: Set<() => void> } = {
  toasts: [],
  listeners: new Set(),
};

function notify() {
  store.listeners.forEach((fn) => fn());
}

function dismiss(id: string) {
  store.toasts = store.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t));
  notify();
  setTimeout(() => {
    store.toasts = store.toasts.filter((t) => t.id !== id);
    notify();
  }, 260);
}

export function toast(message: string, variant: ToastVariant = 'info', duration?: number) {
  const id = Math.random().toString(36).slice(2);
  const d = duration ?? (variant === 'error' ? 8000 : 4000);
  store.toasts = [...store.toasts, { id, message, variant, duration: d, exiting: false }];
  notify();
  setTimeout(() => dismiss(id), d);
}

// Convenience shorthands
toast.success = (msg: string, duration?: number) => toast(msg, 'success', duration);
toast.error   = (msg: string, duration?: number) => toast(msg, 'error',   duration);
toast.info    = (msg: string, duration?: number) => toast(msg, 'info',    duration);
toast.reward  = (msg: string, duration?: number) => toast(msg, 'reward',  duration);

// Colour map
const variantStyles: Record<ToastVariant, { border: string; icon: string; bg: string }> = {
  success: {
    bg:     'rgba(15, 29, 50, 0.92)',
    border: 'rgba(94, 234, 212, 0.35)',
    icon:   'var(--success)',
  },
  error: {
    bg:     'rgba(15, 29, 50, 0.92)',
    border: 'rgba(251, 113, 133, 0.35)',
    icon:   'var(--negative)',
  },
  info: {
    bg:     'rgba(15, 29, 50, 0.92)',
    border: 'rgba(255, 179, 71, 0.35)',
    icon:   'var(--terracotta)',
  },
  reward: {
    bg:     'rgba(15, 29, 50, 0.92)',
    border: 'rgba(255, 179, 71, 0.40)',
    icon:   'var(--stars)',
  },
};

const variantIcons: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  info:    'i',
  reward:  '★',
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const update = () => setToasts([...store.toasts]);
    store.listeners.add(update);
    return () => { store.listeners.delete(update); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-toast, 60)' as React.CSSProperties['zIndex'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        width: 'min(340px, calc(100vw - 32px))',
      }}
    >
      {toasts.map((t) => {
        const styles = variantStyles[t.variant];
        return (
          <div
            key={t.id}
            className={t.exiting ? 'animate-toast-out' : 'animate-toast-in'}
            style={{
              width: '100%',
              background: styles.bg,
              border: `1px solid ${styles.border}`,
              borderRadius: 12,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
            onClick={() => dismiss(t.id)}
          >
            <span
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `1.5px solid ${styles.icon}`,
                color: styles.icon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {variantIcons[t.variant]}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--color-text-primary)',
              }}
            >
              {t.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
