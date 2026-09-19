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

## Phase 5

11. **Digital, physical, or both?** Gate 2's cost list (fulfilment, packaging,
    returns) implies printed cards. The capsule order stores no shipping address
    today (the orders columns are written empty). Decide before Gate 2's numbers
    are final; `contentsCostPerCardGel`, `fulfilmentGel` and `packagingGel` are 0
    until then.

12. **Unpaid capsules.** A purchase fixes the nonce before payment, so an order
    that is never paid has to be voided (admin/cron `POST /api/sidera/capsules/void`),
    and the log shows it as voided after purchase, with the reason and the
    revealed secret. What timeout voids an unpaid capsule — and should a cron do it?

13. **Refunds.** A direct card order whose card sells out between order and
    payment is marked `refund_due`; a payment that lands after its capsule was
    voided has nothing to open. Both need a manual refund path; none exists.

14. **Direct sales and capsule supply.** Listing refuses capsules the remaining
    editions cannot fill, but a direct card purchase can still take an edition a
    listed capsule was counting on. With Set 001's 3,035 editions this is
    theoretical; at a sold-out set it is not.

15. **Release gating.** Set 001 is `draft`. Nothing in the capsule or card routes
    checks the set's status — listing is the gate for capsules, but a direct card
    purchase works on a draft set. Gate on `card_set.status = 'released'`?

16. **CAPSULE_SEAL_KEY.** Must be set (32 bytes hex) in any environment that
    lists or opens capsules. Losing it strands every listed-but-unopened
    capsule: its secret can no longer be revealed, so it can be neither opened
    nor voided. Capsule 3 on the sidera branch is one such — listed by a demo
    run with a temporary key, permanently on sale, and it will show as an
    unopenable listing.
