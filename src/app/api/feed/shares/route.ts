import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { feedPosts, feedShares } from '@/lib/schema'
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth'

const ALLOWED_DESTINATIONS = ['farcaster', 'twitter', 'copy_link'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  const privyId = await verifyPrivy(req)
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { postId?: string; wallet?: string; destination?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const postId = body.postId
  const wallet = body.wallet
  const destination = body.destination
  if (!postId || !wallet || !destination) {
    return NextResponse.json({ error: 'postId, wallet, destination required' }, { status: 400 })
  }
  if (!ALLOWED_DESTINATIONS.includes(destination as typeof ALLOWED_DESTINATIONS[number])) {
    return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
  }
  if (!UUID_RE.test(postId)) {
    return NextResponse.json({ error: 'postId must be a UUID' }, { status: 400 })
  }
  if (!(await assertOwnsWallet(privyId, wallet))) {
    return NextResponse.json({ error: 'Wallet does not match session' }, { status: 403 })
  }

  await db.insert(feedShares).values({ postId, wallet, destination })
  await db
    .update(feedPosts)
    .set({ shareCount: sql`${feedPosts.shareCount} + 1` })
    .where(eq(feedPosts.id, postId))

  const [post] = await db
    .select({ shareCount: feedPosts.shareCount })
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
  return NextResponse.json({
    shareCount: post?.shareCount ?? 0,
    shareUrl: `${baseUrl}/feed/post/${postId}`,
  })
}
