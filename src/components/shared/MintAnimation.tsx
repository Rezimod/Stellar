'use client';

interface MintAnimationProps {
  done: boolean;
}

export default function MintAnimation({ done }: MintAnimationProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#070B14]/90 backdrop-blur-sm grid place-items-center">
      <div className="flex flex-col items-center gap-6 text-center px-6">

        {/* Celestial orb animation */}
        <div className="relative w-28 h-28">
          {/* Outer rotating ring */}
          <div className={`absolute inset-0 rounded-full border border-[#38F0FF]/30 ${done ? '' : 'animate-[spin_6s_linear_infinite]'}`}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#38F0FF] shadow-[0_0_8px_rgba(56,240,255,0.6)]" />
          </div>

          {/* Middle counter-rotating ring */}
          <div className={`absolute inset-3 rounded-full border border-[#7A5FFF]/30 ${done ? '' : 'animate-[spin_4s_linear_infinite_reverse]'}`}>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#7A5FFF] shadow-[0_0_6px_rgba(122,95,255,0.6)]" />
          </div>

          {/* Inner pulsing core */}
          <div className="absolute inset-6 rounded-full flex items-center justify-center">
            <div className={`w-full h-full rounded-full flex items-center justify-center ${
              done
                ? 'bg-[#34d399]/20 border border-[#34d399]/40 animate-mint-success'
                : 'bg-[#FFD166]/10 border border-[#FFD166]/30 animate-pulse'
            }`}>
              {done ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
              )}
            </div>
          </div>

          {/* Floating particles */}
          {!done && (
            <>
              <div className="absolute top-2 right-1 w-1 h-1 rounded-full bg-[#38F0FF]/60 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute bottom-4 left-0 w-1 h-1 rounded-full bg-[#7A5FFF]/60 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              <div className="absolute top-8 left-1 w-0.5 h-0.5 rounded-full bg-[#FFD166]/60 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
            </>
          )}
        </div>

        {/* Text */}
        {done ? (
          <div className="animate-slide-up">
            <p className="text-[#34d399] font-semibold text-lg mb-1">Observation Sealed</p>
            <p className="text-slate-400 text-sm">Recorded on Solana devnet</p>
            <p className="text-[var(--text-dim)] text-[10px] mt-2 font-mono">
              Verified by STELLAR Observer Agent on CyreneAI
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[#FFD166] font-semibold text-lg mb-1">Sealing Observation</p>
            <p className="text-slate-400 text-sm">Writing to Solana devnet...</p>
            <p className="text-[var(--text-dim)] text-[10px] mt-2 font-mono">
              Agent: cyreneai/stellar-observer
            </p>
            <div className="flex justify-center gap-1 mt-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#38F0FF] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
