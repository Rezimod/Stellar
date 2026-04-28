import { PublicKey } from "@solana/web3.js";
import seedJsonV1 from "../../data/seed_markets.json";
import seedJsonV2 from "../../data/seed-markets-v2.json";
import seedJsonPreview from "../../data/seed-markets-preview.json";
import bindingsJsonV1 from "../../data/market-id-bindings.json";
import bindingsJsonV2 from "../../data/market-id-bindings-v2.json";
import type {
  Market,
  MarketMetadata,
  MarketOnChain,
  MarketStatus,
  SeedMarketsFile,
} from "./types";
import { getAllMarkets } from "./queries";
import type { StellarMarketsProgram } from "./client";

function readBindingsV1(): Record<string, number> {
  return bindingsJsonV1 as Record<string, number>;
}
function readBindingsV2(): Record<string, number> {
  return bindingsJsonV2 as Record<string, number>;
}

// v2 is the active catalogue once any v2 binding exists.
function isV2Active(): boolean {
  return Object.keys(readBindingsV2()).length > 0;
}

let _v2Cache: MarketMetadata[] | null = null;
let _v1Cache: MarketMetadata[] | null = null;
let _previewCache: MarketMetadata[] | null = null;
let _byMarketIdCache: Map<number, MarketMetadata> | null = null;

function parseV2(): MarketMetadata[] {
  if (_v2Cache) return _v2Cache;
  const file = seedJsonV2 as unknown as SeedMarketsFile;
  const bindings = readBindingsV2();
  _v2Cache = file.markets.map((m) => ({
    id: m.id,
    marketId: bindings[m.id] ?? null,
    title: m.title,
    category: m.category,
    closeTime: new Date(m.close_time),
    resolutionTime: new Date(m.resolution_time),
    resolutionSource: m.resolution_source,
    yesCondition: m.YES_condition,
    whyInteresting: m.why_interesting,
    uiDescription: m.ui_description,
    emoji: m.emoji,
    initialYesPct: m.initial_yes_pct,
    analysis: m.analysis,
    preResolved: m.pre_resolved ?? false,
    preResolvedOutcome: m.pre_resolved_outcome,
    previewOnly: m.preview_only ?? false,
    simpleTitle: m.simple_title,
  }));
  return _v2Cache;
}

function parseV1(): MarketMetadata[] {
  if (_v1Cache) return _v1Cache;
  const file = seedJsonV1 as unknown as SeedMarketsFile;
  const bindings = readBindingsV1();
  _v1Cache = file.markets.map((m) => ({
    id: m.id,
    marketId: bindings[m.id] ?? null,
    title: m.title,
    category: m.category,
    closeTime: new Date(m.close_time),
    resolutionTime: new Date(m.resolution_time),
    resolutionSource: m.resolution_source,
    yesCondition: m.YES_condition,
    whyInteresting: m.why_interesting,
    uiDescription: m.ui_description,
    initialYesPct: m.initial_yes_pct,
    simpleTitle: m.simple_title,
  }));
  return _v1Cache;
}

function parsePreview(): MarketMetadata[] {
  if (_previewCache) return _previewCache;
  const file = seedJsonPreview as unknown as SeedMarketsFile;
  _previewCache = file.markets.map((m) => ({
    id: m.id,
    marketId: null,
    title: m.title,
    category: m.category,
    closeTime: new Date(m.close_time),
    resolutionTime: new Date(m.resolution_time),
    resolutionSource: m.resolution_source,
    yesCondition: m.YES_condition,
    whyInteresting: m.why_interesting,
    uiDescription: m.ui_description,
    initialYesPct: m.initial_yes_pct,
    previewOnly: true,
    simpleTitle: m.simple_title,
  }));
  return _previewCache;
}

function parseSeed(): MarketMetadata[] {
  return isV2Active() ? parseV2() : parseV1();
}

export function loadSeedMarkets(): MarketMetadata[] {
  return parseSeed();
}

export function findMetadataBySlug(slug: string): MarketMetadata | null {
  // Look in both catalogues so legacy detail links still resolve.
  return (
    parseV2().find((m) => m.id === slug) ??
    parseV1().find((m) => m.id === slug) ??
    null
  );
}

export function findMetadataByMarketId(marketId: number): MarketMetadata | null {
  if (!_byMarketIdCache) {
    _byMarketIdCache = new Map();
    // v2 wins over v1 if both bind the same on-chain id (matches old find order).
    for (const m of parseV1()) {
      if (m.marketId !== null) _byMarketIdCache.set(m.marketId, m);
    }
    for (const m of parseV2()) {
      if (m.marketId !== null) _byMarketIdCache.set(m.marketId, m);
    }
  }
  return _byMarketIdCache.get(marketId) ?? null;
}

export function getAllBindings(): Record<string, number> {
  return { ...readBindingsV1(), ...readBindingsV2() };
}

function deriveStatus(meta: MarketMetadata, on: MarketOnChain, now: Date): MarketStatus {
  if (on.cancelled) return "cancelled";
  if (on.resolved) return "resolved";
  if (meta.preResolved) return "resolved";
  if (now >= meta.closeTime) return "locked";
  return "open";
}

function previewOnChain(meta: MarketMetadata, idx: number): MarketOnChain {
  const yesPct = typeof meta.initialYesPct === "number" ? meta.initialYesPct : 50;
  const noPct = 100 - yesPct;
  return {
    marketId: -1000 - idx,
    authority: PublicKey.default,
    question: meta.title,
    yesPool: yesPct * 10,
    noPool: noPct * 10,
    totalStaked: 1000,
    resolutionTime: meta.resolutionTime,
    resolved: false,
    cancelled: false,
    outcome: "unresolved",
    mint: PublicKey.default,
  };
}

/**
 * Build the full UI market list from an already-fetched on-chain snapshot.
 * Lets a caller fetch on-chain markets once and reuse them across views,
 * avoiding duplicate `program.account.market.all()` RPC calls.
 */
export function buildFullMarketsFromOnChain(onChain: MarketOnChain[]): Market[] {
  const seed = parseSeed();
  const onChainById = new Map<number, MarketOnChain>(
    onChain.map((m) => [m.marketId, m]),
  );
  const now = new Date();
  const out: Market[] = [];
  for (const meta of seed) {
    if (meta.marketId === null) continue;
    const on = onChainById.get(meta.marketId);
    if (!on) continue;
    const total = on.yesPool + on.noPool;
    const seedOdds = typeof meta.initialYesPct === 'number'
      ? Math.min(0.99, Math.max(0.01, meta.initialYesPct / 100))
      : 0.5;
    const impliedYesOdds = total === 0 ? seedOdds : on.yesPool / total;
    out.push({
      metadata: meta,
      onChain: on,
      impliedYesOdds,
      impliedNoOdds: 1 - impliedYesOdds,
      timeToClose: meta.closeTime.getTime() - now.getTime(),
      timeToResolve: meta.resolutionTime.getTime() - now.getTime(),
      status: deriveStatus(meta, on, now),
    });
  }
  // Preview-only markets — display as live but no on-chain trading yet.
  const previews = parsePreview();
  previews.forEach((meta, idx) => {
    const on = previewOnChain(meta, idx);
    const seedOdds = typeof meta.initialYesPct === "number"
      ? Math.min(0.99, Math.max(0.01, meta.initialYesPct / 100))
      : 0.5;
    out.push({
      metadata: meta,
      onChain: on,
      impliedYesOdds: seedOdds,
      impliedNoOdds: 1 - seedOdds,
      timeToClose: meta.closeTime.getTime() - now.getTime(),
      timeToResolve: meta.resolutionTime.getTime() - now.getTime(),
      status: now >= meta.closeTime ? "locked" : "open",
    });
  });
  return out;
}

export async function getFullMarkets(
  program: StellarMarketsProgram,
): Promise<Market[]> {
  const onChain = await getAllMarkets(program);
  return buildFullMarketsFromOnChain(onChain);
}
