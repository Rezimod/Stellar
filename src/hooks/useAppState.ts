'use client';

import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';
import type { AppState, CompletedMission } from '@/lib/types';
import { verifyWithFarmHawk } from '@/lib/farmhawk';
import { mintNFT } from '@/lib/solana';

const defaultState: AppState = {
  walletConnected: false,
  walletAddress: '',
  membershipMinted: false,
  membershipTx: '',
  telescope: null,
  telescopeTx: '',
  completedMissions: [],
  claimedRewards: [],
};

interface AppStateCtx {
  state: AppState;
  setWallet: (address: string) => void;
  setMembership: (tx: string) => void;
  setTelescope: (data: { brand: string; model: string; aperture: string }, tx: string) => void;
  addMission: (mission: CompletedMission) => void;
  removeMission: (id: string) => void;
  claimReward: (id: string) => void;
  pendingCount: number;
  reset: () => void;
}

const Ctx = createContext<AppStateCtx | null>(null);
const STORAGE_KEY = 'stellar_state';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState({ ...defaultState, ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  // Process pending queue when back online
  useEffect(() => {
    const processPending = async () => {
      setState(s => {
        const pending = s.completedMissions.filter(m => m.status === 'pending');
        if (pending.length === 0) return s;
        console.log('[Pollinet] Back online, processing', pending.length, 'pending observations');

        // Fire and forget — update state async
        (async () => {
          for (const m of pending) {
            try {
              const fh = await verifyWithFarmHawk(m.latitude, m.longitude);
              const result = await mintNFT(`${m.name} Observation`, 'OBS');
              setState(prev => ({
                ...prev,
                completedMissions: prev.completedMissions.map(x =>
                  x.id === m.id ? { ...x, farmhawk: fh, txId: result.txId, status: 'completed' as const } : x
                ),
              }));
            } catch {
              console.log('[Pollinet] Failed to process pending mission:', m.id);
            }
          }
          if (typeof window !== 'undefined') {
            // Simple notification
            const msg = document.createElement('div');
            msg.textContent = `🟢 Back online! ${pending.length} observation${pending.length > 1 ? 's' : ''} verified and minted.`;
            msg.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0F1F3D;border:1px solid #34d399;color:#34d399;padding:12px 20px;border-radius:8px;z-index:9999;font-size:14px;';
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 4000);
          }
        })();

        return s;
      });
    };

    window.addEventListener('online', processPending);
    return () => window.removeEventListener('online', processPending);
  }, [loaded]);

  const update = (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch }));

  const ctx: AppStateCtx = {
    state,
    setWallet: (address) => update({ walletConnected: true, walletAddress: address }),
    setMembership: (tx) => update({ membershipMinted: true, membershipTx: tx }),
    setTelescope: (data, tx) => update({ telescope: data, telescopeTx: tx }),
    addMission: (mission) => setState(s => ({
      ...s,
      completedMissions: [...s.completedMissions.filter(m => m.id !== mission.id), mission],
    })),
    removeMission: (id) => setState(s => ({
      ...s,
      completedMissions: s.completedMissions.filter(m => m.id !== id),
    })),
    claimReward: (id) => setState(s => ({
      ...s,
      claimedRewards: s.claimedRewards.includes(id) ? s.claimedRewards : [...s.claimedRewards, id],
    })),
    pendingCount: state.completedMissions.filter(m => m.status === 'pending').length,
    reset: () => { localStorage.removeItem(STORAGE_KEY); setState(defaultState); },
  };

  return createElement(Ctx.Provider, { value: ctx }, children);
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState outside provider');
  return ctx;
}
