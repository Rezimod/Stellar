import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { configPDA, marketPDA } from "./pdas";
import { PROGRAM_ID, type StellarMarketsProgram } from "./client";
import type {
  ConfigState,
  MarketOnChain,
  MarketOutcome,
  Position,
} from "./types";

function bnToNumber(value: BN | { toString(): string }): number {
  return Number(value.toString());
}

function decodeOutcome(state: { active?: object; resolved?: object; cancelled?: object }, outcome: { none?: object; yes?: object; no?: object }): MarketOutcome {
  if (state.cancelled) return "cancelled";
  if (!state.resolved) return "unresolved";
  if (outcome.yes) return "yes";
  if (outcome.no) return "no";
  return "unresolved";
}

interface RawMarket {
  id: BN;
  question: string;
  resolutionTime: BN;
  state: { active?: object; resolved?: object; cancelled?: object };
  winningOutcome: { none?: object; yes?: object; no?: object };
  yesPool: BN;
  noPool: BN;
  creator: PublicKey;
  configFeeRecipient: PublicKey;
}

interface RawConfig {
  admin: PublicKey;
  feeRecipient: PublicKey;
  tokenMint: PublicKey;
  tokenDecimals: number;
  maxFeeBps: number;
  marketCounter: BN;
  paused: boolean;
}

interface RawUserPosition {
  marketId: BN;
  user: PublicKey;
  yesBet: BN;
  noBet: BN;
  claimed: boolean;
}

function mapMarket(raw: RawMarket, mint: PublicKey): MarketOnChain {
  const yesPool = bnToNumber(raw.yesPool);
  const noPool = bnToNumber(raw.noPool);
  return {
    marketId: bnToNumber(raw.id),
    authority: raw.creator,
    question: raw.question,
    yesPool,
    noPool,
    totalStaked: yesPool + noPool,
    resolutionTime: new Date(bnToNumber(raw.resolutionTime) * 1000),
    resolved: !!raw.state.resolved,
    cancelled: !!raw.state.cancelled,
    outcome: decodeOutcome(raw.state, raw.winningOutcome),
    mint,
  };
}

// Short-lived caches so that multiple components mounting at the same time
// (markets page + MyActiveBets + my-positions, etc.) share a single RPC
// instead of each kicking off their own. Keyed by RPC endpoint so dev/devnet
// switches don't bleed between sessions.

const CONFIG_TTL_MS = 60_000;
const MARKETS_TTL_MS = 10_000;

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const _configCache = new Map<string, CacheEntry<ConfigState | null>>();
const _configInflight = new Map<string, Promise<ConfigState | null>>();
const _allMarketsCache = new Map<string, CacheEntry<MarketOnChain[]>>();
const _allMarketsInflight = new Map<string, Promise<MarketOnChain[]>>();

function rpcKey(program: StellarMarketsProgram): string {
  return program.provider.connection.rpcEndpoint;
}

export function invalidateMarketsCache(): void {
  _configCache.clear();
  _allMarketsCache.clear();
}

async function fetchConfigFresh(
  program: StellarMarketsProgram,
): Promise<ConfigState | null> {
  const [pda] = configPDA(PROGRAM_ID);
  try {
    const cfg = (await program.account.config.fetch(pda)) as unknown as RawConfig;
    return {
      admin: cfg.admin,
      feeRecipient: cfg.feeRecipient,
      mint: cfg.tokenMint,
      tokenDecimals: cfg.tokenDecimals,
      maxFeeBps: cfg.maxFeeBps,
      nextMarketId: bnToNumber(cfg.marketCounter) + 1,
      paused: cfg.paused,
    };
  } catch {
    return null;
  }
}

export async function getConfig(
  program: StellarMarketsProgram,
): Promise<ConfigState | null> {
  const key = rpcKey(program);
  const now = Date.now();
  const cached = _configCache.get(key);
  if (cached && cached.expires > now) return cached.value;
  const inflight = _configInflight.get(key);
  if (inflight) return inflight;
  const promise = fetchConfigFresh(program)
    .then((value) => {
      _configCache.set(key, { value, expires: Date.now() + CONFIG_TTL_MS });
      return value;
    })
    .finally(() => {
      _configInflight.delete(key);
    });
  _configInflight.set(key, promise);
  return promise;
}

export async function getMarket(
  program: StellarMarketsProgram,
  marketId: number,
): Promise<MarketOnChain | null> {
  const [pda] = marketPDA(PROGRAM_ID, marketId);
  try {
    const raw = (await program.account.market.fetch(pda)) as unknown as RawMarket;
    const cfg = await getConfig(program);
    if (!cfg) return null;
    return mapMarket(raw, cfg.mint);
  } catch {
    return null;
  }
}

async function fetchAllMarketsFresh(
  program: StellarMarketsProgram,
): Promise<MarketOnChain[]> {
  const cfg = await getConfig(program);
  if (!cfg) return [];
  const all = (await program.account.market.all()) as Array<{
    account: RawMarket;
  }>;
  return all
    .map((m) => mapMarket(m.account, cfg.mint))
    .sort((a, b) => a.marketId - b.marketId);
}

export async function getAllMarkets(
  program: StellarMarketsProgram,
): Promise<MarketOnChain[]> {
  const key = rpcKey(program);
  const now = Date.now();
  const cached = _allMarketsCache.get(key);
  if (cached && cached.expires > now) return cached.value;
  const inflight = _allMarketsInflight.get(key);
  if (inflight) return inflight;
  const promise = fetchAllMarketsFresh(program)
    .then((value) => {
      _allMarketsCache.set(key, { value, expires: Date.now() + MARKETS_TTL_MS });
      return value;
    })
    .finally(() => {
      _allMarketsInflight.delete(key);
    });
  _allMarketsInflight.set(key, promise);
  return promise;
}

export interface UserPositionRaw {
  marketId: number;
  user: PublicKey;
  yesBet: number;
  noBet: number;
  claimed: boolean;
}

export async function getUserPositionsRaw(
  program: StellarMarketsProgram,
  user: PublicKey,
): Promise<UserPositionRaw[]> {
  // memcmp filter on the user pubkey field of UserPosition
  // Layout: 8 (discriminator) + 8 (market_id) + 32 (user) -> user starts at offset 16
  const all = (await program.account.userPosition.all([
    {
      memcmp: {
        offset: 16,
        bytes: user.toBase58(),
      },
    },
  ])) as Array<{ account: RawUserPosition }>;
  return all.map((p) => ({
    marketId: bnToNumber(p.account.marketId),
    user: p.account.user,
    yesBet: bnToNumber(p.account.yesBet),
    noBet: bnToNumber(p.account.noBet),
    claimed: p.account.claimed,
  }));
}

function projectedPayout(
  side: "yes" | "no",
  amount: number,
  market: MarketOnChain | null,
  claimed: boolean,
): number {
  if (claimed) return 0;
  if (!market) return 0;
  const sidePool = side === "yes" ? market.yesPool : market.noPool;
  const totalPool = market.yesPool + market.noPool;
  if (sidePool === 0 || totalPool === 0) return 0;

  if (market.cancelled) return amount;

  if (market.resolved) {
    if (market.outcome !== side) return 0;
    return Math.floor((amount / sidePool) * totalPool);
  }

  return Math.floor((amount / sidePool) * totalPool);
}

export async function getUserPositions(
  program: StellarMarketsProgram,
  user: PublicKey,
): Promise<Position[]> {
  const raws = await getUserPositionsRaw(program, user);
  if (raws.length === 0) return [];

  // Use the cached `getAllMarkets` snapshot instead of fetching each market
  // individually — one RPC instead of N+1 (each per-market fetch was also
  // re-fetching config under the hood).
  const allMarkets = await getAllMarkets(program);
  const marketById = new Map<number, MarketOnChain>(
    allMarkets.map((m) => [m.marketId, m]),
  );

  const out: Position[] = [];
  for (const r of raws) {
    const m = marketById.get(r.marketId) ?? null;
    if (r.yesBet > 0) {
      out.push({
        user: r.user,
        marketId: r.marketId,
        side: "yes",
        amount: r.yesBet,
        claimed: r.claimed,
        projectedPayout: projectedPayout("yes", r.yesBet, m, r.claimed),
      });
    }
    if (r.noBet > 0) {
      out.push({
        user: r.user,
        marketId: r.marketId,
        side: "no",
        amount: r.noBet,
        claimed: r.claimed,
        projectedPayout: projectedPayout("no", r.noBet, m, r.claimed),
      });
    }
  }
  return out;
}
