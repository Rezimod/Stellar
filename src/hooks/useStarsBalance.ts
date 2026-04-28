'use client';

import { useEffect, useState } from 'react';

interface CacheEntry {
  value: number;
  expires: number;
}

const TTL_MS = 5_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<number>>();
const subscribers = new Map<string, Set<(value: number) => void>>();

async function fetchBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`/api/stars-balance?address=${address}`);
    const data = await res.json();
    return typeof data?.balance === 'number' ? data.balance : 0;
  } catch {
    return 0;
  }
}

function notify(address: string, value: number) {
  const subs = subscribers.get(address);
  if (!subs) return;
  for (const fn of subs) fn(value);
}

function load(address: string, force = false): Promise<number> {
  const now = Date.now();
  const cached = cache.get(address);
  if (!force && cached && cached.expires > now) {
    return Promise.resolve(cached.value);
  }
  const existing = inflight.get(address);
  if (existing) return existing;
  const promise = fetchBalance(address)
    .then((value) => {
      cache.set(address, { value, expires: Date.now() + TTL_MS });
      notify(address, value);
      return value;
    })
    .finally(() => {
      inflight.delete(address);
    });
  inflight.set(address, promise);
  return promise;
}

/**
 * Shared Stars balance for the active wallet. Multiple components mounting
 * at once (markets page + MyActiveBets, etc.) share a single network call
 * via a 5s in-memory cache, and any successful bet/cash-out can refresh
 * everyone by dispatching `stellar:stars-synced`.
 */
export function useStarsBalance(address: string | null): number | null {
  const [balance, setBalance] = useState<number | null>(() => {
    if (!address) return null;
    const cached = cache.get(address);
    return cached ? cached.value : null;
  });

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    let subs = subscribers.get(address);
    if (!subs) {
      subs = new Set();
      subscribers.set(address, subs);
    }
    const sub = (value: number) => {
      if (!cancelled) setBalance(value);
    };
    subs.add(sub);

    load(address).then((value) => {
      if (!cancelled) setBalance(value);
    });

    const onSync = () => {
      cache.delete(address);
      load(address, true);
    };
    window.addEventListener('stellar:stars-synced', onSync);

    return () => {
      cancelled = true;
      subs!.delete(sub);
      if (subs!.size === 0) subscribers.delete(address);
      window.removeEventListener('stellar:stars-synced', onSync);
    };
  }, [address]);

  return balance;
}
