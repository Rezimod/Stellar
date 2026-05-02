// POST   /api/feed/follow      { followed }      — follow a wallet (Privy-auth)
// DELETE /api/feed/follow?followed=...           — unfollow
// GET    /api/feed/follow?wallet=...             — public counts for a wallet
//        /api/feed/follow?follower=A&followed=B  — { isFollowing: bool }

import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { feedFollows, users } from '@/lib/schema'
import { isValidPublicKey } from '@/lib/validate'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
)

async function authedWallet(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  let privyId: string
  try {
    const claims = await privy.verifyAuthToken(token)
    privyId = claims.userId
  } catch {
    return null
  }
  const db = getDb()
  if (!db) return null
  const [row] = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.privyId, privyId))
    .limit(1)
  return row?.walletAddress ?? null
}

export async function GET(req: NextRequest) {
  const db = getDb()
  if (!db) return NextResponse.json({ followers: 0, following: 0, isFollowing: false })

  const wallet = req.nextUrl.searchParams.get('wallet')
  const follower = req.nextUrl.searchParams.get('follower')
  const followed = req.nextUrl.searchParams.get('followed')

  if (follower && followed) {
    if (!isValidPublicKey(follower) || !isValidPublicKey(followed)) {
      return NextResponse.json({ isFollowing: false })
    }
    const [row] = await db
      .select({ id: feedFollows.id })
      .from(feedFollows)
      .where(and(
        eq(feedFollows.followerWallet, follower),
        eq(feedFollows.followedWallet, followed),
      ))
      .limit(1)
    return NextResponse.json({ isFollowing: !!row })
  }

  if (wallet) {
    if (!isValidPublicKey(wallet)) {
      return NextResponse.json({ followers: 0, following: 0 })
    }
    const [followers] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedFollows)
      .where(eq(feedFollows.followedWallet, wallet))
    const [following] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedFollows)
      .where(eq(feedFollows.followerWallet, wallet))
    return NextResponse.json({
      followers: Number(followers?.n ?? 0),
      following: Number(following?.n ?? 0),
    })
  }

  return NextResponse.json({ error: 'wallet or (follower & followed) required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const follower = await authedWallet(req)
  if (!follower) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { followed?: string } | null
  const followed = body?.followed
  if (!followed || !isValidPublicKey(followed)) {
    return NextResponse.json({ error: 'Invalid followed wallet' }, { status: 400 })
  }
  if (followed === follower) {
    return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 })
  }

  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  await db
    .insert(feedFollows)
    .values({ followerWallet: follower, followedWallet: followed })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true, isFollowing: true })
}

export async function DELETE(req: NextRequest) {
  const follower = await authedWallet(req)
  if (!follower) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const followed = req.nextUrl.searchParams.get('followed')
  if (!followed || !isValidPublicKey(followed)) {
    return NextResponse.json({ error: 'Invalid followed wallet' }, { status: 400 })
  }

  const db = getDb()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  await db
    .delete(feedFollows)
    .where(and(
      eq(feedFollows.followerWallet, follower),
      eq(feedFollows.followedWallet, followed),
    ))

  return NextResponse.json({ ok: true, isFollowing: false })
}
