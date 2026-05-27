import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { verifyAction } from '@/lib/agent-token'
import { postTweet } from '@/lib/twitter'
import { sendTelegram } from '@/lib/telegram'

export const runtime = 'nodejs'
export const maxDuration = 30

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;background:#0a0d18;color:#e7ecf3;margin:0;padding:48px 24px;display:flex;flex-direction:column;align-items:center;min-height:100vh}main{max-width:520px;width:100%}h1{font-size:20px;margin:0 0 16px}p{line-height:1.6;color:#aab2c2;font-size:15px}.body{background:#151a28;border:1px solid #232a3d;padding:16px;border-radius:12px;white-space:pre-wrap;margin:16px 0;font-size:14px;line-height:1.55;color:#e7ecf3}a{color:#8b5cf6;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sig = req.nextUrl.searchParams.get('sig')
  if (!id || !sig) return htmlResponse('Invalid link', '<p>Missing id or signature.</p>', 400)
  if (!verifyAction(id, 'approve', sig)) return htmlResponse('Invalid signature', '<p>This approve link is invalid or has been tampered with.</p>', 403)

  const db = getDb()
  if (!db) return htmlResponse('Database unavailable', '<p>DATABASE_URL not configured.</p>', 500)

  const [draft] = await db.select().from(tweetDrafts).where(eq(tweetDrafts.id, id))
  if (!draft) return htmlResponse('Draft not found', '<p>No draft with that id.</p>', 404)
  if (draft.status === 'posted') {
    return htmlResponse('Already posted', `<p>This draft was already posted${draft.postedTweetId ? ` as <a href="https://twitter.com/i/web/status/${draft.postedTweetId}">tweet ${draft.postedTweetId}</a>` : ''}.</p>`)
  }
  if (draft.status === 'rejected') {
    return htmlResponse('Already rejected', '<p>This draft was rejected and cannot be posted.</p>')
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
    const msg = err instanceof Error ? err.message : 'unknown error'
    await db
      .update(tweetDrafts)
      .set({ status: 'failed', errorMessage: msg, reviewedAt: new Date() })
      .where(eq(tweetDrafts.id, id))
    console.error('[agent/approve-tweet] post failed', err)
    return htmlResponse('Post failed', `<p>${escapeHtml(msg)}</p>`, 500)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
