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

// Downscale a captured/uploaded photo to a JPEG small enough to keep forever
// (a phone upload is often 5 MB+; this lands around 100–250 KB). Used for the
// copy we store server-side so an observation's real image survives the device.
export async function makeThumbnail(url: string, maxPx = 1200, quality = 0.72): Promise<string> {
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
