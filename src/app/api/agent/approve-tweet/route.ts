import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { verifyAction } from '@/lib/agent-token'
import { postTweet } from '@/lib/twitter'
import { sendTelegram } from '@/lib/telegram'
import { formatXApiError, isCreditsDepleted } from '@/lib/x-post'
import { renderComposePage } from '@/lib/x-compose-page'

export const runtime = 'nodejs'
export const maxDuration = 30

const PAGE_STYLES = `body{font-family:system-ui,sans-serif;background:#0a0d18;color:#e7ecf3;margin:0;padding:48px 24px}main{max-width:520px;margin:0 auto}h1{font-size:20px}p{color:#aab2c2;line-height:1.6}a{color:#8b5cf6}`

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${PAGE_STYLES}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function composePage(draft: { body: string; imageBase64: string | null }, id: string, sig: string) {
  return new NextResponse(
    renderComposePage({
      draftId: id,
      sig,
      body: draft.body,
      hasImage: !!draft.imageBase64,
    }),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

/** Default: manual compose (API credits empty). Set X_USE_API_POST=1 to try API first. */
function useApiPost(): boolean {
  return process.env.X_USE_API_POST === '1'
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sig = req.nextUrl.searchParams.get('sig')
  if (!id || !sig) return htmlResponse('Invalid link', '<p>Missing id or signature.</p>', 400)

  try {
    if (!verifyAction(id, 'approve', sig)) {
      return htmlResponse('Invalid signature', '<p>This approve link is invalid or has been tampered with.</p>', 403)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Configuration error'
    return htmlResponse('Agent not configured', `<p>${escapeHtml(msg)}</p>`, 500)
  }

  const db = getDb()
  if (!db) return htmlResponse('Database unavailable', '<p>DATABASE_URL not configured.</p>', 500)

  const [draft] = await db.select().from(tweetDrafts).where(eq(tweetDrafts.id, id))
  if (!draft) return htmlResponse('Draft not found', '<p>No draft with that id.</p>', 404)
  if (draft.status === 'posted') {
    return htmlResponse(
      'Already posted',
      `<p>This draft was already posted${draft.postedTweetId && draft.postedTweetId !== 'manual' ? ` as <a href="https://twitter.com/i/web/status/${draft.postedTweetId}">tweet ${draft.postedTweetId}</a>` : ' manually on X'}.</p>`,
    )
  }
  if (draft.status === 'rejected') {
    return htmlResponse('Already rejected', '<p>This draft was rejected and cannot be posted.</p>')
  }

  if (req.nextUrl.searchParams.get('done') === '1') {
    const now = new Date()
    await db
      .update(tweetDrafts)
      .set({ status: 'posted', postedTweetId: 'manual', postedAt: now, reviewedAt: now })
      .where(eq(tweetDrafts.id, id))
    return htmlResponse('Marked posted', '<p>Draft marked as posted. Next cron run is tomorrow.</p>')
  }

  if (!useApiPost() || req.nextUrl.searchParams.get('compose') === '1') {
    return composePage(draft, id, sig)
  }

  try {
    const image = draft.imageBase64 ? Buffer.from(draft.imageBase64, 'base64') : undefined
    const posted = await postTweet(draft.body, { image })
    const now = new Date()
    await db
      .update(tweetDrafts)
      .set({ status: 'posted', postedTweetId: posted.id, postedAt: now, reviewedAt: now })
      .where(eq(tweetDrafts.id, id))

    try {
      await sendTelegram(`Posted: https://twitter.com/i/web/status/${posted.id}`)
    } catch {}

    return htmlResponse(
      'Posted',
      `<p>Live on X.</p><div class="body">${escapeHtml(draft.body)}</div><p><a href="https://twitter.com/i/web/status/${posted.id}">Open on X</a></p>`,
    )
  } catch (err) {
    if (isCreditsDepleted(err)) {
      return composePage(draft, id, sig)
    }

    const msg = formatXApiError(err)
    console.error('[agent/approve-tweet] post failed', err)
    return composePage(draft, id, sig)
  }
}
