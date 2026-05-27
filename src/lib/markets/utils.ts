import type { LiveBet } from './types';
import { MARKETS, FAKE_BETTORS, TODAY } from './data';

export function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.max(0, Math.round((d - TODAY.getTime()) / 86_400_000));
}

export function countdown(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return 'Resolves today';
  if (days === 1) return 'Resolves tomorrow';
  if (days < 7) return `Resolves in ${days} days`;
  if (days < 31) {
    const w = Math.ceil(days / 7);
    return `Resolves in ${w} ${w === 1 ? 'week' : 'weeks'}`;
  }
  if (days < 365) {
    const m = Math.ceil(days / 30);
    return `Resolves in ${m} ${m === 1 ? 'month' : 'months'}`;
  }
  return `Resolves ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatVolume(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  return String(n);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLiveBet(seed: number): LiveBet {
  const market = MARKETS[seed % MARKETS.length];
  const stakeBuckets = [10, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000];
  return {
    id: `lb-${seed}-${Math.random()}`,
    user: pick(FAKE_BETTORS),
    market,
    side: Math.random() < market.yes ? 'yes' : 'no',
    stake: pick(stakeBuckets),
  };
}
