'use client';

export default function PageLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-space-black, #050A12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 'var(--z-overlay, 40)' as React.CSSProperties['zIndex'],
      }}
    >
      {/* Orbital ring */}
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-dot-orbit"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 7,
              height: 7,
              marginTop: -3.5,
              marginLeft: -3.5,
              borderRadius: '50%',
              background: 'var(--color-nebula-teal, #38F0FF)',
              opacity: 1 - i * 0.25,
              animationDelay: `${-(i * 0.4)}s`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-display, sans-serif)',
        }}
      >
        Loading...
      </span>
    </div>
  );
}
