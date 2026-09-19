# Sidera — open questions

Decisions taken during the build where the plan was ambiguous. Each took the
most reversible option; each needs a yes/no from Rezi.

## Phase 2

1. **`/api/award-stars` still pays 10 Stars for proof-of-find on `/sky`.**
   Gate 0 says Stars earning is frozen. Phase 2 trimmed the route to the
   `find:` branch only (quiz, check-in, cosmic bonus, weekly challenge and
   telescope registration are gone). Removing `find:` too — and the `/sky`
   call — is a one-line policy change. Freeze it fully?

2. **13 API routes with no in-repo caller were kept**, because an external
   caller (share links, crawlers, the Astroman till, old app builds) cannot be
   ruled out from the code: `og/*`, `sky/targets`, `sky/tonight`, `darksky/*`,
   `subscribe`, `products`, `observatory/nodes`, `users` and `wallet` stubs.
   Delete after checking Vercel logs for traffic?

3. **`/api/mint` and `observation-token.ts` stay** so pending legacy cNFT mints
   can still be retried from `/nfts`. No new verification tokens are issued
   (observe/verify is gone), so the route only settles old claims. Retire it
   once `/nfts` becomes `/collection` in Phase 6?

4. **The Name-a-Star registry (`/star`) is now read-only** — its only writer,
   `/api/star/claim`, was cut with the observe flow. Keep as a read-only
   catalogue, or bring claiming back as a Sidera card path?

5. **`src/lib/star-catalog.ts` was deleted** (cut-only). Phase 4 takes star
   coordinates from `src/lib/sky/stars.ts` (`BRIGHT_STARS`) instead.

6. **Pages now prerender statically.** The locale cookie read in
   `src/i18n/request.ts` was what forced every page dynamic; English-only removes
   it. A local `npm run build` therefore needs `NEXT_PUBLIC_PRIVY_APP_ID` set
   (Vercel already has it). Watch the preview for any page that relied on
   per-request rendering.

## Phase 3

7. **Crash gap in the lifecycle script.** A crash between `recordCapture` and
   the attach leaves one orphaned capture; a re-run records a second. Harmless
   on the simulator; worth a guard before the real node runs unattended.

8. **Customer captures can fill tonight's card.** The cron path attaches a
   First Light / request capture of tonight's object to the card when the night
   has none yet. That is the "one capture serves all" rule applied literally —
   confirm a customer's frame may become the public card image.

9. **TYCHO facts** (85 km, rays over 1,500 km) come from general knowledge —
   source-check with the Set 001 data pass.

10. **Real-node path is blocked on the Darkview contract.** `DarkviewAdapter.capture()`
    returns retry by design: the contract has no machine-to-machine capture
    operation, and it forbids inventing one. Needs a contract change from Darkview.
