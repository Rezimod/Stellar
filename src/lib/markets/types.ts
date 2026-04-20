import { PublicKey } from "@solana/web3.js";

export type MarketCategory =
  | "sky_event"
  | "weather_event"
  | "natural_phenomenon"
  | "meteor"
  | "solar"
  | "mission"
  | "comet"
  | "discovery"
  | "weather";
export type MarketSide = "yes" | "no";
export type MarketOutcome = "yes" | "no" | "unresolved" | "cancelled";
export type MarketStatus = "open" | "locked" | "resolved" | "cancelled";

export interface MarketMetadata {
  id: string;
  marketId: number | null;
  title: string;
  category: MarketCategory;
  closeTime: Date;
  resolutionTime: Date;
  resolutionSource: string;
  yesCondition: string;
  whyInteresting: string;
  uiDescription: string;
  emoji?: string;
  initialYesPct?: number;
  analysis?: string;
  preResolved?: boolean;
  preResolvedOutcome?: "yes" | "no";
}

export interface MarketOnChain {
  marketId: number;
  authority: PublicKey;
  question: string;
  yesPool: number;
  noPool: number;
  totalStaked: number;
  resolutionTime: Date;
  resolved: boolean;
  cancelled: boolean;
  outcome: MarketOutcome;
  mint: PublicKey;
}

export interface Market {
  metadata: MarketMetadata;
  onChain: MarketOnChain;
  impliedYesOdds: number;
  impliedNoOdds: number;
  timeToClose: number;
  timeToResolve: number;
  status: MarketStatus;
}

export interface Position {
  user: PublicKey;
  marketId: number;
  side: MarketSide;
  amount: number;
  claimed: boolean;
  projectedPayout: number;
}

export interface ConfigState {
  admin: PublicKey;
  feeRecipient: PublicKey;
  mint: PublicKey;
  tokenDecimals: number;
  maxFeeBps: number;
  nextMarketId: number;
  paused: boolean;
}

export interface SeedMarketsFile {
  version: string;
  generated_at: string;
  window: {
    start: string;
    end: string;
    judging_week: { start: string; end: string };
  };
  notes: string;
  markets: Array<{
    id: string;
    title: string;
    category: MarketCategory;
    close_time: string;
    resolution_time: string;
    resolution_source: string;
    YES_condition: string;
    why_interesting: string;
    ui_description: string;
    emoji?: string;
    initial_yes_pct?: number;
    analysis?: string;
    pre_resolved?: boolean;
    pre_resolved_outcome?: "yes" | "no";
  }>;
}
