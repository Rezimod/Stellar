import { getAllMarkets, loadSeedMarkets, type MarketMetadata, type MarketOnChain } from '@/lib/markets';
import { getServerProgram } from '@/lib/markets/server-program';
import { fetchLyridsZHR } from '@/lib/oracles/imo';

export interface ResearchLiveData {
  summary: string;
  favorableForYes: boolean | null;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: string[];
}

export interface ResearchMarket {
  id: number;
  slug: string;
  title: string;
  currentOdds: { yes: number; no: number };
  volume: number;
  closesIn: string;
  resolvesIn: string;
  resolutionSource: string;
  yesCondition: string;
  status: 'open' | 'locked' | 'resolved' | 'cancelled';
  liveData: ResearchLiveData;
  analysis: string;
}

export interface ResearchOutput {
  markets: ResearchMarket[];
  error?: string;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'be', 'to', 'of', 'on', 'in', 'and', 'or', 'for',
  'do', 'does', 'did', 'should', 'i', 'bet', 'market', 'markets', 'should',
  'what', 'which', 'about', 'any', 'this', 'that', 'can', 'will', 'right',
  'now', 'today', 'tonight', 'good', 'yes', 'no',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function scoreMetaMatch(meta: MarketMetadata, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = [
    meta.id,
    meta.title,
    meta.yesCondition,
    meta.whyInteresting,
    meta.uiDescription,
    meta.category,
  ]
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) score += 1;
    if (meta.title.toLowerCase().includes(t)) score += 1;
    if (meta.id.toLowerCase().includes(t)) score += 2;
  }
  return score;
}

function humanDelta(ms: number): string {
  if (ms <= 0) return 'closed';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hours < 24) return `${hours}h ${remMin}m`;
  const days = Math.floor(hours / 24);
  const remHr = hours % 24;
  return `${days}d ${remHr}h`;
}

function deriveStatus(meta: MarketMetadata, on: MarketOnChain | null, now: number): ResearchMarket['status'] {
  if (!on) return 'open';
  if (on.cancelled) return 'cancelled';
  if (on.resolved) return 'resolved';
  if (now >= meta.closeTime.getTime()) return 'locked';
  return 'open';
}

async function buildLiveData(meta: MarketMetadata): Promise<ResearchLiveData> {
  const slug = meta.id;

  if (slug === 'sky-001-lyrids-zhr') {
    const imo = await fetchLyridsZHR();
    if (imo.zhr !== null) {
      const favorable = imo.zhr >= 18;
      return {
        summary: `IMO live ZHR for Lyrids: ${imo.zhr}. Threshold 18.`,
        favorableForYes: favorable,
        confidence: 'medium',
        dataPoints: [
          `IMO live ZHR: ${imo.zhr}`,
          `Source: ${imo.source}`,
          `Threshold for YES: 18`,
        ],
      };
    }
    return {
      summary:
        'Lyrids peak April 21/22 2026. Typical ZHR 15-20, 1982 outburst hit 90. Moonless night = good visibility.',
      favorableForYes: null,
      confidence: 'low',
      dataPoints: [
        'Predicted ZHR range: 15-20 (threshold 18)',
        'Moon phase: new/near-new — no moonlight interference',
        'Live IMO count not yet available',
        `IMO fetch: ${imo.error ?? 'no ZHR in page'}`,
      ],
    };
  }

  if (slug === 'sky-002-eta-aquariids-zhr') {
    return {
      summary:
        'Eta Aquariids peak May 5/6. Halley debris. Typical ZHR 40-60 but 2026 has bright waning gibbous moon.',
      favorableForYes: null,
      confidence: 'low',
      dataPoints: [
        'Threshold 40/hr',
        'Typical ZHR 40-60',
        'Waning gibbous moon washes out fainter meteors',
        'Best from low latitudes / Southern Hemisphere',
      ],
    };
  }

  if (slug === 'sky-006-kp5-geomagnetic') {
    return {
      summary:
        'NOAA Kp feed auto-resolves this. Need Kp ≥5 in any 3-hour bin April 25 – May 3.',
      favorableForYes: null,
      confidence: 'medium',
      dataPoints: [
        'Threshold: Kp ≥5 (G1 storm)',
        'Window: April 25 – May 3 (judging week)',
        'Cycle 25 declining phase often produces strong CMEs',
        'Auto-resolved via NOAA SWPC',
      ],
    };
  }

  if (slug === 'sky-005-mclass-flare-judging' || slug === 'sky-007-xclass-flare-window') {
    return {
      summary:
        slug === 'sky-005-mclass-flare-judging'
          ? 'Manual resolution. NOAA GOES X-ray. M-class in 9-day window is common in Cycle 25 decline.'
          : 'Manual resolution. X-class is rare but the declining phase of Cycle 25 produced X9 in late 2024.',
      favorableForYes: slug === 'sky-005-mclass-flare-judging' ? true : null,
      confidence: 'low',
      dataPoints: [
        slug === 'sky-005-mclass-flare-judging'
          ? 'M-class or stronger flare in 9-day window'
          : 'X-class (≥X1.0) flare in 20-day window',
        'Source: NOAA SWPC GOES X-ray',
        'Cycle 25 declining phase historically volatile',
      ],
    };
  }

  if (slug === 'sky-003-vandenberg-april22' || slug === 'sky-004-falcon9-cadence') {
    return {
      summary: 'No live data feed — resolves on SpaceX official launch log.',
      favorableForYes: null,
      confidence: 'low',
      dataPoints: [
        'Source: spacex.com/launches + webcast',
        slug === 'sky-004-falcon9-cadence'
          ? 'SpaceX averaged >1 launch / 2 days in 2026'
          : 'Single launch — weather scrubs are main risk',
      ],
    };
  }

  if (slug.startsWith('weather-')) {
    // Surface the resolution criteria; the openmeteo oracle runs on resolution.
    return {
      summary: `Auto-resolves via Open-Meteo. Criteria: ${meta.yesCondition}`,
      favorableForYes: null,
      confidence: 'medium',
      dataPoints: [
        `Source: ${meta.resolutionSource}`,
        `YES if: ${meta.yesCondition}`,
      ],
    };
  }

  if (slug.startsWith('natural-')) {
    return {
      summary: 'Manual resolution — no live data feed wired into this researcher.',
      favorableForYes: null,
      confidence: 'low',
      dataPoints: [`Source: ${meta.resolutionSource}`, `YES if: ${meta.yesCondition}`],
    };
  }

  return {
    summary: 'No specialized data source for this market.',
    favorableForYes: null,
    confidence: 'low',
    dataPoints: [`Source: ${meta.resolutionSource}`],
  };
}

function buildAnalysis(
  meta: MarketMetadata,
  onChain: MarketOnChain | null,
  live: ResearchLiveData,
): string {
  const impliedYes = onChain
    ? onChain.yesPool + onChain.noPool > 0
      ? Math.round((onChain.yesPool / (onChain.yesPool + onChain.noPool)) * 100)
      : 50
    : 50;

  const parts: string[] = [];
  parts.push(`Market is pricing YES at ${impliedYes}%.`);
  if (live.favorableForYes === true) parts.push('Live data favors YES.');
  else if (live.favorableForYes === false) parts.push('Live data leans NO.');
  else parts.push(`Live data is inconclusive (${live.confidence} confidence).`);
  parts.push(live.summary);
  return parts.join(' ');
}

export interface ResearchInput {
  query: string;
  marketId?: number | null;
}

export async function researchMarkets(input: ResearchInput): Promise<ResearchOutput> {
  const allMeta = loadSeedMarkets();
  const now = Date.now();

  let candidates: MarketMetadata[] = [];

  if (typeof input.marketId === 'number') {
    const meta = allMeta.find((m) => m.marketId === input.marketId);
    if (meta) candidates = [meta];
  }

  if (candidates.length === 0) {
    const tokens = tokenize(input.query);
    const scored = allMeta
      .map((m) => ({ meta: m, score: scoreMetaMatch(m, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    candidates = scored.slice(0, 3).map((x) => x.meta);
  }

  if (candidates.length === 0) {
    return { markets: [] };
  }

  let onChainById = new Map<number, MarketOnChain>();
  try {
    const { program } = getServerProgram();
    const onChain = await getAllMarkets(program);
    onChainById = new Map(onChain.map((m) => [m.marketId, m]));
  } catch (e) {
    return {
      markets: [],
      error: `Could not fetch on-chain market data: ${(e as Error).message}`,
    };
  }

  const markets: ResearchMarket[] = [];
  for (const meta of candidates) {
    if (meta.marketId === null) continue;
    const on = onChainById.get(meta.marketId) ?? null;
    const total = on ? on.yesPool + on.noPool : 0;
    const impliedYes = total === 0 ? 0.5 : (on!.yesPool / total);

    let live: ResearchLiveData;
    try {
      live = await buildLiveData(meta);
    } catch (e) {
      live = {
        summary: `Live data unavailable: ${(e as Error).message}`,
        favorableForYes: null,
        confidence: 'low',
        dataPoints: [],
      };
    }

    markets.push({
      id: meta.marketId,
      slug: meta.id,
      title: meta.title,
      currentOdds: {
        yes: Math.round(impliedYes * 100),
        no: Math.round((1 - impliedYes) * 100),
      },
      volume: total,
      closesIn: humanDelta(meta.closeTime.getTime() - now),
      resolvesIn: humanDelta(meta.resolutionTime.getTime() - now),
      resolutionSource: meta.resolutionSource,
      yesCondition: meta.yesCondition,
      status: deriveStatus(meta, on, now),
      liveData: live,
      analysis: buildAnalysis(meta, on, live),
    });
  }

  return { markets };
}
