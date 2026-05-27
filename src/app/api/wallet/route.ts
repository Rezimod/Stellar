import { NextResponse } from 'next/server';

const NOT_FOUND = NextResponse.json(
  { error: 'Not found. Use /api/wallet/fund.' },
  { status: 404 },
);

export function GET() { return NOT_FOUND; }
export function POST() { return NOT_FOUND; }
