import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { feedPosts, feedReactions, feedComments, feedFollows } from '@/lib/schema'

const REACTION_TYPES = ['like', 'love', 'wow', 'sad', 'dislike', 'star', 'rocket', 'galaxy'] as const
type ReactionType = typeof REACTION_TYPES[number]

function isValidWallet(addr: string): boolean {
  try { new PublicKey(addr); return true } catch { return false }
}

function decodeBase64Size(dataUrl: string): number {
  const idx = dataUrl.indexOf(',')
  if (idx < 0) return 0
  const b64 = dataUrl.slice(idx + 1)
  return Math.floor((b64.length * 3) / 4)
}

function isAllowedImage(dataUrl: string): boolean {
  if (!dataUrl.startsWith('data:image/')) return /^https?:\/\//.test(dataUrl)
  return /^data:image\/(jpeg|jpg|png|webp);base64,/.test(dataUrl)
}

export async function GET(req: NextRequest) {
  const db = getDb()
  if (!db) return NextResponse.json({ posts: [], nextCursor: null })

  const sp = req.nextUrl.searchParams
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20', 10) || 20))
  const before = sp.get('before')
  const filter = sp.get('filter') ?? 'latest'
  const walletAddress = sp.get('walletAddress')
  const authorWallet = sp.get('authorWallet')

  const conds = []
  if (before) {
    const beforeDate = new Date(before)
    if (!isNaN(beforeDate.getTime())) conds.push(lt(feedPosts.createdAt, beforeDate))
  }
  if (authorWallet) {
    conds.push(eq(feedPosts.authorWallet, authorWallet))
  }

  if (filter === 'discoveries') {
    conds.push(inArray(feedPosts.type, ['photo', 'achievement']))
  } else if (filter === 'tonight') {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    conds.push(gt(feedPosts.createdAt, twelveHoursAgo))
  } else if (filter === 'following') {
    if (!walletAddress) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }
    const followed = await db
      .select({ w: feedFollows.followedWallet })
      .from(feedFollows)
      .where(eq(feedFollows.followerWallet, walletAddress))
    const wallets = followed.map(r => r.w)
    if (wallets.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }
    conds.push(inArray(feedPosts.authorWallet, wallets))
  }

  const whereExpr = conds.length ? and(...conds) : undefined
  const rows = await db
    .select()
    .from(feedPosts)
    .where(whereExpr)
    .orderBy(desc(feedPosts.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? sliced[sliced.length - 1].createdAt.toISOString() : null

  if (sliced.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null })
  }

  const postIds = sliced.map(p => p.id)

  const [allComments, allReactions, myReactions] = await Promise.all([
    db.select().from(feedComments).where(inArray(feedComments.postId, postIds)).orderBy(desc(feedComments.createdAt)),
    db
      .select({
        postId: feedReactions.postId,
        reaction: feedReactions.reaction,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(feedReactions)
      .where(inArray(feedReactions.postId, postIds))
      .groupBy(feedReactions.postId, feedReactions.reaction),
    walletAddress
      ? db
          .select()
          .from(feedReactions)
          .where(and(inArray(feedReactions.postId, postIds), eq(feedReactions.wallet, walletAddress)))
      : Promise.resolve([] as Array<{ postId: string; reaction: string }>),
  ])

  const commentsByPost = new Map<string, typeof allComments>()
  for (const c of allComments) {
    const arr = commentsByPost.get(c.postId) ?? []
    if (arr.length < 2) arr.push(c)
    commentsByPost.set(c.postId, arr)
  }

  const reactionsByPost = new Map<string, Array<{ reaction: string; count: number }>>()
  for (const r of allReactions) {
    const arr = reactionsByPost.get(r.postId) ?? []
    arr.push({ reaction: r.reaction, count: Number(r.count) })
    reactionsByPost.set(r.postId, arr)
  }

  const myByPost = new Map<string, string>()
  for (const r of myReactions as Array<{ postId: string; reaction: string }>) {
    myByPost.set(r.postId, r.reaction)
  }

  const posts = sliced.map(p => {
    const reacts = (reactionsByPost.get(p.id) ?? []).sort((a, b) => b.count - a.count)
    const topReactions = reacts.slice(0, 3).map(r => r.reaction)
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      topReactions,
      myReaction: myByPost.get(p.id) ?? null,
      commentsPreview: (commentsByPost.get(p.id) ?? [])
        .slice()
        .reverse()
        .map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
    }
  })

  return NextResponse.json({ posts, nextCursor })
}

export async function POST(req: NextRequest) {
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const authorWallet = String(body.authorWallet ?? '')
  if (!isValidWallet(authorWallet)) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const type = String(body.type ?? '')
  if (!['text', 'photo', 'achievement'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const post = {
    authorWallet,
    authorName: typeof body.authorName === 'string' ? body.authorName.slice(0, 100) : null,
    authorRank: typeof body.authorRank === 'string' ? body.authorRank.slice(0, 40) : null,
    type,
    body: null as string | null,
    imageUrl: null as string | null,
    achievementTarget: null as string | null,
    achievementDifficulty: null as string | null,
    achievementStars: null as number | null,
    achievementMintTx: null as string | null,
    observationTarget: null as string | null,
    observationLat: null as string | null,
    observationLon: null as string | null,
    observationBortle: null as number | null,
    observationNftAddress: null as string | null,
  }

  if (type === 'text') {
    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (!text) return NextResponse.json({ error: 'Body required' }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: 'Body too long' }, { status: 400 })
    post.body = text
  } else if (type === 'photo') {
    const img = typeof body.imageUrl === 'string' ? body.imageUrl : ''
    if (!img) return NextResponse.json({ error: 'Image required' }, { status: 400 })
    if (!isAllowedImage(img)) return NextResponse.json({ error: 'Unsupported image' }, { status: 400 })
    if (img.startsWith('data:') && decodeBase64Size(img) > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 })
    }
    post.imageUrl = img
    if (typeof body.body === 'string' && body.body.trim()) post.body = body.body.trim().slice(0, 2000)
    if (typeof body.observationTarget === 'string') post.observationTarget = body.observationTarget.slice(0, 120)
    if (typeof body.observationLat === 'string') post.observationLat = body.observationLat.slice(0, 32)
    if (typeof body.observationLon === 'string') post.observationLon = body.observationLon.slice(0, 32)
    if (typeof body.observationBortle === 'number') post.observationBortle = body.observationBortle
    if (typeof body.observationNftAddress === 'string') post.observationNftAddress = body.observationNftAddress.slice(0, 80)
  } else if (type === 'achievement') {
    const target = typeof body.achievementTarget === 'string' ? body.achievementTarget.trim() : ''
    if (!target) return NextResponse.json({ error: 'achievementTarget required' }, { status: 400 })
    const stars = typeof body.achievementStars === 'number' ? body.achievementStars : null
    if (stars === null) return NextResponse.json({ error: 'achievementStars required' }, { status: 400 })
    post.achievementTarget = target.slice(0, 120)
    post.achievementDifficulty = typeof body.achievementDifficulty === 'string' ? body.achievementDifficulty.slice(0, 40) : null
    post.achievementStars = stars
    post.achievementMintTx = typeof body.achievementMintTx === 'string' ? body.achievementMintTx.slice(0, 120) : null
    if (typeof body.body === 'string' && body.body.trim()) post.body = body.body.trim().slice(0, 2000)
  }

  const [inserted] = await db.insert(feedPosts).values(post).returning()
  return NextResponse.json({
    ...inserted,
    createdAt: inserted.createdAt.toISOString(),
    topReactions: [],
    myReaction: null,
    commentsPreview: [],
  })
}
