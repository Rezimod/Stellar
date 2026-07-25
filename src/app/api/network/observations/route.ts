import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { LOCATIONS } from '@/lib/darksky-locations';

export type NodeType = 'passive' | 'observer' | 'advanced';

export type NetworkObservation = {
  id: string;
  target: string;
  lat: number | null;
  lon: number | null;
  timestamp: string;
  nodeType: NodeType;
  wallet: string | null;
  source: 'mission' | 'bortle';
  extra?: { bortle?: number; confidence?: string; mintTx?: string | null };
};

function classifyObservation(obs: {
  mintTx: string | null;
  confidence: string;
}): NodeType {
  if (obs.mintTx) return 'observer';
  if (obs.confidence === 'high') return 'observer';
  return 'passive';
}

export async function GET() {
  const db = getDb();
  const observations: NetworkObservation[] = [];

  if (db) {
    try {
      const rows = await db
        .select()
        .from(observationLog)
        .orderBy(desc(observationLog.createdAt))
        .limit(20);

      for (const r of rows) {
        observations.push({
          id: `obs-${r.id}`,
          target: r.identifiedObject ?? r.target,
          // Coarsen to ~1km (2 decimals) for this public, unauthenticated feed:
          // exact coordinates keyed to a wallet would expose an observer's home
          // location. Precision is fine for a network/light-pollution map.
          lat: r.lat === null ? null : Math.round(r.lat * 100) / 100,
          lon: r.lon === null ? null : Math.round(r.lon * 100) / 100,
          timestamp: (r.createdAt ?? new Date()).toString(),
          nodeType: classifyObservation({
            mintTx: r.mintTx,
            confidence: r.confidence,
          }),
          wallet: r.wallet,
          source: 'mission',
          extra: {
            confidence: r.confidence,
            mintTx: r.mintTx,
          },
        });
      }
    } catch (err) {
      console.error('[network/observations] query failed:', err);
    }
  }

  // Always include Bortle readings as Advanced-node data points on the map.
  for (const loc of LOCATIONS) {
    observations.push({
      id: `bortle-${loc.name}`,
      target: `Bortle ${loc.bortle} · ${loc.name}`,
      lat: loc.lat,
      lon: loc.lon,
      timestamp: new Date(0).toISOString(),
      nodeType: 'advanced',
      wallet: null,
      source: 'bortle',
      extra: { bortle: loc.bortle },
    });
  }

  return NextResponse.json(
    { observations },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
