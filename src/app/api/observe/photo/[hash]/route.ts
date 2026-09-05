import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observationLog, observationPhoto } from '@/lib/schema'

// Serves the observer's own photo for an observation, keyed by the sha256 the
// verification token signs. This is the `image` a minted cNFT points at, so it
// must stay publicly readable and cacheable — the hash is content-addressed and
// unguessable, and the image is public metadata once minted.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params
  if (!/^0x[a-f0-9]{40}$/.test(hash)) {
    return NextResponse.json({ error: 'Invalid hash' }, { status: 400 })
  }

  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })

  // The store is written at verify time, before the verdict. Only a photo an
  // observation actually stands behind is public — otherwise this route would
  // be an anonymous image host with a year-long cache.
  const [backing] = await db
    .select({ id: observationLog.id })
    .from(observationLog)
    .where(and(eq(observationLog.fileHash, hash), ne(observationLog.confidence, 'rejected')))
    .limit(1)
  if (!backing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [row] = await db
    .select({ mimeType: observationPhoto.mimeType, imageBase64: observationPhoto.imageBase64 })
    .from(observationPhoto)
    .where(eq(observationPhoto.fileHash, hash))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(Buffer.from(row.imageBase64, 'base64'), {
    headers: {
      'Content-Type': row.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
