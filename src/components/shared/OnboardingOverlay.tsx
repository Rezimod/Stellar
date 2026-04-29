'use client';

import { useEffect, useState } from 'react';

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('stellar_onboarded')) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem('stellar_onboarded', '1');
    setVisible(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5,8,16,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        textAlign: 'center',
        gap: 24,
        animation: 'onboardFadeIn 400ms ease-out forwards',
      }}
    >
      <style>{`
        @keyframes onboardFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <span
        style={{
          fontSize: 12,
          letterSpacing: '0.3em',
          color: 'var(--success)',
          fontFamily: 'var(--font-mono, monospace)',
          textTransform: 'uppercase',
        }}
      >
        ✦ STELLAR
      </span>

      <div style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', margin: 0 }}>
          Welcome to Stellar
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(148,163,184,1)', maxWidth: 320, margin: '8px auto 0' }}>
          The astronomy app that rewards real sky observers.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          maxWidth: 320,
          marginTop: 24,
        }}
      >
        {[
          '🌤 7-day sky forecast & planet tracker',
          '✦ Earn Stars tokens for real observations',
          '🔭 Shop telescopes from your local dealer',
        ].map((text) => (
          <div
            key={text}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 14,
              color: '#fff',
              textAlign: 'left',
            }}
          >
            {text}
          </div>
        ))}
      </div>

      <button
        onClick={dismiss}
        style={{
          background: 'linear-gradient(135deg, var(--seafoam), var(--seafoam))',
          color: '#000',
          fontWeight: 600,
          borderRadius: 12,
          padding: '12px 0',
          width: '100%',
          maxWidth: 320,
          marginTop: 24,
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        Get Started →
      </button>

      <span
        onClick={dismiss}
        style={{
          fontSize: 12,
          color: 'rgba(71,85,105,1)',
          marginTop: 12,
          cursor: 'pointer',
        }}
      >
        I know how this works
      </span>
    </div>
  );
}
