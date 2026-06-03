import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { tweetDrafts } from '@/lib/schema'
import { verifyAction } from '@/lib/agent-token'
import { postTweet } from '@/lib/twitter'
import { sendTelegram } from '@/lib/telegram'
import { formatXApiError, getTweetIntentUrl, isCreditsDepleted } from '@/lib/x-post'

export const runtime = 'nodejs'
export const maxDuration = 30

const PAGE_STYLES = `body{font-family:system-ui,sans-serif;background:#0a0d18;color:#e7ecf3;margin:0;padding:48px 24px;display:flex;flex-direction:column;align-items:center;min-height:100vh}main{max-width:520px;width:100%}h1{font-size:20px;margin:0 0 16px}p{line-height:1.6;color:#aab2c2;font-size:15px}.body{background:#151a28;border:1px solid #232a3d;padding:16px;border-radius:12px;white-space:pre-wrap;margin:16px 0;font-size:14px;line-height:1.55;color:#e7ecf3}a{color:#8b5cf6;text-decoration:none}a:hover{text-decoration:underline}.btn{display:inline-block;margin:12px 8px 0 0;padding:12px 20px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;border:none;cursor:pointer;font-family:inherit}.btn-primary{background:#8b5cf6;color:#fff}.btn-secondary{background:#232a3d;color:#e7ecf3;border:1px solid #3d4663}.img-preview{max-width:100%;border-radius:12px;margin:16px 0;border:1px solid #232a3d}.hint{font-size:13px;color:#7a8499;margin-top:8px}`

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${PAGE_STYLES}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function composeFallbackPage(
  draft: { body: string; imageBase64: string | null },
  id: string,
  sig: string,
): NextResponse {
  const intentUrl = getTweetIntentUrl(draft.body)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
  const markUrl = `${base}/api/agent/approve-tweet?id=${id}&sig=${encodeURIComponent(sig)}&done=1`
  const imageUrl = `${base}/api/agent/draft-image?id=${id}&sig=${encodeURIComponent(sig)}`
  const hasImage = !!draft.imageBase64

  const imageBlock = hasImage
    ? `<img class="img-preview" src="data:image/png;base64,${draft.imageBase64}" alt="Tweet image" />`
    : ''

  const shareScript = hasImage
    ? `<script>
(function(){
  var text = ${JSON.stringify(draft.body)};
  var intentUrl = ${JSON.stringify(intentUrl)};
  var imageUrl = ${JSON.stringify(imageUrl)};
  async function postWithImage() {
    try {
      var resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error('Could not load image');
      var blob = await resp.blob();
      var file = new File([blob], 'stellarr-post.png', { type: 'image/png' });
      var payload = { text: text, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    var a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'stellarr-post.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ window.open(intentUrl, '_blank'); }, 400);
    alert('Image saved to your device. In X compose, tap the image icon and attach stellarr-post.png.');
  }
  var btn = document.getElementById('shareWithImage');
  if (btn) btn.addEventListener('click', postWithImage);
})();
</script>`
    : ''

  const primaryBtn = hasImage
    ? `<button type="button" class="btn btn-primary" id="shareWithImage">Post to X with image</button>`
    : `<a class="btn btn-primary" href="${escapeHtml(intentUrl)}" target="_blank" rel="noopener noreferrer">Open X compose</a>`

  const secondaryBtns = hasImage
    ? `<a class="btn btn-secondary" href="${escapeHtml(intentUrl)}" target="_blank" rel="noopener noreferrer">Text only on X</a>
<a class="btn btn-secondary" href="${escapeHtml(imageUrl)}" download="stellarr-post.png">Download image</a>`
    : ''

  return htmlResponse(
    'Post on X',
    `<p><strong>X API credits are empty.</strong> Use <strong>Post to X with image</strong> on your phone — it opens the share sheet so X receives the photo and text together. On desktop, download the image first, then open compose and attach it.</p>
<div class="body">${escapeHtml(draft.body)}</div>
${imageBlock}
${primaryBtn}
${secondaryBtns}
<a class="btn btn-secondary" href="${escapeHtml(markUrl)}">I've posted — mark done</a>
<p class="hint">X compose links cannot attach images automatically. To restore one-tap posting with image, add API credits at <a href="https://developer.x.com/en/portal/products">developer.x.com</a>.</p>
${shareScript}`,
  )
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

  if (req.nextUrl.searchParams.get('compose') === '1') {
    return composeFallbackPage(draft, id, sig)
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
      return composeFallbackPage(draft, id, sig)
    }

    const msg = formatXApiError(err)
    await db
      .update(tweetDrafts)
      .set({ status: 'failed', errorMessage: msg, reviewedAt: new Date() })
      .where(eq(tweetDrafts.id, id))
    console.error('[agent/approve-tweet] post failed', err)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
    const composeUrl = `${base}/api/agent/approve-tweet?id=${id}&sig=${encodeURIComponent(sig)}&compose=1`
    return htmlResponse(
      'Post failed',
      `<p>${escapeHtml(msg)}</p><p><a class="btn btn-primary" href="${escapeHtml(composeUrl)}">Post via X compose instead</a></p>`,
      500,
    )
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
