import { createHmac, timingSafeEqual } from 'node:crypto'

function getSecret(): string {
  const s = process.env.X_AGENT_SECRET
  if (!s || s.length < 16) {
    throw new Error('X_AGENT_SECRET must be set (>=16 chars). Generate with: openssl rand -hex 32')
  }
  return s
}

// Approve/reject links are signed with a 24h time bucket so a leaked link can't
// be replayed indefinitely. A link stays valid for the bucket it was minted in
// plus the next one (24–48h), which comfortably covers the daily review cadence
// while bounding replay. Signatures keep the same shape — callers are unchanged.
const WINDOW_MS = 24 * 60 * 60 * 1000

function macFor(draftId: string, action: 'approve' | 'reject', bucket: number): string {
  return createHmac('sha256', getSecret()).update(`${draftId}:${action}:${bucket}`).digest('hex').slice(0, 32)
}

export function signAction(draftId: string, action: 'approve' | 'reject'): string {
  return macFor(draftId, action, Math.floor(Date.now() / WINDOW_MS))
}

export function verifyAction(draftId: string, action: 'approve' | 'reject', sig: string): boolean {
  const now = Math.floor(Date.now() / WINDOW_MS)
  for (const bucket of [now, now - 1]) {
    const expected = macFor(draftId, action, bucket)
    if (sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return true
    }
  }
  return false
}
