import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observationPhoto } from '@/lib/schema'

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
