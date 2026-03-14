'use client';

interface MintAnimationProps {
  done: boolean;
}

export default function MintAnimation({ done }: MintAnimationProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-[#0F1F3D] border border-[rgba(56, 240, 255, 0.12)] rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        {done ? (
          <>
            <div className="text-5xl animate-mint-success">✅</div>
            <p className="text-[#34d399] font-semibold text-lg">Observation Minted!</p>
            <p className="text-slate-400 text-sm">Sealed on Solana devnet</p>
          </>
        ) : (
          <>
            <div className="text-4xl animate-spin-slow">🔭</div>
            <p className="text-[#FFD166] font-semibold">Minting observation...</p>
            <p className="text-slate-400 text-sm">Recording on Solana devnet</p>
          </>
        )}
      </div>
    </div>
  );
}
