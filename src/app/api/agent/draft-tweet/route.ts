import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { draftTweet, pickKindForToday, type TweetKind } from '@/lib/tweet-agent'
import { sendTelegram } from '@/lib/telegram'
import { signAction } from '@/lib/agent-token'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_KINDS: TweetKind[] = ['sky_verdict', 'space_news', 'product_spotlight', 'astro_fact']

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const db = getDb()
  if (!db) return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 })

  const kindParam = req.nextUrl.searchParams.get('kind') as TweetKind | null
  const kind = kindParam && VALID_KINDS.includes(kindParam) ? kindParam : pickKindForToday()

  let drafted
  try {
    drafted = await draftTweet(kind)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'draft failed'
    console.error('[agent/draft-tweet] generation failed', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const [row] = await db
    .insert(tweetDrafts)
    .values({ kind: drafted.kind, body: drafted.body, context: drafted.context })
    .returning()

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'
  const approveUrl = `${base}/api/agent/approve-tweet?id=${row.id}&sig=${signAction(row.id, 'approve')}`
  const rejectUrl = `${base}/api/agent/reject-tweet?id=${row.id}&sig=${signAction(row.id, 'reject')}`

  const message = [
    `*Stellarr X draft — ${drafted.kind.replace('_', ' ')}*`,
    '',
    drafted.body,
    '',
    `[Approve & post](${approveUrl})`,
    `[Reject](${rejectUrl})`,
  ].join('\n')

  try {
    await sendTelegram(message)
  } catch (err) {
    console.error('[agent/draft-tweet] telegram send failed', err)
  }

  return NextResponse.json({ id: row.id, kind: drafted.kind, body: drafted.body, approveUrl, rejectUrl })
}

export const GET = handle
export const POST = handle
