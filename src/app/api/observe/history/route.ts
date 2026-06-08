import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { getDb } from '@/lib/db'
import { observationLog } from '@/lib/schema'
import { assertOwnsWallet } from '@/lib/api-auth'
import { eq, desc } from 'drizzle-orm'
import { isValidPublicKey } from '@/lib/validate'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let privyId: string
  try {
    const claims = await privy.verifyAuthToken(token)
    privyId = claims.userId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const walletAddress = req.nextUrl.searchParams.get('walletAddress')
  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
  }

  if (!isValidPublicKey(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const db = getDb()
  if (!db) {
    return NextResponse.json({ observations: [] })
  }

  const owns = await assertOwnsWallet(privyId, walletAddress)
  if (!owns) {
    return NextResponse.json({ error: 'You can only view your own observation history' }, { status: 403 })
  }

  try {
    const observations = await db
      .select()
      .from(observationLog)
      .where(eq(observationLog.wallet, walletAddress))
      .orderBy(desc(observationLog.createdAt))
      .limit(50)
    return NextResponse.json({ observations })
  } catch (err) {
    console.error('[observe/history]', err)
    return NextResponse.json({ observations: [] })
  }
}
