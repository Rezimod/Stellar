import type { OracleResult } from "./types";
import { resolveOpenMeteo, type OpenMeteoQuery } from "./openmeteo";
import { resolveNoaaKp, type NoaaKpQuery } from "./noaa";
import { resolveAstronomy } from "./astronomy";
import { resolveLyridsZHR, type LyridsOracleQuery } from "./imo";

type Recipe =
  | { kind: "openmeteo"; query: OpenMeteoQuery }
  | { kind: "noaa_kp"; query: NoaaKpQuery }
  | { kind: "astronomy"; slug: string }
  | { kind: "imo_lyrids"; query: LyridsOracleQuery }
  | { kind: "manual"; reason: string };

const TBILISI = { lat: 41.7151, lon: 44.8271 };
const STOCKHOLM = { lat: 59.6519, lon: 17.9186 };
const HEATHROW = { lat: 51.47, lon: -0.4543 };
const LAGUARDIA = { lat: 40.7769, lon: -73.874 };

const RECIPES: Record<string, Recipe> = {
  // Lyrids uses best-effort IMO ZHR scraper; falls back to manual if parse fails
  "sky-001-lyrids-zhr": { kind: "imo_lyrids", query: { threshold: 18 } },
  "sky-002-eta-aquariids-zhr": { kind: "manual", reason: "IMO ZHR — manual resolution" },
  "sky-003-vandenberg-april22": { kind: "manual", reason: "SpaceX launch — manual resolution" },
  "sky-004-falcon9-cadence": { kind: "manual", reason: "SpaceX launch count — manual resolution" },
  "sky-005-mclass-flare-judging": { kind: "manual", reason: "NOAA GOES X-ray — not wired in this resolver" },
  "sky-006-kp5-geomagnetic": {
    kind: "noaa_kp",
    query: {
      kind: "kp_ge_within_window",
      threshold: 5.0,
      startIso: "2026-04-25T00:00:00Z",
      endIso: "2026-05-04T00:00:00Z",
    },
  },
  "sky-007-xclass-flare-window": { kind: "manual", reason: "NOAA GOES X-ray — not wired in this resolver" },

  "weather-001-tbilisi-warm-day": {
    kind: "openmeteo",
    query: { ...TBILISI, check: { kind: "daily_max_ge", field: "temperature_2m_max", threshold: 22, date: "2026-04-27" } },
  },
  "weather-002-tbilisi-may-day-rain": {
    kind: "openmeteo",
    query: { ...TBILISI, check: { kind: "daily_precip_ge", field: "precipitation_sum", threshold: 5, date: "2026-05-01" } },
  },
  "weather-003-stockholm-frost": {
    kind: "openmeteo",
    query: {
      ...STOCKHOLM,
      check: { kind: "daily_min_le_any", field: "temperature_2m_min", threshold: 2, startDate: "2026-04-25", endDate: "2026-05-03" },
    },
  },
  "weather-004-london-heathrow-rain": {
    kind: "openmeteo",
    query: { ...HEATHROW, check: { kind: "daily_precip_ge", field: "precipitation_sum", threshold: 1, date: "2026-04-30" } },
  },
  "weather-005-tbilisi-clear-eta": {
    kind: "openmeteo",
    query: {
      ...TBILISI,
      check: {
        kind: "hourly_cloudcover_avg_le",
        field: "cloudcover",
        threshold: 30,
        date: "2026-05-05",
        hours: [18, 19, 20, 21, 22, 23],
      },
    },
  },
  "weather-006-tbilisi-dry-week": {
    kind: "openmeteo",
    query: {
      ...TBILISI,
      check: {
        kind: "daily_precip_under_every_day",
        field: "precipitation_sum",
        threshold: 0.5,
        startDate: "2026-04-25",
        endDate: "2026-05-01",
      },
    },
  },
  "weather-007-nyc-warm-may7": {
    kind: "openmeteo",
    query: { ...LAGUARDIA, check: { kind: "daily_max_ge", field: "temperature_2m_max", threshold: 25, date: "2026-05-07" } },
  },

  "natural-001-m6-judging-week": { kind: "manual", reason: "USGS earthquake — not wired in this resolver" },
  "natural-002-m5-near-tbilisi": { kind: "manual", reason: "USGS earthquake — not wired in this resolver" },
  "natural-003-new-volcanic-eruption": { kind: "manual", reason: "Smithsonian bulletin — manual resolution" },
  "natural-004-firms-large-wildfire-us": { kind: "manual", reason: "NASA FIRMS/InciWeb — manual resolution" },
  "natural-005-named-tropical-cyclone": { kind: "manual", reason: "RSMC naming — manual resolution" },
  "natural-006-reykjanes-swarm": { kind: "manual", reason: "Icelandic IMO — manual resolution" },
};

export type ResolveDispatch =
  | { status: "resolved"; result: OracleResult }
  | { status: "manual"; reason: string }
  | { status: "unknown"; reason: string };

export async function dispatchResolver(slug: string): Promise<ResolveDispatch> {
  const recipe = RECIPES[slug];
  if (!recipe) return { status: "unknown", reason: `No recipe registered for slug ${slug}` };
  switch (recipe.kind) {
    case "manual":
      return { status: "manual", reason: recipe.reason };
    case "openmeteo":
      return { status: "resolved", result: await resolveOpenMeteo(recipe.query) };
    case "noaa_kp":
      return { status: "resolved", result: await resolveNoaaKp(recipe.query) };
    case "astronomy":
      return { status: "resolved", result: await resolveAstronomy(recipe.slug) };
    case "imo_lyrids":
      return { status: "resolved", result: await resolveLyridsZHR(recipe.query) };
  }
}

export function recipeKind(slug: string): Recipe["kind"] | "unknown" {
  return RECIPES[slug]?.kind ?? "unknown";
}
