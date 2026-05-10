import { NextRequest, NextResponse } from 'next/server';

// Rate limiting moved to individual route handlers via Upstash Redis — see src/lib/rate-limit.ts
// The in-memory Map approach broke on Vercel serverless (each invocation gets a fresh Map).

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/chat', '/api/observe/verify'],
};
