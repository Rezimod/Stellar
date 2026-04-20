import type { OracleResult } from "./types";

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

interface KpSample {
  time_tag: string;
  kp_index?: number | string;
  estimated_kp?: number | string;
}

export interface NoaaKpQuery {
  kind: "kp_ge_within_window";
  threshold: number;
  startIso: string;
  endIso: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`NOAA ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function resolveNoaaKp(q: NoaaKpQuery): Promise<OracleResult> {
  let samples: KpSample[];
  try {
    samples = await fetchJson<KpSample[]>(KP_URL);
  } catch (e) {
    return {
      outcome: "insufficient_data",
      confidence: "low",
      evidence: `NOAA Kp fetch failed: ${(e as Error).message}`,
    };
  }

  const start = new Date(q.startIso).getTime();
  const end = new Date(q.endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { outcome: "insufficient_data", confidence: "low", evidence: "Invalid window" };
  }

  let maxKp = -Infinity;
  let maxAt = "";
  for (const s of samples) {
    const t = new Date(s.time_tag + "Z").getTime();
    if (!Number.isFinite(t) || t < start || t > end) continue;
    const kp = toNum(s.kp_index ?? s.estimated_kp);
    if (kp == null) continue;
    if (kp > maxKp) {
      maxKp = kp;
      maxAt = s.time_tag;
    }
  }

  if (!Number.isFinite(maxKp)) {
    return {
      outcome: "insufficient_data",
      confidence: "low",
      evidence: `NOAA feed covers recent window only; no samples inside ${q.startIso}..${q.endIso}`,
    };
  }

  return {
    outcome: maxKp >= q.threshold ? "yes" : "no",
    confidence: "high",
    evidence: `max Kp ${maxKp} at ${maxAt} vs threshold ${q.threshold}`,
  };
}
