# Stellar — Full Project Audit Report
**Date:** 2026-04-12  
**Branch:** main  
**Commit:** b45195c  
**Environment:** localhost:3000 (Next.js 16.1.6, Turbopack)  
**Tools Used:** stellar-toolkit (API tests, mint flow, visual audit, error detector, screenshots), TypeScript compiler, manual code review

---

## Executive Summary

The core Solana infrastructure is working: mint flow completes end-to-end on devnet (compressed NFT minting, Stars SPL token award, oracle verification all pass). The app is structurally sound and demo-ready for the on-chain layer. However, the frontend has critical gaps that will hurt the Colosseum judging experience: a missing `logo.png` causes a 404 on every single page, the visual audit scores every page D-grade (44/100 average), and the mint API has two missing validation rules that the test suite catches. These need to be fixed before submission.

---

## Test Results

### API Tests — 12/15 Passed

| Result | Status | Test |
|--------|--------|------|
| PASS | 200 | Sky oracle — valid Tbilisi coords |
| PASS | 400 | Sky oracle — missing lat |
| PASS | 400 | Sky oracle — invalid coords |
| PASS | 400 | Mint — no body |
| PASS | 200 | Mint — valid payload |
| **FAIL** | 200 | Mint — cloud too high (>70) — expected 400 |
| PASS | 400 | Mint — empty target |
| PASS | 400 | Mint — invalid lat |
| PASS | 400 | Mint — negative stars |
| **FAIL** | 200 | Mint — stars too high — expected 400 |
| PASS | 400 | Award stars — no body |
| PASS | 400 | Award stars — invalid address |
| PASS | 400 | Award stars — amount too high |
| **FAIL** | 404 | Dark sky data — GeoJSON route doesn't exist |
| PASS | 200 | Metadata observation — valid params |

### Mint Flow — 4/5 Steps Passed

| Step | Result |
|------|--------|
| Sky oracle verification | OK — hash generated |
| Mint compressed NFT | OK — devnet tx confirmed |
| Award Stars SPL token | OK — token transferred |
| NFT metadata endpoint | OK — 6 attribute fields |
| Dark sky GeoJSON | FAIL — 404 (route doesn't exist) |

### Environment Variables

| Variable | Status |
|----------|--------|
| NEXT_PUBLIC_PRIVY_APP_ID | OK |
| ANTHROPIC_API_KEY | OK |
| FEE_PAYER_PRIVATE_KEY | OK |
| MERKLE_TREE_ADDRESS | OK |
| COLLECTION_MINT_ADDRESS | OK |
| STARS_TOKEN_MINT | OK |
| NEXT_PUBLIC_HELIUS_RPC_URL | OK |
| SOLANA_RPC_URL | OK |
| **NEXT_PUBLIC_APP_URL** | **MISSING** |
| NEXT_PUBLIC_SUPABASE_URL | Not set (optional) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Not set (optional) |

### Visual Audit — 44/100 Overall (All Pages D-Grade)

| Page | Score | Grade |
|------|-------|-------|
| / (Home) | 48/100 | D |
| /marketplace | 48/100 | D |
| /darksky | 48/100 | D |
| /missions | 43/100 | D |
| /nfts | 43/100 | D |
| /profile | 43/100 | D |
| /chat | 35/100 | D |

### Screenshots

16 screenshots saved to `/tmp/stellar_screenshots/` (8 pages × desktop + mobile).

---

## Problems Found

### CRITICAL

**1. Missing `/public/logo.png`**
- Severity: Critical
- Pages affected: All (/, /missions, /chat, /nfts, /profile, /marketplace, /darksky, /leaderboard)
- Problem: `PrivyProvider` sets `logo: '/logo.png'` but no such file exists in `/public/`. Causes a 404 request on every page load, visible in the browser console.
- Fix: Add a `logo.png` to `/public/`. Can be a simple 200×200px Stellar logo PNG. This is a one-liner to fix but impacts every page.

**2. Mint API accepts cloudCover > 70 — no business rule enforcement**
- Severity: Critical
- File: `src/app/api/mint/route.ts:27`
- Problem: The validation only checks `cloudCover < 0 || cloudCover > 100`. There is no rejection when `cloudCover > 70` (the threshold above which a real observation is scientifically invalid — you can't observe through 80% cloud cover). A user (or attacker) can mint a Discovery Attestation NFT with cloudCover=100 right now.
- Verified: `curl POST /api/mint cloudCover=80` returns 200 + a real devnet transaction.
- Fix: Add `if (cloudCover > 70) return NextResponse.json({ error: 'Sky conditions too poor to verify observation. Cloud cover must be under 70%.' }, { status: 400 });` after the existing cloudCover range check.

**3. Mint API has no upper limit on `stars`**
- Severity: High
- File: `src/app/api/mint/route.ts:35`
- Problem: Only validates `stars >= 0` and `Number.isInteger(stars)`. No maximum. The award-stars route correctly caps at 1000, but the mint route itself would accept `stars: 99999` and pass it downstream (though the SPL award route would reject it separately). The test suite expects a 400 for stars too high.
- Fix: Add `if (stars > 1000) return NextResponse.json({ error: 'stars cannot exceed 1000 per observation' }, { status: 400 });`

**4. No `/api/darksky/geojson` route**
- Severity: High
- Problem: The test suite and mint flow test both expect `GET /api/darksky/geojson` to return location data. This route doesn't exist — the data is hardcoded in `src/components/darksky/DarkSkyMap.tsx` as a static array. The 404 causes test failures and would break any future dynamic dark sky data fetching.
- Fix (minimal): Either create the route that returns the hardcoded LOCATIONS array as JSON, or accept that this endpoint doesn't exist and update the test suite. The in-component static data is fine for hackathon, but the missing route is a test smell.

**5. WalletConnect CSP violation on all pages**
- Severity: High
- Problem: Every page logs `Connecting to 'https://explorer-api.walletconnect.com/v3/wallets?projectId=34357d3c125c2bcf2ce2bc3309d98715' violates the Content Security Policy`. Privy is attempting to fetch WalletConnect wallet metadata but CSP blocks it. This creates console noise that looks broken to judges reviewing dev tools.
- Fix: Either add `explorer-api.walletconnect.com` to your CSP `connect-src` list in `next.config.ts`, or configure Privy to disable WalletConnect wallet listing if you're not using it.

**6. Hydration mismatch on all pages**
- Severity: Medium
- Problem: Every page shows `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties`. This usually indicates a Date, random value, or browser-only API being used during server render. Not fatal but causes React to re-render the entire tree on hydration.
- File: Likely in a component that uses `new Date()` or `Math.random()` or `window` at render time without `useEffect`.

**7. Missing `NEXT_PUBLIC_APP_URL` env var**
- Severity: Medium
- Problem: Required variable is absent. This will break any feature that constructs absolute URLs server-side (OG image generation, metadata endpoints, Farcaster frames).
- Fix: Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local` and `NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app` to Vercel env.

---

### MEDIUM

**8. Chat page has no H1 or H2 heading**
- Severity: Medium
- File: `src/app/chat/page.tsx`
- Problem: The visual audit finds no heading elements. This fails basic accessibility and hurts SEO. Screen readers have no page landmark.
- Fix: Add a visually styled `<h1>` (can be `sr-only` or styled as part of the UI header).

**9. Button tap targets below 44px across all pages**
- Severity: Medium
- Problem: 26/42 buttons on home, 30/30 on marketplace, 20/21 on chat are below the 44px minimum touch target WCAG 2.1 recommends. On mobile this causes mis-taps.
- Fix: Add `min-h-[44px] min-w-[44px]` to button classes, or add `touch-action: manipulation` + padding to increase hit area without changing visual size.

**10. Marketplace page — 14 JS console errors**
- Severity: Medium
- File: `src/app/marketplace/page.tsx`
- Problem: Highest error count of any page (14 errors). Likely a combination of logo.png 404, WalletConnect CSP, hydration, and possibly a product image fetch error. The multiple Image `src` props from `src/lib/dealers.ts` may be hitting domains not whitelisted in `next.config.ts`.
- Fix: After fixing logo.png and CSP, audit remaining errors. Check `next.config.ts` `images.remotePatterns` covers all dealer image domains.

---

### LOW

**11. Middleware deprecation warning**
- Severity: Low
- Problem: Server logs `The "middleware" file convention is deprecated. Please use "proxy" instead.` on every startup.
- File: Likely `src/middleware.ts`
- Fix: Rename to `src/proxy.ts` per Next.js 16 convention.

**12. Duplicate location data in darksky page and component**
- Severity: Low
- File: `src/app/darksky/page.tsx` and `src/components/darksky/DarkSkyMap.tsx`
- Problem: The same LOCATIONS array is defined in both files. They'll drift.
- Fix: Export from one source (`src/lib/darksky-locations.ts`) and import in both.

---

## What Is Good

- **On-chain core is solid**: Mint flow (sky oracle → compressed NFT → Stars SPL award) works end-to-end on devnet. txIds confirmed on Solana Explorer.
- **TypeScript compiles clean**: `npx tsc --noEmit` exits 0 with no errors.
- **Font loading is correct**: Plus Jakarta Sans (display), DM Sans (body), JetBrains Mono are loaded via `next/font/google` with proper CSS variables. The visual audit tool incorrectly flagged these — actual font loading is fine.
- **Validation at API boundaries**: Most routes have solid input validation. `award-stars` correctly caps at 1000. `sky/verify` correctly rejects missing params.
- **Mobile layout**: All 8 pages screenshot without visible layout breaks at 390×844 (iPhone 14 viewport). BottomNav renders correctly.
- **Error boundary**: Global `ErrorBoundary` wraps the entire app — crashes won't white-screen the whole UI.
- **Rate limiting on mint**: The 1-per-hour-per-wallet-per-target check is implemented with DB fallback (non-fatal if DB is down).
- **CSP and authorization**: Mint route checks `INTERNAL_API_SECRET` header when set. Good defensive pattern.
- **PWA manifest**: `/manifest.json` is present and linked.

---

## Regression Risks

- Fixing the cloudCover validation in `/api/mint` may break the end-to-end mint flow if Tbilisi currently has high cloud cover (100% cloud today per sky oracle). The missions flow will need to handle the new 400 gracefully and show a user-friendly "sky too cloudy" message.
- Adding the WalletConnect domain to CSP: verify the CSP string doesn't accidentally loosen `script-src` or `default-src`.
- Any changes to `src/lib/dealers.ts` product shapes must be reflected in `src/app/marketplace/page.tsx` type usage and `getProductsByRegion` consumers.

---

## Priority Fix List

**Fix before Colosseum submission:**

1. Add `/public/logo.png` — removes 404 from every page
2. Add cloudCover > 70 rejection in `/api/mint` — fixes 1 test + closes fraud vector
3. Add stars > 1000 rejection in `/api/mint` — fixes 1 test, matches award-stars behavior
4. Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local` and to Vercel env — fixes Farcaster frames + OG images
5. Add WalletConnect domain to CSP or disable WalletConnect in Privy config — removes console noise

**Good to have before submission:**

6. Add H1 to `/chat` page
7. Create `/api/darksky/geojson` stub returning hardcoded locations
8. Rename `src/middleware.ts` → `src/proxy.ts`
9. Increase button min-height to 44px on critical CTAs (Start Observing, Send in chat, Buy Now)

---

## Final Verdict

**Not ready** — 3 API test failures, 1 missing env var, and the logo.png 404 on every page are blockers. The on-chain infrastructure is genuinely impressive and the core demo flow works. Fix the 5 items above (estimated 45–60 minutes of work) and this is competitive.
