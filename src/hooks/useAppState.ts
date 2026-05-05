'use client';

import { createContext, useCallback, useContext, useMemo, useState, useEffect, ReactNode, createElement } from 'react';
import type { AppState, CompletedMission, QuizResult } from '@/lib/types';

const defaultState: AppState = {
  walletConnected: false,
  walletAddress: '',
  membershipMinted: false,
  membershipTx: '',
  telescope: null,
  telescopeTx: '',
  completedMissions: [],
  completedQuizzes: [],
  hiddenObservationIds: [],
};

interface AppStateCtx {
  state: AppState;
  setWallet: (address: string) => void;
  setMembership: (tx: string) => void;
  setTelescope: (data: { brand: string; model: string; aperture: string }, tx: string) => void;
  addMission: (mission: CompletedMission) => void;
  removeMission: (txId: string) => void;
  hideObservation: (id: string) => void;
  unhideObservation: (id: string) => void;
  addQuizResult: (r: QuizResult) => void;
  pendingCount: number;
  reset: () => void;
}

const Ctx = createContext<AppStateCtx | null>(null);
const STORAGE_KEY = 'stellar_state';

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

// Persist state to localStorage; on quota overflow, progressively drop photos
// (oldest-first) and then oldest missions entirely until it fits.
function persistState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  } catch (err) {
    if (!isQuotaError(err)) return;
  }

  // Pass 1: strip photos from oldest missions, keep newest photo
  const missions = [...state.completedMissions];
  for (let i = 0; i < missions.length - 1; i++) {
    missions[i] = { ...missions[i], photo: '' };
    const trimmed: AppState = { ...state, completedMissions: missions };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return;
    } catch (err) {
      if (!isQuotaError(err)) return;
    }
  }

  // Pass 2: strip all photos
  const stripped = missions.map((m) => ({ ...m, photo: '' }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, completedMissions: stripped }));
    return;
  } catch (err) {
    if (!isQuotaError(err)) return;
  }

  // Pass 3: drop oldest missions until it fits (keep newest 20, then 10, then 5)
  for (const keep of [20, 10, 5, 1]) {
    const trimmed = stripped.slice(-keep);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, completedMissions: trimmed }));
      return;
    } catch (err) {
      if (!isQuotaError(err)) return;
    }
  }
}

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
    if (!loaded) return;
    persistState(state);
  }, [state, loaded]);

  const setWallet = useCallback((address: string) => {
    setState(s => ({ ...s, walletConnected: true, walletAddress: address }));
  }, []);
  const setMembership = useCallback((tx: string) => {
    setState(s => ({ ...s, membershipMinted: true, membershipTx: tx }));
  }, []);
  const setTelescope = useCallback((data: { brand: string; model: string; aperture: string }, tx: string) => {
    setState(s => ({ ...s, telescope: data, telescopeTx: tx }));
  }, []);
  const addMission = useCallback((mission: CompletedMission) => {
    setState(s => ({ ...s, completedMissions: [...s.completedMissions, mission] }));
  }, []);
  const removeMission = useCallback((key: string) => {
    setState(s => ({
      ...s,
      completedMissions: s.completedMissions.filter(m => m.id !== key && m.txId !== key),
    }));
  }, []);
  const hideObservation = useCallback((id: string) => {
    setState(s => {
      const ids = s.hiddenObservationIds ?? [];
      if (ids.includes(id)) return s;
      return {
        ...s,
        hiddenObservationIds: [...ids, id],
        completedMissions: s.completedMissions.filter(m => m.id !== id && m.txId !== id),
      };
    });
  }, []);
  const unhideObservation = useCallback((id: string) => {
    setState(s => ({ ...s, hiddenObservationIds: (s.hiddenObservationIds ?? []).filter(x => x !== id) }));
  }, []);
  const addQuizResult = useCallback((r: QuizResult) => {
    setState(s => ({ ...s, completedQuizzes: [...(s.completedQuizzes ?? []), r] }));
  }, []);
  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  const pendingCount = useMemo(
    () => state.completedMissions.filter(m => m.status === 'pending').length,
    [state.completedMissions],
  );

  const ctx = useMemo<AppStateCtx>(
    () => ({
      state,
      setWallet,
      setMembership,
      setTelescope,
      addMission,
      removeMission,
      hideObservation,
      unhideObservation,
      addQuizResult,
      pendingCount,
      reset,
    }),
    [state, setWallet, setMembership, setTelescope, addMission, removeMission, hideObservation, unhideObservation, addQuizResult, pendingCount, reset],
  );

  return createElement(Ctx.Provider, { value: ctx }, children);
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState outside provider');
  return ctx;
}
