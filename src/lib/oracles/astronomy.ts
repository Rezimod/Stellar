import type { OracleResult } from "./types";

/**
 * Wrapper around astronomy-engine for celestial-event markets.
 * No seeded market currently routes here; this is a stub for future markets
 * that hinge on deterministic ephemerides (eclipses, ISS passes, conjunctions).
 */
export async function resolveAstronomy(_slug: string): Promise<OracleResult> {
  return {
    outcome: "insufficient_data",
    confidence: "low",
    evidence: "astronomy-engine resolver not yet implemented for this market",
  };
}
