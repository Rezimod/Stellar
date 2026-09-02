import { NextResponse } from 'next/server';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';

// Readiness reads a 30-minute-cached forecast and computes Sun geometry, so a
// short cache here costs nothing and keeps the browse page snappy.
export const revalidate = 300;

export async function GET() {
  try {
    const nodes = await getNodesWithReadiness();
    return NextResponse.json({ nodes });
  } catch (err) {
    console.error('[observatory/nodes]', err);
    return NextResponse.json({ error: 'Unable to reach the network right now.' }, { status: 503 });
  }
}
