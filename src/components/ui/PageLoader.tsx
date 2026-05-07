'use client';

const STARS: { x: string; y: string; size: number; opacity: number; dur: number; delay: number }[] = [
  { x: '8%',  y: '12%', size: 2,   opacity: 0.7, dur: 2.1, delay: 0   },
  { x: '83%', y: '18%', size: 1.5, opacity: 0.5, dur: 3.2, delay: 0.5 },
  { x: '18%', y: '72%', size: 1,   opacity: 0.55, dur: 2.7, delay: 1  },
  { x: '77%', y: '67%', size: 2,   opacity: 0.65, dur: 1.9, delay: 0.3 },
  { x: '91%', y: '82%', size: 1,   opacity: 0.4, dur: 3.5, delay: 0.8 },
  { x: '4%',  y: '52%', size: 1.5, opacity: 0.5, dur: 2.3, delay: 1.2 },
  { x: '62%', y: '8%',  size: 1,   opacity: 0.6, dur: 2.8, delay: 0.2 },
  { x: '42%', y: '90%', size: 2,   opacity: 0.45, dur: 3.1, delay: 0.7 },
  { x: '30%', y: '25%', size: 1,   opacity: 0.35, dur: 2.5, delay: 1.5 },
  { x: '55%', y: '78%', size: 1.5, opacity: 0.5, dur: 2.0, delay: 0.4 },
];

export default function PageLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        zIndex: 'var(--z-overlay, 40)' as React.CSSProperties['zIndex'],
        overflow: 'hidden',
      }}
    >
      {/* Twinkling stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: 'white',
            left: s.x,
            top: s.y,
            opacity: s.opacity,
            animation: `twinkle-loader ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* Planet system */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>

        {/* Outer atmospheric glow */}
        <div
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 179, 71,0.22) 0%, rgba(99,60,220,0.08) 50%, transparent 70%)',
            animation: 'planet-glow-breathe 2.8s ease-in-out infinite',
          }}
        />

        {/* Ring — back arc (behind planet, lower z) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 148,
            height: 44,
            marginLeft: -74,
            marginTop: -22,
            border: '2.5px solid rgba(255, 179, 71,0.45)',
            borderRadius: '50%',
            transform: 'rotateX(74deg)',
            boxShadow: '0 0 16px rgba(255, 179, 71,0.2)',
            zIndex: 1,
            animation: 'ring-shimmer-loader 2.8s ease-in-out infinite',
          }}
        />

        {/* Planet body */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 84,
            height: 84,
            marginLeft: -42,
            marginTop: -42,
            borderRadius: '50%',
            background: `
              radial-gradient(ellipse at 32% 30%,
                var(--terracotta) 0%,
                var(--terracotta) 28%,
                var(--terracotta) 52%,
                var(--terracotta) 78%,
                var(--canvas) 100%
              )
            `,
            boxShadow: '0 0 32px rgba(255, 179, 71,0.55), 0 0 8px rgba(255, 179, 71,0.35), inset -8px -8px 20px rgba(0,0,0,0.5)',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {/* Surface atmosphere bands */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `repeating-linear-gradient(
                180deg,
                transparent             0px,
                transparent            10px,
                rgba(255,255,255,0.04)  10px,
                rgba(255,255,255,0.04)  11px,
                transparent            11px,
                transparent            18px,
                rgba(255,255,255,0.025) 18px,
                rgba(255,255,255,0.025) 19px
              )`,
            }}
          />
          {/* Specular highlight */}
          <div
            style={{
              position: 'absolute',
              top: 11,
              left: 14,
              width: 22,
              height: 13,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.38) 0%, transparent 100%)',
              filter: 'blur(3px)',
            }}
          />
          {/* Secondary soft glow (limb brightening) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 68% 68%, rgba(94, 234, 212,0.12) 0%, transparent 60%)',
            }}
          />
        </div>

        {/* Moon orbit arm */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 118,
            height: 118,
            marginLeft: -59,
            marginTop: -59,
            animation: 'moon-orbit-loader 3.2s linear infinite',
            zIndex: 3,
          }}
        >
          {/* Moon */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              marginLeft: -5,
              marginTop: -5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #e2e8f0, var(--text-muted) 60%, var(--text-muted) 100%)',
              boxShadow: '0 0 10px rgba(148,163,184,0.7)',
            }}
          />
        </div>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          color: 'rgba(255, 179, 71,0.8)',
          letterSpacing: '0.2em',
          fontFamily: 'var(--font-display, sans-serif)',
          textTransform: 'uppercase',
          animation: 'label-pulse-loader 2.8s ease-in-out infinite',
        }}
      >
        STELLAR
      </span>
    </div>
  );
}
