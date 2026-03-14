import type { PollinetStatus } from './types';

export function getPollinetStatus(): PollinetStatus {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (online) return { online: true, mode: 'direct', peers: 0, label: '🟢 Online — Direct to Solana' };
  return { online: false, mode: 'mesh', peers: Math.floor(Math.random() * 3) + 1,
    label: '📡 Offline — Pollinet Mesh Relay' };
}
