import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

interface StarRow {
  id: number;
  hip: number | null;
  hd: number | null;
  proper_name: string | null;
  ra: number;
  dec: number;
  mag: number;
  con: string | null;
}

function buildCatalogId(star: StarRow): string {
  if (star.hip) return `HIP ${star.hip}`;
  if (star.hd) return `HD ${star.hd}`;
  return `HYG ${star.id}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (!isFinite(lat) || !isFinite(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Could not find star' }, { status: 500 });
  }

  try {
    const sql = neon(databaseUrl);

    let rows = (await sql`
      SELECT id, hip, hd, proper_name, ra, dec, mag, con
      FROM star_catalog
      WHERE claimed_by IS NULL
        AND dec BETWEEN (${lat}::float - 30) AND (${lat}::float + 60)
        AND mag <= 6.5
      ORDER BY mag ASC
      LIMIT 1
    `) as unknown as StarRow[];

    if (!rows || rows.length === 0) {
      rows = (await sql`
        SELECT id, hip, hd, proper_name, ra, dec, mag, con
        FROM star_catalog
        WHERE claimed_by IS NULL
        ORDER BY mag ASC
        LIMIT 1
      `) as unknown as StarRow[];
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Could not find star' }, { status: 500 });
    }

    const star = rows[0];
    return NextResponse.json({
      id: star.id,
      hip: star.hip ?? null,
      hd: star.hd ?? null,
      properName: star.proper_name ?? null,
      catalogId: buildCatalogId(star),
      ra: star.ra,
      dec: star.dec,
      mag: star.mag,
      constellation: star.con ?? null,
    });
  } catch (err) {
    console.error('[nearest-unclaimed] DB error:', err);
    return NextResponse.json({ error: 'Could not find star' }, { status: 500 });
  }
}
