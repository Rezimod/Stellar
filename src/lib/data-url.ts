// Convert a data: URL to a Blob without using fetch().
// Strict CSP (connect-src) blocks fetch() of data: URIs in production,
// so we decode base64 directly when the input is a data URL and fall
// back to fetch() for ordinary URLs (blob:, http(s):, /relative).
export async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) throw new Error('Malformed data URL');
    const meta = url.slice(5, commaIdx);
    const payload = url.slice(commaIdx + 1);
    const isBase64 = meta.endsWith(';base64');
    const mime = (isBase64 ? meta.slice(0, -7) : meta) || 'application/octet-stream';
    if (isBase64) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(payload)], { type: mime });
  }
  const res = await fetch(url);
  return await res.blob();
}

// Downscale a captured/uploaded photo to a JPEG small enough to keep forever.
// This is the copy stored server-side, and it is what a minted cNFT points at —
// so it is sized for a retina phone screen and a gallery view, not for a
// thumbnail strip. Lands around 300–600 KB, well under the 2 MB row cap.
export async function makeThumbnail(url: string, maxPx = 1600, quality = 0.82): Promise<string> {
  const img = document.createElement('img');
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = url;
  });

  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Bytes a base64 data URL decodes to, without materialising the buffer.
function dataUrlBytes(url: string): number {
  const comma = url.indexOf(',');
  if (comma === -1) return 0;
  const payload = url.length - comma - 1;
  return Math.floor((payload * 3) / 4);
}

// A 48MP phone photo can decode to well over the 10 MB the verify route
// accepts. Shrink only when we have to, and only as far as we have to: full
// resolution is what makes a photo worth minting, so this steps down gently
// rather than flattening every capture to a fixed size.
export async function fitForUpload(url: string, maxBytes = 8_500_000): Promise<string> {
  if (dataUrlBytes(url) <= maxBytes) return url;
  try {
    for (const [maxPx, quality] of [[4032, 0.92], [3200, 0.9], [2400, 0.88], [1800, 0.85]] as const) {
      const shrunk = await makeThumbnail(url, maxPx, quality);
      if (dataUrlBytes(shrunk) <= maxBytes) return shrunk;
    }
    return await makeThumbnail(url, 1400, 0.8);
  } catch {
    // Undecodable format (an exotic HEIC variant, say). Send the original and
    // let the server answer with a clear size/format error rather than failing
    // silently here and losing the verification token further down.
    return url;
  }
}
