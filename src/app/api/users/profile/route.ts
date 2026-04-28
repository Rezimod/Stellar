// GET  /api/users/profile?privyId=...   — fetch current username/avatar (public)
// PUT  /api/users/profile                — update own username/avatar (Privy-auth)

import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users } from '@/lib/schema'
import { sanitizeString } from '@/lib/validate'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
)

const ALLOWED_AVATARS = new Set([
  'planet', 'telescope', 'moon', 'star', 'comet', 'galaxy', 'earth', 'ufo', 'initial',
])
const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,24}$/

export async function GET(req: NextRequest) {
  const privyId = req.nextUrl.searchParams.get('privyId')
  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!privyId && !wallet) {
    return NextResponse.json({ success: false, error: 'privyId or wallet required' }, { status: 400 })
  }
  const db = getDb()
  if (!db) return NextResponse.json({ success: false, error: 'no db' }, { status: 500 })

  const [user] = await db
    .select({
      privyId: users.privyId,
      username: users.username,
      avatar: users.avatar,
      walletAddress: users.walletAddress,
    })
    .from(users)
    .where(privyId ? eq(users.privyId, privyId) : eq(users.walletAddress, wallet!))
    .limit(1)

  return NextResponse.json({ success: true, user: user ?? null })
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let verifiedPrivyId: string
  try {
    const claims = await privy.verifyAuthToken(token)
    verifiedPrivyId = claims.userId
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const update: { username?: string | null; avatar?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  }

  if ('username' in body) {
    if (body.username === null || body.username === '') {
      update.username = null
    } else {
      const trimmed = sanitizeString(String(body.username), 24)
      if (!USERNAME_RE.test(trimmed)) {
        return NextResponse.json(
          { success: false, error: 'Username must be 2–24 chars (letters, numbers, _ . -)' },
          { status: 400 },
        )
      }
      update.username = trimmed
    }
  }

  if ('avatar' in body) {
    if (body.avatar === null || body.avatar === '') {
      update.avatar = null
    } else {
      const a = sanitizeString(String(body.avatar), 16)
      if (!ALLOWED_AVATARS.has(a)) {
        return NextResponse.json({ success: false, error: 'Invalid avatar' }, { status: 400 })
      }
      update.avatar = a
    }
  }

  if (!('username' in update) && !('avatar' in update)) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 })
  }

  const db = getDb()
  if (!db) return NextResponse.json({ success: false, error: 'no db' }, { status: 500 })

  const [user] = await db
    .update(users)
    .set(update)
    .where(eq(users.privyId, verifiedPrivyId))
    .returning()

  if (!user) {
    // Insert on first save (user might not be in DB yet if upsert hadn't fired).
    const [created] = await db
      .insert(users)
      .values({
        privyId: verifiedPrivyId,
        username: update.username ?? null,
        avatar: update.avatar ?? null,
      })
      .onConflictDoUpdate({
        target: users.privyId,
        set: update,
      })
      .returning()
    return NextResponse.json({ success: true, user: created })
  }

  return NextResponse.json({ success: true, user })
}
