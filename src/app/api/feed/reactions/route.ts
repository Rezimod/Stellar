import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { feedPosts, feedReactions } from '@/lib/schema'

const REACTION_TYPES = ['like', 'love', 'wow', 'sad', 'dislike', 'star', 'rocket', 'galaxy'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  let body: { postId?: string; wallet?: string; reaction?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const postId = body.postId
  const wallet = body.wallet
  const reaction = body.reaction
  if (!postId || !wallet || !reaction) {
    return NextResponse.json({ error: 'postId, wallet, reaction required' }, { status: 400 })
  }
  if (!REACTION_TYPES.includes(reaction as typeof REACTION_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
  }
  if (!UUID_RE.test(postId)) {
    return NextResponse.json({ error: 'postId must be a UUID' }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(feedReactions)
    .where(and(eq(feedReactions.postId, postId), eq(feedReactions.wallet, wallet)))
    .limit(1)

  let myReaction: string | null = reaction

  if (existing.length === 0) {
    await db.insert(feedReactions).values({ postId, wallet, reaction })
    await db
      .update(feedPosts)
      .set({ reactionCount: sql`${feedPosts.reactionCount} + 1` })
      .where(eq(feedPosts.id, postId))
  } else if (existing[0].reaction === reaction) {
    await db.delete(feedReactions).where(eq(feedReactions.id, existing[0].id))
    await db
      .update(feedPosts)
      .set({ reactionCount: sql`GREATEST(${feedPosts.reactionCount} - 1, 0)` })
      .where(eq(feedPosts.id, postId))
    myReaction = null
  } else {
    await db
      .update(feedReactions)
      .set({ reaction })
      .where(eq(feedReactions.id, existing[0].id))
  }

  const [post] = await db
    .select({ reactionCount: feedPosts.reactionCount })
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1)

  const aggregated = await db
    .select({
      reaction: feedReactions.reaction,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(feedReactions)
    .where(eq(feedReactions.postId, postId))
    .groupBy(feedReactions.reaction)

  const topReactions = aggregated
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 3)
    .map(r => r.reaction)

  return NextResponse.json({
    reaction: myReaction,
    reactionCount: post?.reactionCount ?? 0,
    topReactions,
  })
}
