import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { verifyAction } from '@/lib/agent-token'

export const runtime = 'nodejs'

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;background:#0a0d18;color:#e7ecf3;margin:0;padding:48px 24px;display:flex;flex-direction:column;align-items:center;min-height:100vh}main{max-width:520px;width:100%}h1{font-size:20px;margin:0 0 16px}p{line-height:1.6;color:#aab2c2;font-size:15px}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sig = req.nextUrl.searchParams.get('sig')
  if (!id || !sig) return htmlResponse('Invalid link', '<p>Missing id or signature.</p>', 400)
  if (!verifyAction(id, 'reject', sig)) return htmlResponse('Invalid signature', '<p>This reject link is invalid.</p>', 403)

  const db = getDb()
  if (!db) return htmlResponse('Database unavailable', '<p>DATABASE_URL not configured.</p>', 500)

  const [draft] = await db.select().from(tweetDrafts).where(eq(tweetDrafts.id, id))
  if (!draft) return htmlResponse('Draft not found', '<p>No draft with that id.</p>', 404)
  if (draft.status !== 'pending') return htmlResponse('Already reviewed', `<p>This draft is already <strong>${draft.status}</strong>.</p>`)

  await db
    .update(tweetDrafts)
    .set({ status: 'rejected', reviewedAt: new Date() })
    .where(eq(tweetDrafts.id, id))

  return htmlResponse('Rejected', '<p>Draft discarded. The next one fires on tomorrow\'s cron.</p>')
}
