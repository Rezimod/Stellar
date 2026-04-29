'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useStellarAuth } from '@/hooks/useStellarAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { loginWithEmail, connectWallet } = useStellarAuth();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Stellar"
    >
      <div
        className="relative w-full max-w-[400px] mx-4 rounded-2xl p-6"
        style={{
          background: 'var(--canvas)',
          border: '1px solid rgba(232,230,221,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4"
          style={{ color: 'rgba(232,230,221,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        <h2
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 22,
            color: '#E8E6DD',
            margin: '0 0 4px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Welcome to Stellar
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(232,230,221,0.6)', margin: '0 0 24px', lineHeight: 1.4 }}>
          Sign in to start observing the night sky.
        </p>

        <button
          type="button"
          onClick={() => {
            loginWithEmail();
            onClose();
          }}
          style={{
            width: '100%',
            background: 'var(--terracotta)',
            color: '#1a1208',
            fontSize: 13,
            fontWeight: 600,
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Continue with email
        </button>

        <p style={{ fontSize: 11, color: 'rgba(232,230,221,0.4)', textAlign: 'center', margin: '0 0 20px' }}>
          Email, Google, or SMS · embedded wallet created automatically
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 20px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(232,230,221,0.08)' }} />
          <span
            style={{
              fontSize: 10,
              color: 'rgba(232,230,221,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            or
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(232,230,221,0.08)' }} />
        </div>

        <button
          type="button"
          onClick={() => {
            connectWallet();
            onClose();
          }}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#E8E6DD',
            fontSize: 13,
            fontWeight: 500,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid rgba(232,230,221,0.2)',
            cursor: 'pointer',
          }}
        >
          Connect wallet
        </button>

        <p style={{ fontSize: 11, color: 'rgba(232,230,221,0.4)', textAlign: 'center', margin: '8px 0 0' }}>
          Phantom, Solflare, Backpack, Glow
        </p>
        <p style={{ fontSize: 10, color: 'rgba(232,230,221,0.3)', textAlign: 'center', margin: '4px 0 0', lineHeight: 1.45 }}>
          MetaMask is Ethereum-only and can&rsquo;t sign Solana transactions here.
        </p>
      </div>
    </div>
  );
}
