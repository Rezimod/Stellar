import { NextResponse } from 'next/server';

// Emergency pause for every value-moving route (mint / award / burn / fund).
// Flip STELLAR_PAUSED=1 in Vercel env to halt issuance instantly — no redeploy.
// Call as the first line of a POST handler: `const p = paused(); if (p) return p;`
export function paused(): NextResponse | null {
  if (process.env.STELLAR_PAUSED === '1') {
    return NextResponse.json({ error: 'Service temporarily paused' }, { status: 503 });
  }
  return null;
}
