'use client';

interface MintAnimationProps {
  done: boolean;
  slowMsg?: boolean;
}

export default function MintAnimation({ done, slowMsg }: MintAnimationProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#070B14] flex flex-col items-center justify-center gap-10 px-6 text-center">

      {/* Ring stack */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>

        {/* Pulse ring */}
        {!done && (
          <div className="absolute rounded-full animate-ping" style={{
            width: 160, height: 160,
            border: '1px solid rgba(255,209,102,0.07)',
            animationDuration: '2.4s',
          }} />
        )}

        {/* Outer ring — slow spin with tick dots */}
        <div
          className={`absolute rounded-full ${!done ? 'animate-spin' : ''}`}
          style={{
            width: 140, height: 140,
            border: `1px solid ${done ? 'rgba(52,211,153,0.25)' : 'rgba(255,209,102,0.14)'}`,
            animationDuration: '9s',
            transition: 'border-color 0.6s',
          }}
        >
          {!done && [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 2, height: 2, borderRadius: '50%',
              background: 'rgba(255,209,102,0.25)',
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateY(-69px) translate(-50%,-50%)`,
            }} />
          ))}
        </div>

        {/* Mid ring — fast conic arc */}
        {!done ? (
          <div
            className="absolute rounded-full animate-spin"
            style={{
              width: 112, height: 112,
              animationDuration: '1.4s',
              background: 'conic-gradient(from 0deg, transparent 65%, rgba(255,209,102,0.95) 83%, rgba(56,240,255,0.6) 100%)',
              WebkitMask: 'radial-gradient(circle, transparent 51px, black 52px)',
              mask: 'radial-gradient(circle, transparent 51px, black 52px)',
            }}
          />
        ) : (
          <div className="absolute rounded-full" style={{
            width: 112, height: 112,
            border: '1.5px solid rgba(52,211,153,0.45)',
            boxShadow: '0 0 28px rgba(52,211,153,0.18), inset 0 0 16px rgba(52,211,153,0.06)',
          }} />
        )}

        {/* Counter-spin thin ring */}
        {!done && (
          <div
            className="absolute rounded-full animate-spin"
            style={{
              width: 90, height: 90,
              animationDuration: '3s',
              animationDirection: 'reverse',
              background: 'conic-gradient(from 180deg, transparent 80%, rgba(56,240,255,0.4) 100%)',
              WebkitMask: 'radial-gradient(circle, transparent 42px, black 43px)',
              mask: 'radial-gradient(circle, transparent 42px, black 43px)',
            }}
          />
        )}

        {/* Inner static ring */}
        <div className="absolute rounded-full" style={{ width: 74, height: 74, border: '1px solid rgba(255,255,255,0.04)' }} />

        {/* Glow */}
        <div className="absolute rounded-full" style={{
          width: 56, height: 56,
          background: done
            ? 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,209,102,0.14) 0%, transparent 70%)',
          transition: 'background 0.8s ease',
        }} />

        {/* Center */}
        <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.9))' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <div className="animate-pulse rounded-full" style={{
              width: 10, height: 10, background: '#FFD166',
              boxShadow: '0 0 20px rgba(255,209,102,0.9), 0 0 40px rgba(255,209,102,0.35)',
            }} />
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-white font-semibold text-lg tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
          {done ? 'Sealed on Solana ✦' : 'Sealing Observation'}
        </p>
        <p className="text-slate-500 text-[11px] tracking-widest uppercase">
          {done ? 'Proof recorded on-chain' : 'Writing to Solana devnet'}
        </p>
        {!done && (
          <div className="flex justify-center gap-1.5 mt-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                style={{ background: 'rgba(255,209,102,0.5)', animationDelay: `${i * 180}ms` }} />
            ))}
          </div>
        )}
        {slowMsg && !done && (
          <p className="text-slate-500 text-[11px] mt-3 text-center max-w-[220px] leading-relaxed">
            Still sealing — Solana devnet can be slow. Don&apos;t close the app.
          </p>
        )}
      </div>

    </div>
  );
}
