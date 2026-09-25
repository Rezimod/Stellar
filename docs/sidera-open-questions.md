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

15. ~~**Release gating.**~~ **Decided 2026-09-20: gate on it.** A direct card
    purchase now refuses unless `card_set.status = 'released'`
    (`cardAvailability`), so one switch puts Set 001 on sale, capsules and
    cards alike. The card page says so rather than offering a button.

16. **CAPSULE_SEAL_KEY.** Must be set (32 bytes hex) in any environment that
    lists or opens capsules. Losing it strands every listed-but-unopened
    capsule: its secret can no longer be revealed, so it can be neither opened
    nor voided. Capsule 3 on the sidera branch is one such — listed by a demo
    run with a temporary key. It has since been withdrawn, with the reason in
    the log, and its record now says so.

17. ~~**The homepage.**~~ **Decided 2026-09-20: delete them.** The legacy
    marketing sections went in a deletion commit of their own. The old
    homepage's last version is in commit `2a677ba`'s tree if Phase 9 wants
    any of it back.

18. **Tonight.** The design brief's top bar names Set 001, Collection and
    Tonight. `/tonight` arrives with the voting in Phase 8, so the bar links to
    Capsules in its place rather than to a 404. Restore Tonight when it exists.
    (Standing; nothing to decide until Phase 8.)

19. ~~**`/collection` and the wallet.**~~ **Decided 2026-09-20: keep the
    address in the URL.** A Collection is a public catalogue, like the log:
    readable and linkable by naming its holder.

20. ~~**The merchant wallet.**~~ **Settled 2026-09-21.**
    `NEXT_PUBLIC_MERCHANT_WALLET` is set on the sidera Vercel project for
    production, preview and development — the same mainnet address the Stellar
    project pays to. Until it was set, "Take this capsule" reached the pay step
    and got a 503: the buy route refuses to quote without a recipient. The
    remaining part of Gate 3 needs a person, not a value: a signed-in stranger
    paying real SOL and opening what they bought.

21. ~~**Phase 7 — does the renderer carry card art?**~~ **Decided 2026-09-22:
    renders for the planets.** Saturn, Mars, Jupiter and Venus carry them; every
    other card keeps its drawn plate. The original finding: Rendered 2026-09-21, the
    three the plan names, then stopped. Saturn and Mars are usable
    (`public/cards/SATURN.webp`, `MARS.webp`; not yet wired to any card).
    Europa fails: Explore has no Europa map, so it comes out a plain beige
    sphere, and the still was not kept. Across Set 001 the renderer can carry
    about 4 objects well (Saturn, Mars, Jupiter, Venus), about 7 at the margin
    (Pluto, the Great Red Spot, the four craters and Tranquility Base, all
    limited by map resolution), and none of the 9 stars, clusters, nebulae and
    galaxies — or Europa, until a public-domain Galileo mosaic is added. **For
    the owner:** expand the renderer to the planets, or keep the drawn plates
    for every card and commission an illustrator. The drawn plates stay live
    until that is decided.

## Phase 8

22. **Where the invite gate closes.** The gate is live only while
    `SIDERA_INVITE_CODES` is set on the Vercel project, and it covers pages
    only: APIs, the on-chain metadata routes and static art stay open, so a
    capsule bought by an invited holder still reveals and verifies. Setting
    it on production closes sidera.stellarr.club to search and to anyone
    without a link, the Gate 3 stranger included — they need an
    `/invite/<code>` link. Took the reversible option: the code ships with
    the gate off until the variable is set. **For the owner:** the codes, and
    when to switch it on.

23. **How much a vote weighs, and how far a lost night carries.** Each held
    edition adds `VOTE_WEIGHT` by its rarity (1 / 2 / 5 / 20, in
    `economics.ts`, PROVISIONAL until Gate 4); holding nothing, there is no
    vote. A night lost to cloud carries its card one night only, and only if
    its object is up then; after that the vote decides again. A clear night
    with no photograph — Node 01 commissioning — is not lost and carries
    nothing. **For the owner:** the weights, and whether a lost card should
    keep carrying until it is photographed.

## Audit fixes (2026-09-24)

24. **Retired Stellar pages and SEO, ahead of Phase 9.** The plan leaves
    redirects and SEO to Phase 9, after Gate 4. An audit found every Sidera
    page telling search engines and link previews that it was the Stellar
    home (canonical, og:title, og:image, sitemap, robots all pointed at
    stellarr.club), and Stellar's /sky, /shop, /profile and the rest live on
    sidera.stellarr.club. The owner asked for the fix now. Took the
    reversible option: metadata, sitemap and robots name Sidera, and
    `src/middleware.ts` sends the retired pages to their Sidera counterpart
    with a temporary (307) redirect, one list to edit. Nothing is deleted.
    Still reachable: /nfts (the legacy observation view), /observatory/*
    (operator tools), /m/* and /api/*. **For the owner:** whether any
    redirected page should stay, and when to make the redirects permanent.

## First Light (2026-09-25)

25. **Set 001 replaced by First Light before anything sold.** The 24 cards
    are new (16 Objects, 8 dated Almanac cards); `card_set.code` stays
    `SET001` and the URL `/set/001`, the display name is First Light. The
    "committed before sale" commitment is per capsule (SHA-256 of that
    capsule's secret) and never covered the card list, so the 20 listed
    capsules keep their commitments; their draws run against whatever
    supply exists when they open. Sealing is read off the clock from
    `eventEndUtc` (`src/lib/sidera/almanac.ts`), not stored: a sealed card
    has 0 editions to draw, is not sold outright, and its tile says Sealed.
    Re-seeding deletes the 18 old card rows only while no edition of them
    exists. **For the owner:** the old rows are still in the sidera DB
    until `sidera:seed` is run; `RARITY_ODDS_BPS` (7570/1960/420/50) was
    tuned to the old 2,700/700/150/15 supply — First Light's is
    2,100/800/120/25 — and was left as published; the Almanac's promised
    capture on the night has no flow yet (nightly_target is by vote).
