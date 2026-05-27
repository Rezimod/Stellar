import { NextResponse } from 'next/server';

const NOT_FOUND = NextResponse.json(
  { error: 'Not found. Use /api/feed/posts, /api/feed/comments, /api/feed/reactions, /api/feed/follow, /api/feed/shares, or /api/feed/shop-preview.' },
  { status: 404 },
);

export function GET() { return NOT_FOUND; }
export function POST() { return NOT_FOUND; }
