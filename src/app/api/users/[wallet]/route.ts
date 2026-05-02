// GET /api/users/[wallet] — public profile snapshot
//   { user: { walletAddress, username, avatar }, followers, following, posts: [...] }

import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { feedFollows, feedPosts, users } from '@/lib/schema'
import { isValidPublicKey } from '@/lib/validate'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await params
  if (!wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const db = getDb()
  if (!db) {
    return NextResponse.json({
      user: null, followers: 0, following: 0, posts: [],
    })
  }

  const [userRow] = await db
    .select({
      walletAddress: users.walletAddress,
      username: users.username,
      avatar: users.avatar,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.walletAddress, wallet))
    .limit(1)

  const [[followers], [following], discoveries] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedFollows)
      .where(eq(feedFollows.followedWallet, wallet)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedFollows)
      .where(eq(feedFollows.followerWallet, wallet)),
    db
      .select({
        id: feedPosts.id,
        type: feedPosts.type,
        body: feedPosts.body,
        imageUrl: feedPosts.imageUrl,
        observationTarget: feedPosts.observationTarget,
        observationNftAddress: feedPosts.observationNftAddress,
        achievementTarget: feedPosts.achievementTarget,
        achievementMintTx: feedPosts.achievementMintTx,
        createdAt: feedPosts.createdAt,
      })
      .from(feedPosts)
      .where(and(
        eq(feedPosts.authorWallet, wallet),
        inArray(feedPosts.type, ['photo', 'achievement']),
      ))
      .orderBy(desc(feedPosts.createdAt))
      .limit(24),
  ])

  return NextResponse.json({
    user: userRow ?? { walletAddress: wallet, username: null, avatar: null, createdAt: null },
    followers: Number(followers?.n ?? 0),
    following: Number(following?.n ?? 0),
    discoveries: discoveries.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  })
}
