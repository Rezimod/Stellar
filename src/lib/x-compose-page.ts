import { getTweetIntentUrl } from './x-post'

export function getPreviewImageUrl(draftId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
  return `${base}/api/agent/preview/${draftId}`
}

/** Tweet text + public image URL so X renders a large image card (no API credits). */
export function buildTweetWithImageUrl(body: string, draftId: string): string {
  const url = getPreviewImageUrl(draftId)
  if (body.includes(url)) return body
  const room = 280 - url.length - 2
  const trimmed = body.length > room ? `${body.slice(0, room - 1)}…` : body
  return `${trimmed}\n\n${url}`
}

export function renderComposePage(opts: {
  draftId: string
  sig: string
  body: string
  hasImage: boolean
}): string {
  const { draftId, sig, body, hasImage } = opts
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarr.club'
  const markUrl = `${base}/api/agent/approve-tweet?id=${draftId}&sig=${encodeURIComponent(sig)}&done=1`
  const imageUrl = `${base}/api/agent/draft-image?id=${draftId}&sig=${encodeURIComponent(sig)}`
  const previewUrl = getPreviewImageUrl(draftId)
  const tweetText = hasImage ? buildTweetWithImageUrl(body, draftId) : body
  const composeUrl = getTweetIntentUrl(tweetText)

  const imageBlock = hasImage
    ? `<img class="img-preview" src="${escapeHtml(previewUrl)}" alt="Post image" />`
    : ''

  const steps = hasImage
    ? `<ol class="steps">
<li>Tap <strong>Post on X</strong> below — opens X with your text and image link.</li>
<li>X will show the image as a preview card on the tweet.</li>
<li>To attach the file directly instead: tap <strong>Save image</strong>, then add it in X compose.</li>
</ol>`
    : `<p>Tap <strong>Post on X</strong> to open compose with your draft text.</p>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Post on X — Stellar</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0d18;color:#e7ecf3;margin:0;padding:32px 20px 48px}
main{max-width:480px;margin:0 auto}
h1{font-size:22px;margin:0 0 12px}
p,li{line-height:1.55;color:#aab2c2;font-size:15px}
.steps{padding-left:20px;margin:12px 0}
.steps li{margin-bottom:8px}
.body{background:#151a28;border:1px solid #232a3d;padding:16px;border-radius:12px;white-space:pre-wrap;margin:16px 0;font-size:14px;color:#e7ecf3}
.btn{display:block;width:100%;margin:10px 0 0;padding:16px 20px;border-radius:12px;font-weight:600;font-size:16px;text-align:center;border:none;cursor:pointer;font-family:inherit;text-decoration:none;box-sizing:border-box}
.btn-primary{background:#8b5cf6;color:#fff}
.btn-secondary{background:#232a3d;color:#e7ecf3;border:1px solid #3d4663}
.img-preview{width:100%;border-radius:12px;margin:12px 0;border:1px solid #232a3d;display:block}
.hint{font-size:13px;color:#7a8499;margin-top:16px}
.status{display:none;margin-top:12px;padding:12px;border-radius:8px;background:#1a2236;font-size:14px;color:#c4d0e8}
.status.show{display:block}
a{color:#8b5cf6}
</style>
</head>
<body>
<main>
<h1>Post on X</h1>
${steps}
<div class="body">${escapeHtml(body)}</div>
${imageBlock}
<button type="button" class="btn btn-primary" id="postBtn">Post on X</button>
${hasImage ? `<a class="btn btn-secondary" href="${escapeHtml(imageUrl)}" download="stellarr-post.png">Save image to phone</a>` : ''}
<a class="btn btn-secondary" href="${escapeHtml(markUrl)}">I've posted — mark done</a>
<p id="status" class="status"></p>
<p class="hint">Automatic posting needs X API credits at <a href="https://developer.x.com/en/portal/products">developer.x.com</a>. This flow works without credits.</p>
</main>
<script>
(function(){
  var text = ${JSON.stringify(tweetText)};
  var rawText = ${JSON.stringify(body)};
  var composeUrl = ${JSON.stringify(composeUrl)};
  var imageUrl = ${JSON.stringify(imageUrl)};
  var hasImage = ${hasImage ? 'true' : 'false'};
  var status = document.getElementById('status');
  function show(msg){ status.textContent = msg; status.classList.add('show'); }

  async function copyImage(){
    var resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error('load image');
    var blob = await resp.blob();
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
    return false;
  }

  document.getElementById('postBtn').addEventListener('click', async function(){
    try {
      if (hasImage) {
        try {
          var resp = await fetch(imageUrl);
          var blob = await resp.blob();
          var file = new File([blob], 'stellarr-post.png', { type: 'image/png' });
          if (navigator.share) {
            try {
              await navigator.share({ text: rawText, files: [file] });
              show('Shared — pick X in the share sheet. Image + text should both appear.');
              return;
            } catch (e) { if (e && e.name === 'AbortError') return; }
          }
          var copied = await copyImage();
          if (copied) {
            window.open(composeUrl, '_blank');
            show('Image copied. In X compose, long-press and Paste to attach the image. Text is already filled in.');
            return;
          }
        } catch (e) {}
      }
      window.open(composeUrl, '_blank');
      show(hasImage
        ? 'X opened with your text and image preview link. The image will show as a card on the tweet.'
        : 'X compose opened with your text.');
    } catch (err) {
      show('Could not open X. Open x.com manually and paste your draft.');
    }
  });
})();
</script>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
