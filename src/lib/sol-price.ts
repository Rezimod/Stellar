const GEL_PER_USD = 1 / 0.365;

export const SOL_PRICE_FALLBACK = { solPerGEL: 0.00135, solPrice: 137 };

export async function fetchSolPriceRates(): Promise<{ solPerGEL: number; solPrice: number }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return SOL_PRICE_FALLBACK;

    const data = (await res.json()) as { solana?: { usd?: number } };
    const solPrice = data.solana?.usd;
    if (!solPrice) return SOL_PRICE_FALLBACK;

    return {
      solPerGEL: +(1 / (solPrice * GEL_PER_USD)).toFixed(6),
      solPrice,
    };
  } catch {
    return SOL_PRICE_FALLBACK;
  }
}
