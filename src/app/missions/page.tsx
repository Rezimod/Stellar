'use client';

import { useState, useEffect } from 'react';
import { Satellite, ExternalLink, X } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { usePrivy } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import { initPollinetSync } from '@/lib/pollinet';
import { mintObservation } from '@/lib/solana';
import StatsBar from '@/components/sky/StatsBar';
import MissionList from '@/components/sky/MissionList';
import MissionActive from '@/components/sky/MissionActive';
import ObservationLog from '@/components/sky/ObservationLog';
import RewardsSection from '@/components/sky/RewardsSection';
import type { Mission } from '@/lib/types';

export default function MissionsPage() {
  const { state } = useAppState();
  const { authenticated, login, user } = usePrivy();
  const solanaWallet = user?.linkedAccounts.find(
    (a): a is Extract<typeof a, { type: 'wallet' }> =>
      a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
  );
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [syncToast, setSyncToast] = useState<{ txId: string; name: string } | null>(null);

  // Persistent listener — auto-submits queued observations when device comes back online
  useEffect(() => {
    const cleanup = initPollinetSync(async (queuedMission) => {
      const effectiveKey = solanaWallet?.address ? new PublicKey(solanaWallet.address) : null;
      // TODO Phase 5: wire Privy signAndSendTransaction from @privy-io/react-auth/solana
      const send = null;

      const result = await mintObservation(send, effectiveKey, {
        target: queuedMission.name,
        timestamp: queuedMission.timestamp,
        lat: queuedMission.latitude,
        lon: queuedMission.longitude,
        cloudCover: queuedMission.farmhawk?.cloudCover ?? 0,
        oracleHash: queuedMission.farmhawk?.oracleHash ?? 'offline',
        stars: queuedMission.stars,
      });

      console.log('[Pollinet] ✅ Auto-submitted:', result.txId);
      console.log(`[Pollinet] 🔗 https://explorer.solana.com/tx/${result.txId}?cluster=devnet`);

      setSyncToast({ txId: result.txId, name: queuedMission.name });
      setTimeout(() => setSyncToast(null), 8000);
    });
    return cleanup;
  }, [solanaWallet?.address]);

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 animate-page-enter">
        <div className="max-w-sm w-full text-center">
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.5))',
              border: '1px solid rgba(56,240,255,0.1)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(56,240,255,0.08)', border: '1px solid rgba(56,240,255,0.15)' }}
            >
              <Satellite size={26} className="text-[#38F0FF]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Sky Missions
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Observe the Moon, Jupiter, Saturn, Orion Nebula and more. Earn real rewards.
            </p>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
            >
              Sign In to Start →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {activeMission && <MissionActive mission={activeMission} onClose={() => setActiveMission(null)} />}

      {/* Pollinet sync toast — appears when queued observation auto-submits */}
      {syncToast && (
        <div
          className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[80] p-3.5 rounded-xl flex items-start gap-3"
          style={{
            background: 'rgba(7,11,20,0.95)',
            border: '1px solid rgba(52,211,153,0.3)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 24px rgba(52,211,153,0.1)',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-[#34d399]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-[#34d399]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">Queued observation submitted</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{syncToast.name} · sealed on Solana devnet</p>
            <a
              href={`https://explorer.solana.com/tx/${syncToast.txId}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#38F0FF] hover:underline"
            >
              View on Explorer <ExternalLink size={9} />
            </a>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-6 animate-page-enter flex flex-col gap-3">

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Satellite size={16} strokeWidth={1.5} className="text-[#38F0FF]" />
            <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
              Missions
            </h1>
            <span className="ml-auto text-[10px] text-slate-700 uppercase tracking-widest">Devnet</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[11px] text-slate-600">
              {new Date().getHours() >= 18 || new Date().getHours() < 5
                ? 'Sky conditions: Observable'
                : 'Daytime — missions available tonight'}
            </span>
          </div>

          <StatsBar />
        </section>

        <MissionList onStart={setActiveMission} />

        <RewardsSection />
        <ObservationLog />
      </div>
    </>
  );
}
