const GEL_PER_USD = 1 / 0.365;

export const SOL_PRICE_FALLBACK = { solPerGEL: 0.00135, solPrice: 137 };

export class SolPriceUnavailableError extends Error {
  constructor() {
    super('The SOL price is unavailable');
  }
}

/**
 * Public SOL/USD feeds, asked in order until one answers. More than one,
 * because a single feed refusing a server's address (CoinGecko returns 403 to
 * Vercel) would otherwise stop every sale.
 */
const FEEDS: Array<{ url: string; read: (data: unknown) => unknown }> = [
  { url: 'https://api.coinbase.com/v2/prices/SOL-USD/spot', read: (d) => Number((d as { data?: { amount?: string } }).data?.amount) },
  { url: 'https://api.kraken.com/0/public/Ticker?pair=SOLUSD', read: (d) => Number((d as { result?: { SOLUSD?: { c?: string[] } } }).result?.SOLUSD?.c?.[0]) },
  {
    url: 'https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112',
    read: (d) => (d as Record<string, { usdPrice?: number }>)['So11111111111111111111111111111111111111112']?.usdPrice,
  },
  { url: 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', read: (d) => (d as { solana?: { usd?: number } }).solana?.usd },
];

async function livePrice(): Promise<number | null> {
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const price = feed.read(await res.json());
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) return price;
    } catch {
      // The next feed.
    }
  }
  return null;
}

/**
 * The live SOL rate. Falls back to a fixed rate when every feed is down, unless
 * `strict`, in which case it throws: a quote a buyer will pay must never rest
 * on a hardcoded price.
 */
export async function fetchSolPriceRates(opts: { strict?: boolean } = {}): Promise<{ solPerGEL: number; solPrice: number }> {
  const solPrice = await livePrice();
  if (solPrice === null) {
    if (opts.strict) throw new SolPriceUnavailableError();
    return SOL_PRICE_FALLBACK;
  }
  return {
    solPerGEL: +(1 / (solPrice * GEL_PER_USD)).toFixed(6),
    solPrice,
  };
}
