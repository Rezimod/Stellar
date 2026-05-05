'use client';

import { useEffect } from 'react';

export default function ComingSoonOverlay() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const swallow = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      aria-hidden={false}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(11, 14, 23, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    >
      <div
        role="presentation"
        aria-disabled="true"
        tabIndex={-1}
        onClick={swallow}
        onMouseDown={swallow}
        onPointerDown={swallow}
        onTouchStart={swallow}
        onTouchMove={swallow}
        onTouchEnd={swallow}
        onKeyDown={swallow}
        style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: 'clamp(1rem, 2.4vw, 1.25rem)',
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: 'rgba(255, 255, 255, 0.92)',
          background: 'rgba(26, 31, 46, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 9999,
          padding: '0.75rem 1.75rem',
          cursor: 'not-allowed',
          userSelect: 'none',
          pointerEvents: 'auto',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        Coming soon
      </div>
    </div>
  );
}
