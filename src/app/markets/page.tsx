'use client';

import PageTransition from '@/components/ui/PageTransition';

export default function MarketsPage() {
  return (
    <PageTransition>
      <div
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, rgba(120, 130, 150, 0.08) 0%, rgba(11, 14, 23, 0) 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <h1
          style={{
            position: 'relative',
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontWeight: 400,
            fontSize: 'clamp(2.75rem, 8vw, 5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'rgba(255, 255, 255, 0.72)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Coming soon
        </h1>
      </div>
    </PageTransition>
  );
}
