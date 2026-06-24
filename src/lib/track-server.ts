// Server-side analytics. For events that must be emitted from a route handler
// after a server-confirmed action (a mint landing on-chain, a redeem code
// issued, a signup row first created) — not from the client, which could forge
// them. Writes straight to the same `analytics_event` table the client
// `track()` helper feeds, so both streams query identically.
//
// Fire-and-forget: never awaited on the request hot path, never throws. A
// failed analytics insert must never fail the action it's measuring.

import { getDb } from './db';
import { analyticsEvent } from './schema';

export type ServerTrackEvent =
  | 'signup'
  | 'observation_minted'
  | 'reward_redeemed';

export function trackServer(
  event: ServerTrackEvent,
  wallet: string | null,
  props?: Record<string, unknown>,
): void {
  const db = getDb();
  if (!db) return;
  db.insert(analyticsEvent)
    .values({
      event,
      wallet: wallet ?? null,
      props: props ?? null,
    })
    .catch(() => {
      // analytics must never break the action being measured
    });
}
