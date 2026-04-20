import type { OracleResult } from './types';

export interface LyridsZHR {
  zhr: number | null;
  timestamp: string | null;
  source: string;
  error?: string;
}

const IMO_LIVE_LYR = 'https://www.imo.net/members/imo_live_shower?shower=LYR&year=2026';

export async function fetchLyridsZHR(): Promise<LyridsZHR> {
  try {
    const res = await fetch(IMO_LIVE_LYR, {
      headers: { 'User-Agent': 'Stellar-Observatory/1.0 (+https://stellarrclub.vercel.app)' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { zhr: null, timestamp: null, source: 'imo.net', error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    // IMO's live page is rendered server-side and embeds peak ZHR in text or a table.
    // We try a couple of resilient patterns: "ZHR = 18", "ZHR: 18", or a labelled max ZHR.
    const patterns = [
      /max(?:imum)?\s+ZHR[^\d]{0,20}(\d+(?:\.\d+)?)/i,
      /peak\s+ZHR[^\d]{0,20}(\d+(?:\.\d+)?)/i,
      /ZHR\s*[=:]\s*(\d+(?:\.\d+)?)/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m) {
        const zhr = parseFloat(m[1]);
        if (Number.isFinite(zhr)) {
          return {
            zhr,
            timestamp: new Date().toISOString(),
            source: 'imo.net/live',
          };
        }
      }
    }

    return { zhr: null, timestamp: null, source: 'imo.net', error: 'Could not parse ZHR from page' };
  } catch (err) {
    return { zhr: null, timestamp: null, source: 'imo.net', error: (err as Error).message ?? String(err) };
  }
}

export interface LyridsOracleQuery {
  threshold: number;
}

export async function resolveLyridsZHR(q: LyridsOracleQuery): Promise<OracleResult> {
  const imo = await fetchLyridsZHR();
  if (imo.zhr === null) {
    return {
      outcome: 'insufficient_data',
      confidence: 'low',
      evidence: `IMO unavailable: ${imo.error ?? 'no ZHR'} (${imo.source})`,
    };
  }
  const outcome = imo.zhr >= q.threshold ? 'yes' : 'no';
  return {
    outcome,
    confidence: 'medium',
    evidence: `IMO live ZHR ${imo.zhr} vs threshold ${q.threshold} (${imo.source})`,
  };
}
