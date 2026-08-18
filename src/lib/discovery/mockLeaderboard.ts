import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { TIERS, TIER_BY_ID, type TierId } from '@/lib/discovery/tiers';

/**
 * Sample leaderboard data for /discovery/leaderboard.
 *
 * MOCK DATA. Nothing here is drawn from chain — no pass has been minted and the
 * reveal has not happened. It exists so the board can be built and reviewed at
 * every tier before the program exists, and the exported shapes are the
 * contract the real indexer will have to fill.
 *
 * Object names and ids are taken from the real catalogue in rarityEngine.ts, so
 * a find here refers to an object that can genuinely be drawn.
 */

export type DiscoveryFind = {
  /** Matches an id in the rarityEngine pools. */
  objectId: string;
  name: string;
  tier: TierId;
  wallet: string;
  passNumber: number;
  discoveredAtMs: number;
};

/** [objectId, name, tier, wallet, passNumber, minutesAfterReveal] */
type Row = [string, string, TierId, string, number, number];

/* Wallets repeat on purpose: TOP_COLLECTORS is derived from this one table, so
   multi-pass holders have to exist here for that tab to have anything to say. */
const ROWS: Row[] = [
  ['ton-618', 'TON 618', 'legendary', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 118, 2],
  ['r136a1', 'R136a1', 'legendary', 'BQWWFPQCC5G9UPQCbXWgTdLM8Xn9nzTeuLPqhRLZbnAV', 4402, 9],
  ['uy-scuti', 'UY Scuti', 'legendary', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 7731, 41],
  ['sgr-a-star', 'Sagittarius A*', 'epic', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 903, 4],
  ['pillars-of-creation', 'The Pillars of Creation', 'epic', 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy', 2280, 12],
  ['m87-star', 'M87*', 'epic', 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', 6119, 27],
  ['crab-pulsar', 'The Crab Pulsar', 'epic', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 1544, 33],
  ['cas-a', 'Cassiopeia A', 'epic', 'FZ7WVvBd9GLqRCVX7jRTDxwZLuvZQPLPWXBQ1kfvgRcL', 8850, 58],
  ['kepler-452b', 'Kepler-452b', 'rare', 'BQWWFPQCC5G9UPQCbXWgTdLM8Xn9nzTeuLPqhRLZbnAV', 331, 6],
  ['trappist-1e', 'TRAPPIST-1e', 'rare', '3nS7VaKqPZQeoTPCEuFcQfFvHsRcVmA2eQ3s5kEwEeMV', 5218, 15],
  ['proxima-b', 'Proxima Centauri b', 'rare', 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy', 9004, 21],
  ['55-cancri-e', '55 Cancri e', 'rare', 'GkQFwLmVdRQVLTfLbrDpJZ6ZBYc8gXfBmSaSVJ9GAJqp', 762, 36],
  ['hd209458b', 'HD 209458 b', 'rare', 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', 4471, 44],
  ['wasp-12b', 'WASP-12b', 'rare', 'A8Xk3ZfBUcvxDLNmyoc6VS7pWJhpxJhcbxLjqRncjm5J', 6602, 63],
  ['m31-andromeda', 'The Andromeda Galaxy', 'uncommon', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 2015, 8],
  ['m42-orion', 'The Orion Nebula', 'uncommon', 'CqM4rDqTZgYVnZ6uJnbRJx2QnvSbdVoqcuTBBAvZR2Xz', 3390, 19],
  ['m13-hercules', 'The Hercules Cluster', 'uncommon', 'GkQFwLmVdRQVLTfLbrDpJZ6ZBYc8gXfBmSaSVJ9GAJqp', 7148, 52],
  ['m57-ring', 'The Ring Nebula', 'uncommon', 'EbSbwbGZ8mvVJQxbCzcwXHrMGkfKKUsWLcmpBLKAmvJZ', 9612, 71],
  ['vega', 'Vega', 'common', 'BQWWFPQCC5G9UPQCbXWgTdLM8Xn9nzTeuLPqhRLZbnAV', 1207, 11],
  ['betelgeuse', 'Betelgeuse', 'common', 'CqM4rDqTZgYVnZ6uJnbRJx2QnvSbdVoqcuTBBAvZR2Xz', 5533, 47],
];

export const MOCK_FINDS: DiscoveryFind[] = ROWS.map(
  ([objectId, name, tier, wallet, passNumber, minutes]) => ({
    objectId,
    name,
    tier,
    wallet,
    passNumber,
    discoveredAtMs: REVEAL_AT_MS + minutes * 60_000,
  }),
);

/** TIERS is ascending, so its index is the rarity rank. */
const TIER_RANK: Record<TierId, number> = Object.fromEntries(
  TIERS.map((t, i) => [t.id, i]),
) as Record<TierId, number>;

/**
 * Rarest first; ties broken by who got there first, so the ordering rewards
 * the find rather than the reload.
 */
export const RAREST_FINDS: DiscoveryFind[] = [...MOCK_FINDS].sort(
  (a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.discoveredAtMs - b.discoveredAtMs,
);

export const LEGENDARY_FOUND = MOCK_FINDS.filter((f) => f.tier === 'legendary').length;

export type Collector = {
  wallet: string;
  passes: number;
  highestTier: TierId;
  strllr: number;
};

/**
 * Collectors are derived from the finds rather than listed separately — one
 * table to keep honest, and the two tabs can never disagree about who holds
 * what.
 */
export const TOP_COLLECTORS: Collector[] = (() => {
  const byWallet = new Map<string, Collector>();

  for (const find of MOCK_FINDS) {
    const current = byWallet.get(find.wallet);
    if (!current) {
      byWallet.set(find.wallet, {
        wallet: find.wallet,
        passes: 1,
        highestTier: find.tier,
        strllr: TIER_BY_ID[find.tier].strllr,
      });
      continue;
    }
    current.passes += 1;
    current.strllr += TIER_BY_ID[find.tier].strllr;
    if (TIER_RANK[find.tier] > TIER_RANK[current.highestTier]) current.highestTier = find.tier;
  }

  return [...byWallet.values()].sort((a, b) => b.strllr - a.strllr || b.passes - a.passes);
})();

/** Pre-reveal ticker feed — mint events, not discoveries. */
export const MOCK_TICKER: { wallet: string; passNumber: number }[] = MOCK_FINDS.slice(0, 12).map(
  (f) => ({ wallet: f.wallet, passNumber: f.passNumber }),
);

/** 4…4, matching how the app truncates addresses everywhere else. */
export function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
