export type OracleOutcome = "yes" | "no" | "insufficient_data";
export type OracleConfidence = "high" | "medium" | "low";

export interface OracleResult {
  outcome: OracleOutcome;
  confidence: OracleConfidence;
  evidence: string;
}
