'use client';

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto sm:pb-0"
      style={{
        background: 'rgba(7,11,20,0.85)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)',
      }}
    >
      {/* Mobile */}
      <div className="sm:hidden flex items-center justify-center px-4 py-4">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span style={{ color: '#FFD166', fontSize: 13, letterSpacing: '0.2em', fontWeight: 800, fontFamily: 'monospace' }}>
            ✦ STELLAR
          </span>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, margin: 0, letterSpacing: '0.04em' }}>
            Built on Solana
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex max-w-5xl mx-auto px-6 py-6 items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-center">
          <span style={{ color: '#FFD166', fontSize: 16, letterSpacing: '0.22em', fontWeight: 800, fontFamily: 'monospace' }}>
            ✦ STELLAR
          </span>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
            Observe the Night Sky
          </p>
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: 0 }}>
            © 2026 · Built on Solana
          </p>
        </div>
      </div>
    </footer>
  );
}
