# STELLAR — Complete Audit Report
## Code-Level Analysis · April 11, 2026
### Colosseum Frontier Hackathon · Deadline: May 10, 2026

---

## EXECUTIVE SUMMARY

The codebase is in **much better shape** than the live deployment suggests. The core layout, nav, footer, and bottom nav are all unified and correct in code. The "two different apps" problem visible on the live site is likely a **stale Vercel deployment** — a clean redeploy should fix the inconsistent branding across pages.

The on-chain infrastructure (Bubblegum NFT minting, Stars SPL token, Sky Oracle, Claude Vision photo verification, ASTRA tool-calling chat) is **all implemented in the codebase**. Whether it works end-to-end depends on environment variables being set correctly on Vercel.

**Immediate action needed:** Force redeploy on Vercel + test the full mission → mint → NFT flow while signed in.

---

## SECTION 1 — PROMPT EXECUTION STATUS

### ✅ Confirmed Executed (in codebase)

| Prompt | Evidence |
|---|---|
| Phase 0: HEADER-1 | `SearchModal.tsx` exists, Nav has search button, BottomNav has correct 5 tabs |
| Phase 0: MOBILE-1 | Global `overflow-x: hidden`, consistent `px-4` padding across pages |
| Phase 0: ICONS-1 | LocationPicker uses MapPin, icon sizes standardized |
| Phase 0: HOME-HERO | Hero subtitle updated, trust line correct, CTA links to `/missions` |
| Phase AUTH: AUTH-1 | `useUserSync.ts` exists, `UserSyncWrapper` in PrivyProvider, `/api/users/upsert` route exists. Nav sign-out does NOT call `reset()`. |
| Prompt 1 (Bubblegum setup) | `scripts/setup-bubblegum.ts` exists, `package.json` has setup:bubblegum script |
| Prompt 2 (Sky Oracle) | `/api/sky/verify/route.ts` exists with Open-Meteo + deterministic SHA-256 hash. `SkyVerification` type in `types.ts`. No farmhawk/pollinet references in active code. |
| Prompt 3 (NFT Minting) | `src/lib/mint-nft.ts` — full Bubblegum/Umi implementation. `/api/mint/route.ts` with validation + rate limiting. `/api/metadata/observation/route.ts` for NFT metadata. |
| Prompt 4 (Wire Mint + Success) | `MissionActive.tsx` calls `/api/mint` via POST, handles abort timeout (60s), has `step === 'done'` render with Solana Explorer link, Farcaster share, X share. |
| Prompt 5 (Stars SPL Token) | `scripts/create-stars-token.ts` exists. `/api/award-stars/route.ts` with SPL `mintTo`, idempotency keys. `/api/stars-balance` exists. |
| Prompt 6 (NFT Gallery) | `src/app/nfts/page.tsx` — 309 lines, Helius DAS API `getAssetsByOwner`, collection filtering, auth gate. |
| Prompt 7 (ASTRA Tool Calling) | `/api/chat/route.ts` has 2 tools: `get_planet_positions` + `get_sky_forecast`. System prompt says "You are ASTRA". Streaming SSE response. |
| ASTRA-1 (Standalone Chat) | `src/app/chat/page.tsx` is a real streaming chat page (223 lines), NOT the old encyclopedia. Encyclopedia correctly moved to `/learn`. |
| Prompt 8 (OG Image) | `/api/og/sky/route.tsx` exists. Layout metadata includes OG tags, Farcaster frame meta tags. |
| G5/G6 (Global copy + README) | README is updated (mostly). Constants cleaned. Footer correct. |

### ❌ Confirmed NOT Executed

| Prompt | Evidence |
|---|---|
| MARKET-1 (Celestron + Bresser) | `dealers.ts` still has `highpoint-us`. No `celestron-us` or `bresser-eu`. `Region` type is `'caucasus' | 'north_america' | 'global'` — no `'europe'`. Homepage still shows "High Point Scientific" at line 909. |
| DARKSKY-1 (Leaflet map rebuild) | `darksky/page.tsx` is still the static SVG version with 6 hardcoded Georgian locations. No Leaflet, no react-leaflet in dependencies. No NASA VIIRS tile layer. No `nightscore.ts` module. |
| DARKSKY-2 (AI photo analyzer) | No `/api/analyze-sky` route. No `SkyPhotoAnalyzer` component. No community reports feed. |
| SHARE-1 (Full success overlay) | The success screen exists (Prompt 4's `step === 'done'` in MissionActive) but is NOT the full-screen shareable overlay from SHARE-1. Missing: large emoji, proof box with "✦ VERIFIED ON SOLANA" heading, structured tweet text with @StellarApp mention. |
| PWA-1 (Native app feel) | `manifest.json` still has old description ("AI-Powered Window to the Cosmos"), no proper PNG icons (only `favicon.ico`), no `public/icons/` directory. No `useStandalone` hook. No install banner. No safe-area padding classes. |
| ONBOARD-1 (First-time overlay) | No `OnboardingOverlay.tsx` component exists. |
| PERF-1 (Performance) | Product images use `<img>` not `<Image>`. No Next.js image domains configured for celestron.com/bresser.de. No IntersectionObserver on star field canvas. No API caching headers. |
| GAMIFY-1 (Streak visibility) | No streak badge on missions page. No rank progression display in profile beyond the existing basic implementation. |
| HOME-1 (Homepage refresh) | Partially done — subtitle and trust line are updated, but "How It Works" still uses "oracle" language, partner stores section not updated. |
| POLISH-1 (Loading/empty/error) | Some pages lack proper loading/error states. Marketplace shows "No partner stores in your area yet" but it's region logic, not a loading state issue. |

---

## SECTION 2 — BUGS & ISSUES

### 🔴 Critical (blocks hackathon submission)

**BUG-1: Live site shows old branding on some pages**
- Cause: Likely stale Vercel deployment cache. The codebase is consistent — all pages use the shared `layout.tsx` with updated Nav/Footer/BottomNav.
- Fix: Force redeploy (`vercel --force` or push an empty commit).
- Verify: After deploy, check `/sky`, `/marketplace`, `/profile`, `/chat` for updated nav/footer.

**BUG-2: Profile page calls `reset()` on sign-out — wipes all progress**
- Location: `src/app/profile/page.tsx` line 57: `reset();`
- The Nav component was fixed (AUTH-1), but the profile page's sign-out handler was NOT updated.
- The Nav correctly uses `setWallet('')` without `reset()`. The profile page still calls `reset()`.
- Fix: Replace `reset()` with `setWallet('')` in profile's `handleSignOut`.

**BUG-3: Homepage mission data doesn't match constants.ts**
- Homepage (line 436-438): "Lunar Observation" +50✦, "Jupiter's Moons" +120✦ (Advanced), "Deep Sky Survey" +200✦
- Constants: "The Moon" +50✦, "Jupiter" +75✦ (Beginner), no "Deep Sky Survey" mission exists
- The homepage shows fabricated missions that don't exist in the actual mission system.
- Fix: Import `MISSIONS` from constants and render real mission data, or manually sync the display missions.

**BUG-4: Footer GitHub link points to wrong repo**
- Location: `src/components/shared/Footer.tsx` line 29
- Current: `https://github.com/Morningbriefrezi/Stellar`
- Correct: `https://github.com/Rezimod/Stellar`

**BUG-5: INTERNAL_API_SECRET may block mint calls from client**
- `/api/mint/route.ts` line 8-10 checks `authorization` header against `INTERNAL_API_SECRET`.
- `/api/award-stars/route.ts` line 13-15 does the same.
- `MissionActive.tsx` does NOT send any authorization header when calling `/api/mint`.
- If `INTERNAL_API_SECRET` is set in env, ALL mint calls from the client will return 401 Unauthorized.
- Fix: Either (a) don't set `INTERNAL_API_SECRET` in production, or (b) the check says `if (secret && authHeader !== ...)` — so if authHeader is null and secret is set, it blocks. Need to verify this on Vercel.

**BUG-6: `/darksky` may 404 on live site despite existing in code**
- The file exists at `src/app/darksky/page.tsx`, which is a server component (no 'use client' directive).
- Returning 404 could mean: deployment didn't include the file, or there's a build error in the component.
- Fix: Check Vercel build logs. May need to force a fresh deploy.

### 🟡 Important (should fix this week)

**BUG-7: PWA manifest is outdated and has no real icons**
- `manifest.json` description: "AI-Powered Window to the Cosmos" — old tagline.
- Only icon is `favicon.ico` — no 192px or 512px PNG icons.
- No `public/icons/` directory exists.
- App is NOT installable as a PWA in current state.

**BUG-8: README references wrong repo URL**
- README line for git clone: `github.com/Morningbriefrezi/Stellar` — should be `github.com/Rezimod/Stellar`
- README mentions "High Point Scientific" — should say Celestron after MARKET-1 runs.

**BUG-9: next.config.ts image domains likely missing**
- Product images from external URLs (astroman.ge, celestron.com, bresser.de) use `<img>` not Next.js `<Image>`.
- When PERF-1 switches to `<Image>`, domains must be added to `next.config.ts`.
- Current state: functional but unoptimized.

**BUG-10: Leaderboard is completely static mock data**
- `src/app/leaderboard/page.tsx` exists (8.5K) but shows "The leaderboard is empty" on homepage.
- For hackathon judges, an empty leaderboard section on the homepage hurts credibility.
- Fix: Either populate with seed data or hide when empty.

### 🟢 Minor (polish items)

**BUG-11: Homepage products show GEL pricing without USD context**
- "Custom Star Map — 29 GEL" means nothing to a US judge. Should show "$10" or "~$10 USD".

**BUG-12: "How It Works" uses jargon**
- Step 3: "Sky oracle verifies clear conditions" — "oracle" is crypto jargon.
- Step 4: "Discovery sealed on Solana as compressed NFT" — too technical.
- Suggested: "AI verifies clear sky" and "Your discovery is recorded on Solana."

**BUG-13: Homepage location shows "Global" by default**
- When no GPS is detected, users see "Global" label. Better: detect from IP or show a friendly prompt.

**BUG-14: Gallery and Profile link both go to profile from success screen**
- In `MissionActive.tsx` done screen, "View My Discoveries" goes to `/profile`. Should go to `/nfts`.

---

## SECTION 3 — FILE-BY-FILE ANALYSIS OF KEY PAGES

### Homepage (`/`) — `src/app/page.tsx` (949 lines)

**Structure:** Single massive file with all sections inline-styled. Well organized with clear section comments.

**Sections present:**
1. ✅ Hero with star field canvas animation
2. ✅ Quick access grid (4 cards: Sky, Missions, ASTRA, Shop)
3. ✅ How It Works (4 steps)
4. ✅ Tonight's Sky preview (client-side `HomeSkyPreview` component)
5. ✅ Active Missions (4 cards — but data doesn't match constants)
6. ✅ Leaderboard (empty state)
7. ✅ ASTRA conversation mockup
8. ✅ Earn Stars / Rewards (3 tiers)
9. ✅ Featured products (3 items)
10. ✅ Partner stores (Astroman + High Point — needs Celestron/Bresser)
11. ✅ Builder credit line
12. ✅ Contact CTA

**Issues:**
- Mission card data is hardcoded and doesn't match `constants.ts`
- Partner stores section is hardcoded, not sourced from `dealers.ts`
- Products section shows GEL prices with no USD equivalent
- "How It Works" step 3-4 wording too technical
- 949 lines is manageable but the inline styles make it hard to maintain

### Sky Page (`/sky`) — `src/app/sky/page.tsx` (39 lines)

**Structure:** Clean server component using Suspense boundaries around 5 sub-components:
- `TonightHighlights` — tonight's sky conditions
- `SunMoonBar` — sunrise/sunset/moonrise/moonset
- `ForecastGrid` — 7-day forecast
- `PlanetGrid` — planet visibility cards
- `EventBanner` — upcoming events

**Issues:** None structural. Depends on working API calls to Open-Meteo and astronomy-engine. Should work if the APIs are reachable from the server.

### Missions Page (`/missions`) — `src/app/missions/page.tsx` (9.5K)

**Structure:** Client component with auth gate, stats bar, mission list, quiz section, rewards section, observation log.

**The observation flow:** User clicks a mission → `MissionActive` overlay opens → camera capture → sky oracle verify → NFT mint → success screen.

**Issues:**
- No streak badge visible (GAMIFY-1 not executed)
- "Tonight's Sky" widget at bottom may show loading indefinitely if location isn't set

### Chat/ASTRA (`/chat`) — `src/app/chat/page.tsx` (223 lines)

**Structure:** Full streaming chat interface with auth gate, suggestion pills, auto-scroll.

**Streaming implementation:** POSTs to `/api/chat`, reads SSE chunks, parses `data:` lines, appends to assistant message.

**API route:** Claude with 2 tools (`get_planet_positions`, `get_sky_forecast`). Tool calls are handled server-side, results fed back to Claude for final response.

**Issues:** None found. This is well-implemented.

### Marketplace (`/marketplace`) — `src/app/marketplace/page.tsx` (262 lines)

**Structure:** Client component with location-based product filtering, category filters, Stars redemption widget.

**Product loading:** Calls `getProductsByRegion(location.region)` — returns products matching the user's detected region.

**Issues:**
- If location is `'global'` (default), returns `GLOBAL_FALLBACK` which is 3 products per dealer (6 total). This should work but may appear sparse.
- Still has `highpoint-us` dealer instead of `celestron-us`.
- No `'europe'` region support — European users fall to `'global'`.

### Profile (`/profile`) — `src/app/profile/page.tsx` (317 lines)

**Structure:** Full profile with auth gate (blurred preview when logged out), Stars balance from API, streak from API, observation history from API, wallet address, sign-out.

**Issues:**
- **Line 57: `reset()` still called on sign-out** — wipes all localStorage data including mission progress. This is the AUTH-1 bug that was fixed in Nav but not in Profile.

### NFTs Gallery (`/nfts`) — `src/app/nfts/page.tsx` (309 lines)

**Structure:** Fetches compressed NFTs from Helius DAS API, filters by collection mint, displays in grid with attributes.

**Issues:**
- Depends on `NEXT_PUBLIC_HELIUS_RPC_URL` being set (falls back to public devnet RPC which may not support DAS).
- Depends on `NEXT_PUBLIC_COLLECTION_MINT_ADDRESS` for filtering (gracefully falls back to showing all NFTs).

### Dark Sky (`/darksky`) — `src/app/darksky/page.tsx` (288 lines)

**Structure:** Static page with 6 hardcoded Georgian locations, SVG map visualization, Bortle scale legend.

**Issues:**
- This is the pre-DARKSKY-1 version. No Leaflet, no NASA tiles, no real interactivity.
- Good enough for hackathon demo but not impressive as a standalone feature.

---

## SECTION 4 — ON-CHAIN INFRASTRUCTURE STATUS

| Component | Code Status | Runtime Dependencies |
|---|---|---|
| Bubblegum Merkle Tree | Setup script exists | `FEE_PAYER_PRIVATE_KEY`, `MERKLE_TREE_ADDRESS`, `COLLECTION_MINT_ADDRESS` must be set |
| Compressed NFT Minting | Full implementation in `mint-nft.ts` | Same env vars + funded fee payer wallet on devnet |
| Stars SPL Token | Setup script exists, `/api/award-stars` route complete | `STARS_TOKEN_MINT`, `FEE_PAYER_PRIVATE_KEY` |
| NFT Metadata | `/api/metadata/observation` returns correct JSON schema | `NEXT_PUBLIC_APP_URL` |
| Sky Oracle | `/api/sky/verify` with deterministic SHA-256 hash | Open-Meteo API (free, no key) |
| Photo Verification | `/api/observe/verify` with Claude Vision | `ANTHROPIC_API_KEY` |
| ASTRA Chat | `/api/chat` with tool calling | `ANTHROPIC_API_KEY` |
| Stars Balance | `/api/stars-balance` reads SPL balance | `STARS_TOKEN_MINT`, RPC access |
| Rate Limiting | DB-based in `/api/mint` (1 per wallet+target/hour) | `DATABASE_URL` (Neon) |
| OG Image | `/api/og/sky` with ImageResponse | None |

**Critical question:** Have you run the setup scripts (`npm run setup:bubblegum` and `npm run setup:token`) on devnet and set the resulting addresses in Vercel env vars? If not, minting will fail with "MERKLE_TREE_ADDRESS not set" errors.

---

## SECTION 5 — SUGGESTED TEXT FOR HOMEPAGE, HEADER & FOOTER

### Header (Nav Bar)

**Logo:** `✦ STELLAR` (current AstroLogo component — keep as-is)

**Desktop tabs (keep current order):**
- Sky · Missions · ASTRA · Marketplace · Profile

**Suggested addition:** Add "Learn" tab since that page has rich content (planets, constellations, quizzes). Current nav has 5 tabs which is already good density.

**Right side (keep current):** Search icon · Auth buttons (Log In / Register) or profile badge when signed in.

### Hero Section

**Keep:** `✦ STELLAR ✦` badge, star field canvas animation, "Global" location badge

**H1:** `Observe the Night Sky. Earn on Solana.` ← already correct

**Subtitle:** `Photograph celestial objects from anywhere in the world. Earn Stars tokens, collect discovery NFTs, and shop telescopes at your local dealer.` ← already correct

**CTAs:**
- Primary: `Start Observing →` → `/missions` ← already correct
- Secondary: `Tonight's Targets` → `/sky` ← already correct

**Trust line:** `Free to join · No wallet needed · Powered by Solana` ← already correct

**Add:** A small pulsing green dot + "Live on Solana Devnet" badge near the trust line. This signals to judges that there's real on-chain activity.

### How It Works

**Current text with suggested changes:**

| Step | Current | Suggested |
|---|---|---|
| 1 | "Point your telescope at tonight's target" | Keep as-is ✅ |
| 2 | "Photograph through the eyepiece" | Keep as-is ✅ |
| 3 | "Sky oracle verifies clear conditions" | → "AI verifies your sky conditions" |
| 4 | "Discovery sealed on Solana as compressed NFT" | → "Your discovery is permanently recorded on Solana" |

### Active Missions Section

**Current:** Hardcoded fake missions ("Jupiter's Moons +120✦", "Deep Sky Survey +200✦") that don't exist in the real mission system.

**Fix:** Replace with actual missions from `constants.ts`:
1. 🌌 Tonight's Sky — Free · Always Available (keep current)
2. 🌕 The Moon — Beginner · +50✦ — "Observe the lunar surface. Identify at least 3 craters."
3. 🪐 Jupiter — Beginner · +75✦ — "Locate Jupiter and observe its Galilean moons."
4. 🪐 Saturn — Intermediate · +100✦ — "Observe Saturn's rings through your telescope."

### ASTRA Preview Section

Keep the current fake conversation mockup — it's effective and well-designed.

**Suggestion pills (current are good):**
- "What's visible tonight?"
- "Telescope recommendations for beginners"
- "Explain Jupiter's Red Spot"

### Earn Stars Section

**Title:** "Earn Stars. Spend Real Rewards." ← keep

**Subtitle:** "Complete sky missions to earn Stars tokens and compressed NFTs on Solana. Redeem Stars at partner telescope stores worldwide." ← keep

**Product showcase — add USD equivalent:**
- "Custom Star Map — 29 GEL (~$10) or 500✦"
- "Moon Lamp — 45 GEL (~$16) or 750✦"
- "Bresser Junior Telescope — 299 GEL (~$105) or 5000✦"

### Partner Stores Section

**After MARKET-1 is executed, replace with 3 stores:**

```
🔭 Astroman
Georgia's first astronomy store
Ships to: 🇬🇪 🇦🇲 🇦🇿 🇹🇷

🔭 Celestron
World's #1 telescope brand
Ships to: 🇺🇸 🇨🇦

🔭 Bresser
Germany's leading optics manufacturer
Ships to: 🇩🇪 🇦🇹 🇨🇭 🇫🇷 🇮🇹 + EU
```

### Builder Line

**Current:** "Built solo by an astronomy store owner using AI development tools"

**Suggested:** "Built solo by a telescope shop owner from Georgia — for astronomers everywhere."

### Footer

**Brand:** `✦ STELLAR` ← keep

**Links (current are correct except GitHub):**
- Sky Forecast · Missions · ASTRA AI · Marketplace · Profile · Learn
- Astroman ↗ → `https://astroman.ge`
- GitHub ↗ → **FIX TO** `https://github.com/Rezimod/Stellar`

**Copyright:** `© 2026 Stellar · Built on Solana` ← keep

---

## SECTION 6 — PRIORITY ACTION PLAN

### This Weekend (April 11-13)

1. **Force Vercel redeploy** — clear stale cache, verify all pages show new nav/footer
2. **Fix profile `reset()` bug** — line 57 of `profile/page.tsx`
3. **Fix footer GitHub URL** — `Footer.tsx` line 29
4. **Fix homepage mission data** — sync with `constants.ts` or import from it
5. **Test full mint flow** — sign in → start mission → capture → verify → mint → check Explorer
6. **Verify env vars on Vercel** — especially `MERKLE_TREE_ADDRESS`, `COLLECTION_MINT_ADDRESS`, `STARS_TOKEN_MINT`, `FEE_PAYER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`

### Week of April 14-18

7. **Execute MARKET-1** — add Celestron US + Bresser EU, add 'europe' region
8. **Update homepage partner stores** — replace High Point with Celestron + add Bresser
9. **Fix homepage text** — How It Works jargon, add USD to GEL prices, fix builder line
10. **Update README** — fix git clone URL, remove High Point references
11. **Update manifest.json** — new description, generate proper PWA icons

### Week of April 19-24

12. **Execute DARKSKY-1** — Leaflet map with NASA tiles (high visual impact for judges)
13. **Execute SHARE-1** — shareable success overlay (viral loop for demo)
14. **Execute PWA-1** — installable app feel
15. **Execute ONBOARD-1** — first-time user onboarding

### Week of April 25 – May 7

16. **Execute remaining polish prompts** — PERF-1, GAMIFY-1, POLISH-1
17. **Execute DARKSKY-2** — AI photo analyzer (impressive demo moment)
18. **Record demo video** — 2 minutes covering full flow
19. **Submit by May 6** — don't wait until deadline

---

## SECTION 7 — WHAT JUDGES WILL CHECK (and current score)

| Criterion | Score | Notes |
|---|---|---|
| Working Solana integration | ⚠️ 7/10 | Code is solid. Need to verify env vars + live mint works. |
| Non-crypto UX | ✅ 9/10 | Privy email login, no seed phrases, gasless. Excellent. |
| Real problem being solved | ✅ 9/10 | 300M amateur astronomers, zero on-chain. Clear narrative. |
| Revenue model | ✅ 8/10 | Marketplace with real products. Stars → discount codes. |
| Polish & completeness | ⚠️ 6/10 | Several pages broken on live site. Mission data inconsistent. |
| Onchain depth | ⚠️ 7/10 | Bubblegum cNFTs + SPL token + Sky oracle. No Anchor program (decided against in plan). |
| Demo quality | ⚠️ 5/10 | Can't demo until live site is verified working. |
| README & documentation | ✅ 8/10 | README is good but has wrong repo URL. |

**Overall hackathon-readiness: 70%** — the code foundation is strong, but deployment verification and the remaining prompts need to happen this week.

---

*Generated from code-level analysis of github.com/Rezimod/Stellar (64 commits, main branch)*
*Live site tested: stellarrclub.vercel.app*
