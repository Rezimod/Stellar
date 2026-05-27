import { NextResponse } from 'next/server';

const NOT_FOUND = NextResponse.json(
  { error: 'Not found. Use /api/users/profile, /api/users/upsert, or /api/users/[wallet].' },
  { status: 404 },
);

export function GET() { return NOT_FOUND; }
export function POST() { return NOT_FOUND; }
