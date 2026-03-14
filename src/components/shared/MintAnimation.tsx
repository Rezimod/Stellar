'use client';

interface MintAnimationProps {
  done: boolean;
}

export default function MintAnimation({ done }: MintAnimationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(7,11,20,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="flex flex-col items-center gap-6 text-center px-8">

        {done ? (
          <>
            {/* Success burst */}
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)',
                animation: 'pulse-success 1s ease-out',
              }} />
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ animation: 'mint-success 0.5s ease-out forwards' }}>
                <circle cx="40" cy="40" r="36" fill="none" stroke="#34d399" strokeWidth="2.5" opacity="0.3" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="#34d399" strokeWidth="2.5"
                  strokeDasharray="226" strokeDashoffset="0"
                  strokeLinecap="round"
                  style={{ animation: 'draw-circle 0.6s ease-out forwards' }}
                />
                <polyline points="24,40 36,52 56,28" fill="none" stroke="#34d399" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'draw-check 0.4s 0.4s ease-out forwards', strokeDasharray: 50, strokeDashoffset: 50 }}
                />
              </svg>
            </div>
            <div>
              <p className="text-[#34d399] font-bold text-xl mb-1">Observation Minted!</p>
              <p className="text-slate-400 text-sm">Sealed on Solana devnet</p>
            </div>

            <style>{`
              @keyframes draw-circle {
                from { stroke-dashoffset: 226; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes draw-check {
                to { stroke-dashoffset: 0; }
              }
            `}</style>
          </>
        ) : (
          <>
            {/* Orbital rings */}
            <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>

              {/* Outer ring */}
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute', animation: 'spin-ccw 3s linear infinite' }}>
                <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(56,240,255,0.15)" strokeWidth="1" />
                <circle cx="70" cy="70" r="62" fill="none" stroke="#38F0FF" strokeWidth="1.5"
                  strokeDasharray="389" strokeDashoffset="292"
                  strokeLinecap="round"
                />
                {/* Dot on outer ring */}
                <circle cx="70" cy="8" r="3" fill="#38F0FF" opacity="0.9" />
              </svg>

              {/* Middle ring */}
              <svg width="104" height="104" viewBox="0 0 104 104" style={{ position: 'absolute', animation: 'spin-cw 2s linear infinite' }}>
                <circle cx="52" cy="52" r="44" fill="none" stroke="rgba(122,95,255,0.15)" strokeWidth="1" />
                <circle cx="52" cy="52" r="44" fill="none" stroke="#7A5FFF" strokeWidth="1.5"
                  strokeDasharray="276" strokeDashoffset="207"
                  strokeLinecap="round"
                />
                <circle cx="52" cy="8" r="3" fill="#7A5FFF" opacity="0.9" />
              </svg>

              {/* Inner ring */}
              <svg width="70" height="70" viewBox="0 0 70 70" style={{ position: 'absolute', animation: 'spin-ccw 1.4s linear infinite' }}>
                <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,209,102,0.15)" strokeWidth="1" />
                <circle cx="35" cy="35" r="28" fill="none" stroke="#FFD166" strokeWidth="1.5"
                  strokeDasharray="176" strokeDashoffset="132"
                  strokeLinecap="round"
                />
                <circle cx="35" cy="7" r="2.5" fill="#FFD166" opacity="0.9" />
              </svg>

              {/* Center glow */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56,240,255,0.6) 0%, rgba(122,95,255,0.3) 50%, transparent 70%)',
                animation: 'breathe 1.5s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(56,240,255,0.4)',
              }} />
            </div>

            {/* Dots progress */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#38F0FF',
                  animation: `dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>

            <div>
              <p className="text-[#FFD166] font-bold text-lg mb-1">Minting observation...</p>
              <p className="text-slate-400 text-sm">Sealing your proof on Solana</p>
            </div>

            <style>{`
              @keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
              @keyframes breathe {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.4); opacity: 1; }
              }
              @keyframes dot-bounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                40% { transform: translateY(-6px); opacity: 1; }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
