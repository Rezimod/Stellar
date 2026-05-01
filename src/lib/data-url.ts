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
