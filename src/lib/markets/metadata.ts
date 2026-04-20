import seedJsonV1 from "../../data/seed_markets.json";
import seedJsonV2 from "../../data/seed-markets-v2.json";
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

function parseV2(): MarketMetadata[] {
  const file = seedJsonV2 as unknown as SeedMarketsFile;
  const bindings = readBindingsV2();
  return file.markets.map((m) => ({
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
  }));
}

function parseV1(): MarketMetadata[] {
  const file = seedJsonV1 as unknown as SeedMarketsFile;
  const bindings = readBindingsV1();
  return file.markets.map((m) => ({
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
  }));
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
  return (
    parseV2().find((m) => m.marketId === marketId) ??
    parseV1().find((m) => m.marketId === marketId) ??
    null
  );
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

export async function getFullMarkets(
  program: StellarMarketsProgram,
): Promise<Market[]> {
  const seed = parseSeed();
  const onChain = await getAllMarkets(program);
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
    const impliedYesOdds = total === 0 ? 0.5 : on.yesPool / total;
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
  return out;
}
