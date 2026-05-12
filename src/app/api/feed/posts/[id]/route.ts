import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, lt } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { verifyPrivy, assertOwnsWallet } from '@/lib/api-auth'
import { feedPosts, feedReactions, feedComments, feedShares, users } from '@/lib/schema'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const sp = req.nextUrl.searchParams
  const commentsLimit = Math.min(50, Math.max(1, parseInt(sp.get('commentsLimit') ?? '20', 10) || 20))
  const commentsBefore = sp.get('commentsBefore')

  const rows = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1)
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const conds = [eq(feedComments.postId, id)]
  if (commentsBefore) {
    const d = new Date(commentsBefore)
    if (!isNaN(d.getTime())) conds.push(lt(feedComments.createdAt, d))
  }
  const comments = await db
    .select()
    .from(feedComments)
    .where(and(...conds))
    .orderBy(desc(feedComments.createdAt))
    .limit(commentsLimit + 1)

  const hasMore = comments.length > commentsLimit
  const sliced = hasMore ? comments.slice(0, commentsLimit) : comments

  return NextResponse.json({
    post: { ...rows[0], createdAt: rows[0].createdAt.toISOString() },
    comments: sliced.slice().reverse().map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
    nextCursor: hasMore ? sliced[sliced.length - 1].createdAt.toISOString() : null,
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const privyId = await verifyPrivy(req)
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { wallet?: string; body?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const [existing] = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await assertOwnsWallet(privyId, existing.authorWallet))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (body.wallet && body.wallet !== existing.authorWallet) {
    return NextResponse.json({ error: 'Wallet does not own this post' }, { status: 403 })
  }

  const nextBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (existing.type === 'text' && !nextBody) {
    return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
  }
  if (nextBody.length > 2000) {
    return NextResponse.json({ error: 'Post body too long' }, { status: 400 })
  }

  const [updated] = await db
    .update(feedPosts)
    .set({ body: nextBody ? nextBody : null })
    .where(eq(feedPosts.id, id))
    .returning()

  const [authorRow] = await db
    .select({ avatar: users.avatar, username: users.username })
    .from(users)
    .where(eq(users.walletAddress, updated.authorWallet))
    .limit(1)

  return NextResponse.json({
    ...updated,
    authorAvatar: authorRow?.avatar ?? null,
    authorName: updated.authorName ?? authorRow?.username ?? null,
    createdAt: updated.createdAt.toISOString(),
  })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const privyId = await verifyPrivy(req)
  if (!privyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1)
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await assertOwnsWallet(privyId, rows[0].authorWallet))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(feedReactions).where(eq(feedReactions.postId, id))
  await db.delete(feedComments).where(eq(feedComments.postId, id))
  await db.delete(feedShares).where(eq(feedShares.postId, id))
  await db.delete(feedPosts).where(eq(feedPosts.id, id))

  return NextResponse.json({ ok: true })
}
