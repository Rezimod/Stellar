# Stellar — Fix & Polish Prompt Series
**Source:** STELLAR_AUDIT_REPORT.md  
**Date:** 2026-04-12  
**Run these prompts in order. Each is self-contained.**

---

## PHASE 1 — Critical Blockers
> Must complete before any demo or submission. 5 tasks, ~60 min.

---

### P1.1 — Save the Stellarr Logo

The Privy auth modal references `/logo.png` which causes a 404 on every page.
Copy the Stellarr logo PNG (the Saturn/planet image with STELLARR text) into the project public folder.

**Task:**
Save the logo image to `/public/logo.png`. The imag1e has already been shown in the conversation — it is a dark space-themed planet with a glowing ring and "STELLARR" text below on a deep navy background.

If the binary cannot be written directly, generate an SVG equivalent and save it as `/public/logo.svg`, then update `src/components/providers/PrivyProvider.tsx` line where `logo: '/logo.png'` appears to point to `/logo.svg` instead.

Verify: after saving, `curl http://localhost:3000/logo.png` (or logo.svg) should return 200, not 404.

---

### P1.2 — Fix Mint API Validation (cloudCover cap + stars cap)

**File:** `src/app/api/mint/route.ts`

Two validation rules are missing that the test suite checks for:

1. The mint route accepts `cloudCover` values over 70. Observations through >70% cloud cover are scientifically invalid. Add a rejection after the existing cloudCover range check.

2. The mint route has no upper limit on `stars`. The `award-stars` route caps at 1000 — the mint route must match.

**Exact fixes needed:**

After the existing `if (typeof cloudCover !== 'number' || cloudCover < 0 || cloudCover > 100)` check, add:
```
if (cloudCover > 70) {
  return NextResponse.json(
    { error: 'Sky conditions too poor to verify observation. Cloud cover must be under 70%.' },
    { status: 400 }
  );
}
```

After the existing `if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0)` check, add:
```
if (stars > 1000) {
  return NextResponse.json(
    { error: 'stars cannot exceed 1000 per observation' },
    { status: 400 }
  );
}
```

After making these changes, also check `src/app/missions/page.tsx` (or wherever the mint is called from the UI) for how it handles a 400 response from `/api/mint`. If there is no user-facing error display for cloudy conditions, add one — something like "The sky is too cloudy tonight. Try again when cloud cover is below 70%." This is a regression risk: Tbilisi currently has 100% cloud cover so the live mint button will now show this error for real users.

Verify: run `python3 stellar-toolkit/tests/test_api.py` and confirm the cloudCover and stars tests now pass.

---

### P1.3 — Add Missing NEXT_PUBLIC_APP_URL Environment Variable

**File:** `.env.local`

The env check reports `NEXT_PUBLIC_APP_URL` as missing (required). This variable is used for constructing absolute URLs in OG image routes, Farcaster frame metadata, and server-side link generation.

Add to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Also add to Vercel environment variables (production value):
```
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
```

After adding, restart the dev server and run `python3 stellar-toolkit/scripts/debug.py env` — it should now show all required variables as OK.

---

### P1.4 — Fix WalletConnect CSP Violation

**File:** `next.config.ts`

Every page console-logs a CSP violation for `explorer-api.walletconnect.com`. The current `connect-src` directive has relay, pulse, and verify WalletConnect domains but is missing the explorer API domain.

In `next.config.ts`, find the `connect-src` line in the CSP array and add `https://explorer-api.walletconnect.com` to it.

Current connect-src ends with:
```
...https://verify.walletconnect.com https://verify.walletconnect.org
```

Change to:
```
...https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com
```

After this change, restart the dev server. Open the browser console on `/` — the WalletConnect CSP error should be gone. The 4 error lines per page that mention `walletconnect.com violates the Content Security Policy` should not appear.

---

### P1.5 — Create /api/darksky/geojson Route

**Target:** `src/app/api/darksky/geojson/route.ts` (new file)

The test suite (both `test_api.py` and `test_mint_flow.py`) expect `GET /api/darksky/geojson` to return a JSON array of dark sky locations. This route does not exist — the data is currently hardcoded inside `src/components/darksky/DarkSkyMap.tsx`.

Create a new API route at `src/app/api/darksky/geojson/route.ts` that:
1. Exports the same location data that `DarkSkyMap.tsx` already has hardcoded
2. Returns it as `NextResponse.json({ locations: [...] })`
3. Sets `Cache-Control: public, max-age=3600` (this data never changes)

Then update `src/components/darksky/DarkSkyMap.tsx` to import the location type from a shared location:
- Extract the `DarkSkyLocation` type and `LOCATIONS` array to `src/lib/darksky-locations.ts`
- Import in both `DarkSkyMap.tsx` and the new API route

This eliminates the duplicate data (audit finding #12) and fixes the 404 test failure simultaneously.

Verify: `curl http://localhost:3000/api/darksky/geojson` returns 200 with a locations array.

---

## PHASE 2 — Console Cleanup & Stability
> Eliminates remaining noise from browser console and dev logs. 4 tasks.

---

### P2.1 — Fix Hydration Mismatch (All Pages)

Every page logs: `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.`

**Investigation task:**
Read through these files and find any place where a value used in JSX during server render differs from the client render:
- `src/components/shared/StarField.tsx` — likely uses `Math.random()` or `Date.now()` at render time
- `src/components/home/HomeSkyPreview.tsx` — may use `new Date()` without hydration guard
- `src/components/shared/Nav.tsx` — check for any `window` or `navigator` access
- Any component that uses `useEffect` with state that affects initial render

The fix pattern is: move any random/date/browser-API calls into `useEffect` so they only run on the client, or use `suppressHydrationWarning` on the specific element if the mismatch is intentional and harmless (e.g., a formatted time display).

Do not suppress globally — find and fix the root cause.

---

### P2.2 — Rename middleware.ts to proxy.ts

**File:** `src/middleware.ts` → `src/proxy.ts`

Next.js 16 deprecates the `middleware` file convention in favor of `proxy`. The dev server logs this warning on every startup.

Rename the file. Verify the dev server starts without the deprecation warning.

Note: the middleware logic (if any) should remain identical — this is purely a file rename.

---

### P2.3 — Audit Image Domains in next.config.ts

**File:** `next.config.ts`

The marketplace page has 14 JS console errors — the highest of any page. After fixes P1.1 and P1.4, some errors will be gone. But product images from `src/lib/dealers.ts` may be loading from domains not in `images.remotePatterns`.

Read `src/lib/dealers.ts` and extract every unique image hostname used across all products. Compare against `next.config.ts` `images.remotePatterns`. Add any missing hostnames.

Also check: if any product has a `null` or undefined `image`, does the `ProductCard` component in `src/app/marketplace/page.tsx` handle it gracefully without throwing? The current code uses `showImg = !!product.image && !imgError` — confirm this covers all edge cases.

---

### P2.4 — Fix Missions Page 11 JS Errors

**File:** `src/app/missions/page.tsx`

The missions page has 11 JS console errors — second highest after marketplace. After P1.1 (logo), P1.4 (CSP), and P2.1 (hydration) are fixed, run the error detector again:

```
python3 stellar-toolkit/tests/detect_errors.py
```

Review what errors remain specifically on `/missions`. Read `src/app/missions/page.tsx` in full and identify:
- Any `undefined` access that could throw
- Missing null checks on API response data
- Any browser API used outside `useEffect`
- Any missing error boundary within the missions flow

Fix without changing the page's visual design or mission logic.

---

## PHASE 3 — UX & Accessibility
> Closes accessibility gaps and improves mobile usability. 4 tasks.

---

### P3.1 — Add H1 to Chat Page + Accessible Page Structure

**File:** `src/app/chat/page.tsx`

The chat page has no H1 or H2 heading — the lowest visual audit score (35/100) and an accessibility failure. Screen readers land on the page with no landmark.

Read `src/app/chat/page.tsx` in full. Add a page heading that fits the existing cosmic design:
- Use `<h1 className="sr-only">ASTRA — AI Space Companion</h1>` if there's no natural place for a visible heading
- OR integrate a visible title into the existing header area of the chat UI

Also check: is there an accessible `aria-label` on the chat input and send button? Add if missing.

Do not change the chat bubble styles, streaming behavior, or input layout.

---

### P3.2 — Fix Button Tap Targets Site-Wide

**Audit finding:** 26/42 buttons on home, 30/30 on marketplace, 20/21 on chat are below 44px WCAG minimum.

The scope is limited to primary action buttons (the ones users actually tap to trigger flows):
- "Start Observing" / main CTA on home
- "Send" button in chat
- "Buy Now" / product CTA buttons in marketplace  
- Nav icons in `BottomNav`

For each of these, add `min-h-[44px]` to ensure the touch target meets minimum size. Do not change visual size if it would break the design — use padding to expand hit area without affecting layout.

Read each component before editing. Make minimal changes.

---

### P3.3 — Handle "Sky Too Cloudy" Error in Missions Flow

**This is a regression introduced by P1.2.**

After fixing mint validation to reject cloudCover > 70, the missions observation flow will now receive a 400 error when Tbilisi (or any location) has high cloud cover. Currently Tbilisi has 100% cloud cover — so this will hit immediately for Georgian users.

Read the component that calls `POST /api/mint` (likely in `src/app/missions/page.tsx` or a child component). Find the error handling block. Ensure that:

1. When the API returns `{ error: 'Sky conditions too poor...' }` with status 400, the UI shows a specific, friendly message — not a generic "Minting failed" or silent failure.
2. The message should match the app's tone: something like "The sky is too cloudy to verify tonight. Check back when cloud cover drops below 70%."
3. The "Try Again" or retry button should ideally link back to the sky forecast so users can see when conditions improve.

Do not change the minting logic itself — only the error handling UI for this specific error code.

---

### P3.4 — Deduplicate Dark Sky Location Data

**Files:** `src/app/darksky/page.tsx`, `src/components/darksky/DarkSkyMap.tsx`

Both files define the same LOCATIONS array. They already diverged (the page version has fewer fields than the component version).

Create `src/lib/darksky-locations.ts` that exports:
- The `DarkSkyLocation` type
- The `LOCATIONS` array with all fields from `DarkSkyMap.tsx` (the more complete version)

Update both `src/app/darksky/page.tsx` and `src/components/darksky/DarkSkyMap.tsx` to import from the new file. Update the new `/api/darksky/geojson` route (created in P1.5) to import from here too.

This is a data consolidation — do not change any visual behavior.

---

## PHASE 4 — Visual Upgrades (Per Page)
> Improves visual audit scores toward 70+. Work page by page, worst first.

---

### P4.1 — Chat Page Visual Overhaul (35/100 → target 70+)

**File:** `src/app/chat/page.tsx` and chat components in `src/components/chat/`

The chat page scored lowest (35/100). Key audit findings:
- Chat bubbles look generic — need instrument/terminal aesthetic consistent with the cosmic theme
- Empty state should show tonight's sky summary (fetch from sky oracle)
- No streaming cursor while ASTRA is typing
- No suggested prompt chips

Read all files in `src/components/chat/` before making any changes.

**Improvements to implement:**
1. **Empty state:** When no messages exist, show a compact sky summary card (fetch `/api/sky/verify` for current conditions) with text like "Tonight: [condition]. Ask me anything about the sky."
2. **Suggested prompts:** Below the empty state, show 3 tappable prompt chips: "What can I observe tonight?", "Explain the Orion Nebula", "Best telescope for beginners?" — clicking one fills the input.
3. **Streaming cursor:** While ASTRA is streaming a response, show a pulsing `▋` cursor at the end of the partial message.
4. **ASTRA message style:** Add a subtle left border or glow to AI message bubbles to distinguish from user messages.

Preserve all existing streaming logic, the send button, and the keyboard behavior. Mobile layout must remain intact.

---

### P4.2 — Missions Page Visual + Completion State (43/100 → target 70+)

**File:** `src/app/missions/page.tsx`

Audit findings for missions:
- No Solana Explorer link visible after minting
- No on-chain proof visible in the success screen
- All buttons below 44px tap target

Read `src/app/missions/page.tsx` in full.

**Improvements:**
1. **Post-mint success screen:** After a successful mint, show the Solana Explorer link prominently. Format: `View on Solana Explorer →` as a teal link with `ExternalLink` icon (lucide-react). Use the `explorerUrl` returned by the API.
2. **On-chain proof badge:** In the success state, add a small badge: `Verified on Solana Devnet` with the Solana logo color (#9945FF) background.
3. **Mission card button:** Increase the "Start Mission" button to `min-h-[44px]`.

Do not add animations or particle effects — keep it minimal and production-stable.

---

### P4.3 — NFT Gallery — Empty State + Explorer Links (43/100 → target 70+)

**File:** `src/app/nfts/page.tsx` and `src/components/nfts/`

Audit findings:
- Generic/weak empty state when user has no NFTs
- No Solana Explorer links on existing NFT cards
- All buttons below 44px

Read all nft-related files.

**Improvements:**
1. **Empty state:** When the user has no NFTs, show a compelling call-to-action — a blurred/dimmed demo NFT card with "Complete your first observation to earn a Discovery Attestation" overlay and a button linking to `/missions`.
2. **Explorer links:** On each NFT card that has a `mintTx` or transaction hash, add a teal "View on Solana →" link with `ExternalLink` icon pointing to `https://explorer.solana.com/tx/{txId}?cluster=devnet`.
3. **Tap targets:** Increase any action buttons on NFT cards to `min-h-[44px]`.

---

### P4.4 — Profile Page — Rank Badge + Stars Display (43/100 → target 70+)

**File:** `src/app/profile/page.tsx`

Audit findings:
- No rank badge or progression display
- Stars balance not displayed prominently
- No Solana Explorer link for wallet

Read `src/app/profile/page.tsx` in full.

**Improvements:**
1. **Stars display:** Show the Stars token balance as `✦ {N} Stars` using the display font (Plus Jakarta Sans), in amber/gold color (`#F59E0B`). Fetch from `/api/stars-balance` if not already shown.
2. **Wallet Explorer link:** Next to the wallet address, add a small `ExternalLink` icon linking to `https://explorer.solana.com/address/{wallet}?cluster=devnet`.
3. **Rank label:** Based on Stars balance, show a rank label: 0–99 = "Cadet", 100–499 = "Observer", 500–999 = "Navigator", 1000+ = "Astronomer". Display it as a badge next to the username.

Keep all existing profile sections intact. Minimal additions only.

---

### P4.5 — Home Page — Tonight's Best Target + Sky Verdict (48/100 → target 72+)

**File:** `src/app/page.tsx`, `src/components/home/HomeSkyPreview.tsx`

Audit findings:
- Tonight's best target buried below forecast cards
- Go/No-Go verdict not visually dominant
- Missing animated star field (StarField component exists but may not be prominent enough)

Read both files.

**Improvements:**
1. **Best target prominence:** Move or duplicate the "Tonight's best target" information to the very top of the page content, above the 7-day forecast grid. If it's already there, make its font 1.5× larger.
2. **Sky verdict size:** The Go / Maybe / Skip badge for tonight should be the largest text element on the page after the app title. Increase its font size and add a subtle glow shadow matching the verdict color (green for Go, amber for Maybe, red for Skip).
3. **Hero section:** Add a short tagline below the app name on the hero: "Observe. Verify. Earn Stars." — one line, smaller text, existing color palette.

Do not rearrange the entire page layout. Only the top section and verdict prominence.

---

### P4.6 — Marketplace — Beginner Badge + Dual Pricing (48/100 → target 70+)

**File:** `src/app/marketplace/page.tsx`, `src/lib/dealers.ts`

Audit findings:
- No beginner-friendly badge on entry-level products
- GEL and SOL prices not shown together clearly on every card

Read both files.

**Improvements:**
1. **Beginner badge:** In `src/lib/dealers.ts`, add `beginner: true` to products priced under 500 GEL (or the entry-level telescopes). In the `ProductCard` component, if `product.beginner` is true, show a small "Great for Beginners" badge in green.
2. **Dual pricing:** Every product card should show both GEL and SOL price. If SOL price is not yet fetched (loading state), show a `—` placeholder. The GEL price is primary (larger), SOL is secondary (smaller, dimmer). Already in the component? Verify it renders correctly for all products.
3. **Image fallback:** Confirm the category emoji fallback renders when product image fails — this affects all 30 product cards.

---

## PHASE 5 — Final Verification & Submission Prep
> Run after all phases complete. Confirm 15/15 tests and demo-readiness.

---

### P5.1 — Full Test Suite Run + Fix Remaining Failures

Run all tests and confirm everything passes:

```bash
source .venv/bin/activate

# API tests (should be 15/15 after P1.2 and P1.5)
python3 stellar-toolkit/tests/test_api.py

# Full mint flow (should be 5/5 after P1.5)
python3 stellar-toolkit/tests/test_mint_flow.py

# Error detector (should show 0 critical errors after P1.1, P1.4, P2.1)
python3 stellar-toolkit/tests/detect_errors.py

# Visual audit (target overall score 65+)
python3 stellar-toolkit/visual-audit/audit.py --save

# Environment check (should show all OK)
python3 stellar-toolkit/scripts/debug.py env
```

For any remaining failures, read the error output carefully and fix the root cause before proceeding. Do not mark this phase done until `test_api.py` shows 15/15.

---

### P5.2 — Leaderboard + Farcaster Frame Audit

**Files:** `src/app/leaderboard/page.tsx`, `src/app/layout.tsx` (frame metadata)

The leaderboard page hasn't been individually audited. Read it and verify:
1. It renders without errors
2. Empty state (no entries yet) is handled gracefully
3. If a Supabase query fails (no DB configured), does it show a fallback or crash?

For Farcaster frames in `src/app/layout.tsx`:
- Verify `fc:frame:image` points to a valid OG image endpoint (`/api/og/sky`)
- Check if `/api/og/sky` route exists — if not, the frame image will 404
- If the route doesn't exist, either create a minimal one or update the frame to point to a static image in `/public/`

---

### P5.3 — Colosseum Submission Checklist

Verify each item is true before submitting to arena.colosseum.org:

**Technical:**
- [ ] `npx tsc --noEmit` exits 0
- [ ] `python3 stellar-toolkit/tests/test_api.py` shows 15/15
- [ ] `python3 stellar-toolkit/tests/test_mint_flow.py` shows 5/5
- [ ] No 404s in browser console on any page
- [ ] Devnet wallet has sufficient SOL for demos (check with `python3 stellar-toolkit/scripts/debug.py balance`)
- [ ] `NEXT_PUBLIC_APP_URL` is set in Vercel environment
- [ ] Vercel deployment is live at stellarrclub.vercel.app

**Demo readiness:**
- [ ] Home page loads in under 3 seconds
- [ ] Sky oracle returns real data for current location
- [ ] Chat responds within 5 seconds for a simple question
- [ ] Marketplace shows products with images (no broken placeholders)
- [ ] Profile page shows wallet address after login

**Colosseum requirements:**
- [ ] GitHub has at least 1 commit per day since April 6
- [ ] Project description updated on arena.colosseum.org
- [ ] Demo video or screenshots uploaded if required
- [ ] Solana devnet transactions are visible on Explorer (proof of on-chain activity)

---

## Quick Reference — Test Commands

```bash
# Activate venv (required every session)
source /Users/nika/Desktop/Stellar-rezimod/.venv/bin/activate

# Run all tests at once
python3 stellar-toolkit/scripts/run_all.py

# Run all tests, skip screenshots (faster)
python3 stellar-toolkit/scripts/run_all.py --skip-screenshots

# Individual tests
python3 stellar-toolkit/tests/test_api.py
python3 stellar-toolkit/tests/test_mint_flow.py
python3 stellar-toolkit/tests/detect_errors.py
python3 stellar-toolkit/visual-audit/audit.py --save

# Debug helpers
python3 stellar-toolkit/scripts/debug.py env
python3 stellar-toolkit/scripts/debug.py sky
python3 stellar-toolkit/scripts/debug.py mint

# TypeScript check
npx tsc --noEmit
```
