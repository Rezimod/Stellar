import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import {
  draftTweet,
  pickKindForSlot,
  pickKindForToday,
  SLOT_LABELS,
  type DailySlot,
  type TweetKind,
} from '@/lib/tweet-agent'
import { sendTelegram, sendTelegramPhoto } from '@/lib/telegram'
import { generateTweetImage } from '@/lib/tweet-image'
import { signAction } from '@/lib/agent-token'

export const runtime = 'nodejs'
export const maxDuration = 120

const VALID_KINDS: TweetKind[] = [
  'sky_verdict',
  'space_news',
  'product_spotlight',
  'astro_fact',
  'short_post',
]

const VALID_SLOTS: DailySlot[] = ['morning', 'afternoon', 'evening']

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

  const slotParam = req.nextUrl.searchParams.get('slot') as DailySlot | null
  const kindParam = req.nextUrl.searchParams.get('kind') as TweetKind | null
  const slot =
    slotParam && VALID_SLOTS.includes(slotParam) ? slotParam : null
  const kind =
    kindParam && VALID_KINDS.includes(kindParam)
      ? kindParam
      : slot
        ? pickKindForSlot(slot)
        : pickKindForToday()
  const slotLabel = slot ? SLOT_LABELS[slot] : 'Daily'

  let drafted
  try {
    drafted = await draftTweet(kind)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'draft failed'
    console.error('[agent/draft-tweet] generation failed', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const skipImage = req.nextUrl.searchParams.get('skipImage') === '1'
  let imageBuf: Buffer | null = null
  let imageBase64: string | null = null
  if (!skipImage) {
    try {
      imageBuf = await generateTweetImage(drafted.kind, drafted.context)
      imageBase64 = imageBuf.toString('base64')
    } catch (err) {
      console.error('[agent/draft-tweet] image generation failed — proceeding text-only', err)
    }
  }

  const [row] = await db
    .insert(tweetDrafts)
    .values({
      kind: drafted.kind,
      body: drafted.body,
      context: drafted.context,
      imageBase64,
    })
    .returning()

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
  const approveUrl = `${base}/api/agent/approve-tweet?id=${row.id}&sig=${signAction(row.id, 'approve')}`
  const rejectUrl = `${base}/api/agent/reject-tweet?id=${row.id}&sig=${signAction(row.id, 'reject')}`

  const kindLabel = drafted.kind.replace(/_/g, ' ')
  const caption = [
    `*Stellar X · ${slotLabel} · ${kindLabel}*`,
    '',
    drafted.body,
    '',
    `[Post on X](${approveUrl})`,
    `[Reject](${rejectUrl})`,
  ].join('\n')

  try {
    if (imageBuf) {
      await sendTelegramPhoto(imageBuf, caption)
    } else {
      await sendTelegram(caption)
    }
  } catch (err) {
    console.error('[agent/draft-tweet] telegram send failed', err)
  }

  return NextResponse.json({
    id: row.id,
    slot,
    kind: drafted.kind,
    body: drafted.body,
    hasImage: !!imageBase64,
    approveUrl,
    rejectUrl,
  })
}

export const GET = handle
export const POST = handle
