# Card design QA — 2026-10-09

Reference: `/Users/nika/Desktop/3 variant.png`.

Final result: passed.

The reference's black card faces, condensed titles, rarity borders, set-number footers, field-note backs, capsule banner and two-column viewer are implemented using the actual 105-card catalog. Existing prices, supply and odds remain authoritative.

Reviewed browser captures at 1440px desktop and 390px mobile: the Genesis shelf, viewer front and back, homepage card integration and Saturn detail page. Card assets are rendered from the shared front component; all 105 WebP exports and social previews use the updated design. Whole planets and rings remain visible.

- No outstanding P0, P1 or P2 visual issues.
- All 105 backs pass frame-boundary and text-layout checks.
- Rarity filtering, search, empty results, next/previous, keyboard flip, Escape, focus restoration and mobile overflow checks pass.
- Reduced-motion preference is respected by the card and viewer interactions.
- TypeScript passes. Unit suite: 687 passed; the documented, pre-existing supernova timing test still fails (11.1 seconds against a less-than-11 assertion).
- Production build passes, including all 137 static pages. Some share-image exports needed an automatic retry.
- Checkout behavior remains connected to the existing flow; no purchase or deployment was performed.

- 2026-10-09 later: the counter is back beside the shelf (owner's old layout); the rarity is a badge on the card, not in the baked face; thumbs re-baked (`?v=badge1`).

Screenshots: `qa/genesis-desktop.png`, `qa/genesis-mobile.png`, `qa/card-front-desktop.png`, `qa/card-back-desktop.png`, `qa/card-mobile.png`, `qa/card-saturn-desktop.png`, `qa/card-saturn-mobile.png`.

Regression coverage: `e2e/card-design.spec.ts`.
