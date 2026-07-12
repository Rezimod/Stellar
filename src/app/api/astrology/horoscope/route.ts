import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { natalCharts, dailyHoroscopes } from '@/lib/schema';
import { generateDailyHoroscope } from '@/lib/astrology/ai-reading';

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

export async function GET(req: NextRequest) {
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
    const chartId = req.nextUrl.searchParams.get('chartId');
    if (!chartId) {
      return NextResponse.json({ error: 'Missing chartId' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get the chart
    const chart = await db.query.natalCharts.findFirst({
      where: eq(natalCharts.id, chartId),
    });

    if (!chart) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    // Get or generate today's horoscope
    const today = new Date().toISOString().split('T')[0];

    let horoscope = await db.query.dailyHoroscopes.findFirst({
      where: and(eq(dailyHoroscopes.chartId, chartId), eq(dailyHoroscopes.date, today)),
    });

    if (!horoscope) {
      // Generate a new horoscope
      const generatedText = await generateDailyHoroscope(
        {
          birthDate: chart.birthDate,
          location: {
            lat: chart.lat,
            lon: chart.lon,
            name: chart.locationName,
          },
          sunSign: chart.sunSign as any,
          moonSign: chart.moonSign as any,
          risingSign: chart.risingSign as any,
          planetSigns: chart.planetSigns as Record<string, any>,
          houses: {},
        },
        chart.name,
        new Date(),
      );

      // Save it to the database
      const result = await db
        .insert(dailyHoroscopes)
        .values({
          chartId,
          wallet: chart.wallet,
          date: today,
          horoscope: generatedText,
        })
        .returning({ id: dailyHoroscopes.id });

      horoscope = {
        id: result[0]?.id || '',
        chartId,
        wallet: chart.wallet,
        date: today,
        horoscope: generatedText,
        createdAt: new Date(),
      };
    }

    return NextResponse.json({ horoscope: horoscope.horoscope }, { status: 200 });
  } catch (err) {
    console.error('[Astrology] Horoscope failed:', err);
    return NextResponse.json({ error: 'Failed to get horoscope' }, { status: 500 });
  }
}
