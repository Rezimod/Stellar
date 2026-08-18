/**
 * Demo mode — the full reveal, with no wallet and no chain.
 *
 * `?demo=true` on /discovery/reveal plays the whole sequence against a fixed
 * pass, so the flow can be recorded or shown to someone who has never held a
 * Solana wallet. Nothing here touches an RPC.
 *
 * DEMO_WALLET is not a real address and holds no key. It is base58-valid on
 * purpose: the pass id `<wallet>-<pass>` has to survive parsePassId and the
 * share-card endpoint's validation, so /discovery/DEMoPass…-9999 renders and
 * previews like any other holder's link.
 */

/** Placeholder address. Base58 has no `0`, `O`, `I` or `l`, hence `DEMo`. */
export const DEMO_WALLET = 'DEMoPass1111111111111111111111111111111111Da';

/**
 * The demo pass. This pair — DEMO_WALLET at 9999 — hashes to LEGENDARY
 * "Eta Carinae" with the current REVEAL_SALT, which is the outcome worth
 * showing: a Full Astroman Telescope plus 50,000 STRLLR.
 *
 * Eta Carinae specifically, not TON 618: it is the rare Legendary object that
 * has actually been photographed, so the demo reveal shows a real Hubble frame
 * rather than the generated fallback.
 *
 * The tail of DEMO_WALLET was searched for precisely to land this draw. If
 * REVEAL_SALT ever changes (it will — see the commit-and-reveal note in
 * rarityEngine.ts), this pair resolves to something ordinary and the tail has
 * to be searched again. `demo.test.ts` fails loudly when that happens.
 */
export const DEMO_PASS = 9999;

/**
 * Whether demo mode is on.
 *
 * Server components pass their own search params; called with no argument it
 * reads the browser's URL, and is safe during SSR (returns false).
 */
export function isDemoMode(search?: string | URLSearchParams): boolean {
  if (search === undefined) {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('demo') === 'true';
  }
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get('demo') === 'true';
}
