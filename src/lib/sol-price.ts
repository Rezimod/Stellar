const GEL_PER_USD = 1 / 0.365;

export const SOL_PRICE_FALLBACK = { solPerGEL: 0.00135, solPrice: 137 };

export class SolPriceUnavailableError extends Error {
  constructor() {
    super('The SOL price is unavailable');
  }
}

/**
 * Public SOL/USD feeds. Several, because a single feed refusing a server's
 * address (CoinGecko returns 403 to Vercel) would otherwise stop every sale,
 * and because a quote is checked against a second source.
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

/** Two feeds further apart than this are not trusted for a quote a buyer will pay. */
const MAX_SPREAD = 0.03;

async function ask(feed: (typeof FEEDS)[number], strict: boolean): Promise<number | null> {
  try {
    // A quote is never cached: a stored answer served while revalidation keeps failing would look live.
    const cache = strict ? { cache: 'no-store' as const } : { next: { revalidate: 60 } };
    const res = await fetch(feed.url, { ...cache, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const price = feed.read(await res.json());
    return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Strict, every feed is asked at once, and the price stands only when at least two
 * feeds answer and agree within MAX_SPREAD, and it is their median; one feed
 * alone, or feeds that disagree, give no price. Otherwise the first feed that
 * answers, in order, will do.
 */
async function livePrice(strict: boolean): Promise<number | null> {
  if (!strict) {
    for (const feed of FEEDS) {
      const price = await ask(feed, false);
      if (price !== null) return price;
    }
    return null;
  }
  const prices = (await Promise.all(FEEDS.map((f) => ask(f, true)))).filter((p): p is number => p !== null).sort((x, y) => x - y);
  if (prices.length < 2 || prices[prices.length - 1] / prices[0] - 1 > MAX_SPREAD) return null;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}

/**
 * The live SOL rate. Falls back to a fixed rate when every feed is down, unless
 * `strict`, in which case it throws: a quote a buyer will pay must never rest
 * on a hardcoded price, nor on a single feed.
 */
export async function fetchSolPriceRates(opts: { strict?: boolean } = {}): Promise<{ solPerGEL: number; solPrice: number }> {
  const solPrice = await livePrice(opts.strict === true);
  if (solPrice === null) {
    if (opts.strict) throw new SolPriceUnavailableError();
    return SOL_PRICE_FALLBACK;
  }
  return {
    solPerGEL: +(1 / (solPrice * GEL_PER_USD)).toFixed(6),
    solPrice,
  };
}
