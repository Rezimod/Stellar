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
import { getDb } from '@/lib/db'
import { users } from '@/lib/schema'

export async function POST(req: NextRequest) {
  const { privyId, email, walletAddress } = await req.json()

  if (!privyId) {
    return NextResponse.json({ success: false, error: 'privyId required' }, { status: 400 })
  }

  const db = getDb()
  if (!db) {
    return NextResponse.json({ success: false, error: 'no db' })
  }

  const [user] = await db
    .insert(users)
    .values({ privyId, email: email ?? null, walletAddress: walletAddress ?? null })
    .onConflictDoUpdate({
      target: users.privyId,
      set: { email: email ?? null, walletAddress: walletAddress ?? null, updatedAt: new Date() },
    })
    .returning()

  return NextResponse.json({ success: true, user })
}
