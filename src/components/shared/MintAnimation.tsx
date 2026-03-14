'use client';

interface MintAnimationProps {
  done: boolean;
}

export default function MintAnimation({ done }: MintAnimationProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-[#111c30] border border-[#1a2d4d] rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        {done ? (
          <>
            <div className="text-5xl animate-mint-success">✅</div>
            <p className="text-[#34d399] font-semibold text-lg">NFT Minted!</p>
            <p className="text-slate-400 text-sm">Successfully recorded on Solana devnet</p>
          </>
        ) : (
          <>
            <div className="text-4xl animate-spin-slow">🔭</div>
            <p className="text-[#c9a84c] font-semibold">Minting NFT...</p>
            <p className="text-slate-400 text-sm">Recording on Solana devnet</p>
          </>
        )}
      </div>
    </div>
  );
}
