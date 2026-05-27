import { createHmac, timingSafeEqual } from 'node:crypto'

function getSecret(): string {
  const s = process.env.X_AGENT_SECRET
  if (!s || s.length < 16) {
    throw new Error('X_AGENT_SECRET must be set (>=16 chars). Generate with: openssl rand -hex 32')
  }
  return s
}

export function signAction(draftId: string, action: 'approve' | 'reject'): string {
  const mac = createHmac('sha256', getSecret()).update(`${draftId}:${action}`).digest('hex')
  return mac.slice(0, 32)
}

export function verifyAction(draftId: string, action: 'approve' | 'reject', sig: string): boolean {
  const expected = signAction(draftId, action)
  if (sig.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}
