// Server-side guardrails for /api/award-stars. Sidera froze Stars earning; the
// only award left is proof-of-find from /sky, a fixed 10 per target that is
// actually above the horizon (re-derived server-side in the route).

export function isAllowedAwardReason(reason: string): boolean {
  return reason.startsWith('find:');
}

