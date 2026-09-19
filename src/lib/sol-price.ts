const GEL_PER_USD = 1 / 0.365;

export const SOL_PRICE_FALLBACK = { solPerGEL: 0.00135, solPrice: 137 };

export class SolPriceUnavailableError extends Error {
  constructor() {
    super('The SOL price is unavailable');
  }
}

/**
 * The live SOL rate. Falls back to a fixed rate when the feed is down, unless
 * `strict`, in which case it throws: a quote a buyer will pay must never rest
 * on a hardcoded price.
 */
export async function fetchSolPriceRates(opts: { strict?: boolean } = {}): Promise<{ solPerGEL: number; solPrice: number }> {
  const fallback = () => {
    if (opts.strict) throw new SolPriceUnavailableError();
    return SOL_PRICE_FALLBACK;
  };
  let solPrice: number | undefined;
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return fallback();
    const data = (await res.json()) as { solana?: { usd?: number } };
    solPrice = data.solana?.usd;
  } catch {
    return fallback();
  }
  if (typeof solPrice !== 'number' || !Number.isFinite(solPrice) || solPrice <= 0) return fallback();
  return {
    solPerGEL: +(1 / (solPrice * GEL_PER_USD)).toFixed(6),
    solPrice,
  };
}
