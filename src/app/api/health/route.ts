/** Lightweight liveness probe for uptime monitors. No auth, no side effects. */
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'stellar',
    timestamp: new Date().toISOString(),
  });
}
