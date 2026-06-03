import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'

export const runtime = 'nodejs'

/** Public PNG for a pending draft — used in tweet URL so X shows an image card. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = getDb()
  if (!db) return new NextResponse('Unavailable', { status: 500 })

  const [draft] = await db
    .select({ imageBase64: tweetDrafts.imageBase64, status: tweetDrafts.status })
    .from(tweetDrafts)
    .where(eq(tweetDrafts.id, id))

  if (!draft?.imageBase64) return new NextResponse('Not found', { status: 404 })
  if (draft.status === 'rejected') return new NextResponse('Gone', { status: 410 })

  return new NextResponse(Buffer.from(draft.imageBase64, 'base64'), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
