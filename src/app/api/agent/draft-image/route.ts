import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { verifyAction } from '@/lib/agent-token'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sig = req.nextUrl.searchParams.get('sig')
  if (!id || !sig) return new NextResponse('Missing id or signature', { status: 400 })
  if (!verifyAction(id, 'approve', sig)) {
    return new NextResponse('Invalid signature', { status: 403 })
  }

  const db = getDb()
  if (!db) return new NextResponse('Database unavailable', { status: 500 })

  const [draft] = await db.select().from(tweetDrafts).where(eq(tweetDrafts.id, id))
  if (!draft?.imageBase64) return new NextResponse('No image for this draft', { status: 404 })

  const buf = Buffer.from(draft.imageBase64, 'base64')
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="stellarr-post.png"',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
