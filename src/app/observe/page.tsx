'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import ObserveFlow from '@/components/observe/ObserveFlow';

export default function ObservePage() {
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();

  const walletAddress =
    (user?.linkedAccounts.find(
      (a): a is Extract<typeof a, { type: 'wallet' }> =>
        a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
    )?.address) ?? null;

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 flex flex-col gap-4">
        {/* Header card */}
        <div className="rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(15,31,61,0.6))', border: '1px solid rgba(20,184,166,0.15)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>
            <Camera size={26} className="text-[#14B8A6]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Observe &amp; Earn
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            Photograph the night sky through your telescope. Every verified observation earns real rewards from Georgia&apos;s first astronomy store.
          </p>
          <button onClick={login}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}>
            Sign In to Start Observing →
          </button>
          <p className="text-slate-600 text-xs mt-3">Free forever · No seed phrase required</p>
        </div>

        {/* Reward breakdown */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-3">What you earn</p>
          <div className="flex flex-col gap-2.5">
            {[
              { icon: '✦', label: '50–250 Stars per mission', sub: 'Based on difficulty & target', color: '#FFD166' },
              { icon: '🔭', label: '20% telescope discount', sub: 'Spend Stars at astroman.ge', color: '#34d399' },
              { icon: '🌕', label: 'Moon Lamp reward', sub: 'Top observers each month', color: '#38F0FF' },
              { icon: '🗺️', label: 'Custom Star Map NFT', sub: 'Verified on Solana', color: '#7A5FFF' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight" style={{ color: r.color }}>{r.label}</p>
                  <p className="text-slate-600 text-xs">{r.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-3">How it works</p>
          <div className="flex flex-col gap-2">
            {[
              { n: '1', text: 'Point your telescope at tonight\'s target' },
              { n: '2', text: 'Photograph through the eyepiece' },
              { n: '3', text: 'Satellite verifies clear sky conditions' },
              { n: '4', text: 'Stars credited instantly — spend anytime' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                  {s.n}
                </span>
                <p className="text-slate-400 text-xs leading-relaxed pt-0.5">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <ObserveFlow onClose={() => router.push('/')} walletAddress={walletAddress} />;
}
