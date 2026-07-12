import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getDb } from '@/lib/db';
import { natalCharts } from '@/lib/schema';
import { computeNatalChart } from '@/lib/astrology/natal-chart';
import { generateNatalReading } from '@/lib/astrology/ai-reading';
import { verifyPrivy } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _privy: PrivyClient | null = null;
function getPrivy(): PrivyClient {
  if (!_privy) {
    _privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
    );
  }
  return _privy;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    const claims = await getPrivy().verifyAuthToken(token);
    userId = claims.userId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      name: string;
      birthDate: string; // YYYY-MM-DD
      birthTime: string; // HH:MM
      lat: number;
      lon: number;
      locationName: string;
      wallet?: string; // optional wallet from client
    };

    if (!body.name || !body.birthDate || !body.birthTime || typeof body.lat !== 'number' || typeof body.lon !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const birthDate = new Date(body.birthDate);
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 });
    }

    // Compute natal chart
    const chart = computeNatalChart(
      birthDate,
      body.birthTime,
      body.lat,
      body.lon,
      body.locationName || 'Unknown',
    );

    // Use wallet from client or userId as fallback
    const userWallet = body.wallet || userId;

    if (!userWallet) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 400 });
    }

    // Generate natal reading (non-blocking, can be slow)
    const natalReading = await generateNatalReading(chart, body.name).catch(() => '');

    // Save chart to database
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await db
      .insert(natalCharts)
      .values({
        wallet: userWallet,
        name: body.name,
        birthDate,
        birthTime: body.birthTime,
        lat: body.lat,
        lon: body.lon,
        locationName: body.locationName,
        sunSign: chart.sunSign,
        moonSign: chart.moonSign,
        risingSign: chart.risingSign,
        planetSigns: chart.planetSigns,
        natalReading: natalReading || null,
      })
      .returning({ id: natalCharts.id });

    const chartId = result[0]?.id;

    return NextResponse.json(
      {
        id: chartId,
        chart: {
          sunSign: chart.sunSign,
          moonSign: chart.moonSign,
          risingSign: chart.risingSign,
          natalReading,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[Astrology] Chart creation failed:', err);
    return NextResponse.json({ error: 'Chart creation failed' }, { status: 500 });
  }
}
