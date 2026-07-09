import type { Product } from '@/lib/dealers';

// Single source for marketplace price display so cards, rails, detail and
// checkout all render the same way (symbol, not currency code).
export function formatPrice(p: Product): string {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currencySymbol}`;
}

export function formatSol(sol: number): string {
  if (sol >= 10) return sol.toFixed(2);
  if (sol >= 1) return sol.toFixed(3);
  return sol.toFixed(4);
}

export function formatUsd(usd: number): string {
  return usd >= 10 ? Math.round(usd).toLocaleString() : usd.toFixed(2);
}
