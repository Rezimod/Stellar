export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1024) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    return url.hostname === 'fcm.googleapis.com'
      || url.hostname === 'updates.push.services.mozilla.com'
      || url.hostname === 'web.push.apple.com'
      || url.hostname.endsWith('.push.apple.com')
      || url.hostname.endsWith('.notify.windows.com');
  } catch {
    return false;
  }
}

export function isPushKey(value: unknown, bytes: number): value is string {
  return typeof value === 'string'
    && /^[A-Za-z0-9_-]+={0,2}$/.test(value)
    && value.length <= Math.ceil(bytes / 3) * 4
    && Buffer.from(value, 'base64url').length === bytes;
}
