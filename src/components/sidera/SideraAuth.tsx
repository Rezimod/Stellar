'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';

type Auth = {
  /** Privy is loaded and mounted. */
  ready: boolean;
  /** Load Privy; with `login`, open its sign-in window as soon as it is up. */
  enable: (login?: boolean) => void;
  wantsLogin: boolean;
  loginOpened: () => void;
};

const AuthContext = createContext<Auth>({ ready: false, enable: () => {}, wantsLogin: false, loginOpened: () => {} });
export const useSideraAuth = () => useContext(AuthContext);

/** Inside a legacy Stellar page, Privy is already mounted by its layout: Sidera uses that one. */
const LegacyContext = createContext(false);
export function LegacyPrivy({ children }: { children: ReactNode }) {
  return <LegacyContext.Provider value>{children}</LegacyContext.Provider>;
}
const LEGACY: Auth = { ready: true, enable: () => {}, wantsLogin: false, loginOpened: () => {} };

function hadSession() {
  try {
    return Boolean(localStorage.getItem('privy:refresh_token') ?? localStorage.getItem('privy:token'));
  } catch {
    return false;
  }
}

/**
 * Sign-in, loaded only when it is wanted. A visitor who has never signed in
 * downloads none of Privy — no SDK, no wallet list, no auth window — until
 * they press Sign in; someone with a session gets it as the page settles.
 * Privy arriving remounts the page once, under its provider.
 */
export default function SideraAuth({ children }: { children: ReactNode }) {
  if (useContext(LegacyContext)) return <AuthContext.Provider value={LEGACY}>{children}</AuthContext.Provider>;
  return <LazyAuth>{children}</LazyAuth>;
}

function LazyAuth({ children }: { children: ReactNode }) {
  const [Shell, setShell] = useState<ComponentType<{ children: ReactNode }> | null>(null);
  const [wantsLogin, setWantsLogin] = useState(false);

  const enable = useCallback((login = false) => {
    if (login) setWantsLogin(true);
    import('./SideraPrivy').then((m) => setShell(() => m.default));
  }, []);

  useEffect(() => {
    if (hadSession()) enable();
  }, [enable]);

  const value = useMemo(
    () => ({ ready: Shell !== null, enable, wantsLogin, loginOpened: () => setWantsLogin(false) }),
    [Shell, enable, wantsLogin],
  );
  return <AuthContext.Provider value={value}>{Shell ? <Shell>{children}</Shell> : children}</AuthContext.Provider>;
}
