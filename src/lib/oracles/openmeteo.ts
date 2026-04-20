import type { OracleResult } from "./types";

const API_BASE = "https://archive-api.open-meteo.com/v1/archive";

export type WeatherCheck =
  | { kind: "daily_max_ge"; field: "temperature_2m_max"; threshold: number; date: string }
  | { kind: "daily_min_le"; field: "temperature_2m_min"; threshold: number; date: string }
  | { kind: "daily_precip_ge"; field: "precipitation_sum"; threshold: number; date: string }
  | { kind: "daily_min_le_any"; field: "temperature_2m_min"; threshold: number; startDate: string; endDate: string }
  | { kind: "daily_precip_under_every_day"; field: "precipitation_sum"; threshold: number; startDate: string; endDate: string }
  | { kind: "hourly_cloudcover_avg_le"; field: "cloudcover"; threshold: number; date: string; hours: number[] };

export interface OpenMeteoQuery {
  lat: number;
  lon: number;
  check: WeatherCheck;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function dayRange(check: WeatherCheck): { start: string; end: string } {
  if ("date" in check) return { start: check.date, end: check.date };
  return { start: check.startDate, end: check.endDate };
}

export async function resolveOpenMeteo(q: OpenMeteoQuery): Promise<OracleResult> {
  const { lat, lon, check } = q;
  const { start, end } = dayRange(check);

  const hourly = check.kind === "hourly_cloudcover_avg_le" ? "&hourly=cloudcover" : "";
  const daily =
    check.kind !== "hourly_cloudcover_avg_le"
      ? `&daily=${check.field}`
      : "";
  const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}${daily}${hourly}&timezone=UTC`;

  interface OMResp {
    daily?: { time: string[]; [k: string]: unknown };
    hourly?: { time: string[]; cloudcover?: number[] };
  }

  let data: OMResp;
  try {
    data = await fetchJson<OMResp>(url);
  } catch (e) {
    return {
      outcome: "insufficient_data",
      confidence: "low",
      evidence: `Open-Meteo fetch failed: ${(e as Error).message}`,
    };
  }

  switch (check.kind) {
    case "daily_max_ge":
    case "daily_min_le":
    case "daily_precip_ge": {
      const arr = data.daily?.[check.field] as number[] | undefined;
      const v = arr?.[0];
      if (v == null) {
        return { outcome: "insufficient_data", confidence: "low", evidence: `No ${check.field} for ${check.date}` };
      }
      const ok =
        check.kind === "daily_max_ge" || check.kind === "daily_precip_ge"
          ? v >= check.threshold
          : v <= check.threshold;
      return {
        outcome: ok ? "yes" : "no",
        confidence: "high",
        evidence: `${check.field}=${v} vs threshold ${check.threshold} on ${check.date}`,
      };
    }
    case "daily_min_le_any": {
      const arr = data.daily?.[check.field] as number[] | undefined;
      const times = data.daily?.time as string[] | undefined;
      if (!arr || !times) {
        return { outcome: "insufficient_data", confidence: "low", evidence: "No daily data returned" };
      }
      const hit = arr.findIndex((v) => v <= check.threshold);
      if (hit === -1) {
        return {
          outcome: "no",
          confidence: "high",
          evidence: `No day between ${check.startDate}..${check.endDate} had ${check.field}≤${check.threshold}`,
        };
      }
      return {
        outcome: "yes",
        confidence: "high",
        evidence: `${check.field}=${arr[hit]} on ${times[hit]} ≤ ${check.threshold}`,
      };
    }
    case "daily_precip_under_every_day": {
      const arr = data.daily?.[check.field] as number[] | undefined;
      const times = data.daily?.time as string[] | undefined;
      if (!arr || !times) {
        return { outcome: "insufficient_data", confidence: "low", evidence: "No daily data returned" };
      }
      const wetDayIdx = arr.findIndex((v) => v >= check.threshold);
      if (wetDayIdx === -1) {
        return {
          outcome: "yes",
          confidence: "high",
          evidence: `All days ${check.startDate}..${check.endDate} had ${check.field}<${check.threshold}`,
        };
      }
      return {
        outcome: "no",
        confidence: "high",
        evidence: `${check.field}=${arr[wetDayIdx]} on ${times[wetDayIdx]} ≥ ${check.threshold}`,
      };
    }
    case "hourly_cloudcover_avg_le": {
      const times = data.hourly?.time ?? [];
      const cc = data.hourly?.cloudcover ?? [];
      if (times.length === 0 || cc.length === 0) {
        return { outcome: "insufficient_data", confidence: "low", evidence: "No hourly data returned" };
      }
      const wanted = new Set(check.hours.map((h) => `${check.date}T${String(h).padStart(2, "0")}:00`));
      const picked: number[] = [];
      for (let i = 0; i < times.length; i++) {
        if (wanted.has(times[i])) picked.push(cc[i]);
      }
      if (picked.length < check.hours.length) {
        return {
          outcome: "insufficient_data",
          confidence: "low",
          evidence: `Only ${picked.length}/${check.hours.length} hourly samples found`,
        };
      }
      const avg = picked.reduce((a, b) => a + b, 0) / picked.length;
      return {
        outcome: avg <= check.threshold ? "yes" : "no",
        confidence: "high",
        evidence: `avg cloudcover ${avg.toFixed(1)}% across ${picked.length}h vs threshold ${check.threshold}%`,
      };
    }
  }
}
