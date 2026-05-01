// Run in Neon SQL editor before using this route:
// CREATE TABLE IF NOT EXISTS public.users (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   privy_id text UNIQUE NOT NULL,
//   email text,
//   wallet_address text,
//   username text,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );

import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { getDb } from '@/lib/db'
import { users } from '@/lib/schema'
import { isValidEmail, isValidPublicKey, sanitizeString } from '@/lib/validate'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
)

export async function POST(req: NextRequest) {
  try {
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

    let body: { privyId?: string; email?: string | null; walletAddress?: string | null }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }
    const { privyId, email, walletAddress } = body

    if (!privyId) {
      return NextResponse.json({ success: false, error: 'privyId required' }, { status: 400 })
    }

    // Ensure users can only upsert their own record
    if (privyId !== verifiedPrivyId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Validate and sanitize optional fields
    let cleanEmail: string | null = null
    if (email != null) {
      const trimmed = sanitizeString(String(email), 500)
      if (!isValidEmail(trimmed)) {
        return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
      }
      cleanEmail = trimmed
    }

    let cleanWallet: string | null = null
    if (walletAddress != null) {
      const trimmed = sanitizeString(String(walletAddress), 500)
      if (!isValidPublicKey(trimmed)) {
        return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
      }
      cleanWallet = trimmed
    }

    const db = getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: 'no db' }, { status: 503 })
    }

    // Use explicit returning columns so the query doesn't blow up if the
    // production schema is missing any newly-added columns (e.g. avatar).
    const [user] = await db
      .insert(users)
      .values({ privyId, email: cleanEmail, walletAddress: cleanWallet })
      .onConflictDoUpdate({
        target: users.privyId,
        set: { email: cleanEmail, walletAddress: cleanWallet, updatedAt: new Date() },
      })
      .returning({
        id: users.id,
        privyId: users.privyId,
        email: users.email,
        walletAddress: users.walletAddress,
        username: users.username,
      })

    return NextResponse.json({ success: true, user })
  } catch (err) {
    console.error('[users/upsert] error', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
