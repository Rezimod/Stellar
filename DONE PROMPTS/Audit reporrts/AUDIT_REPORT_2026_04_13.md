# Stellar — Code Review & Audit Report
**Generated:** 2026-04-13  
**Auditor:** Claude Code Reviewer Skill  
**Source:** Full codebase inspection — all pages, API routes, components, hooks, providers  
**Build status at time of audit:** ✓ Passes `next build` (exit 0, no TS errors)  
**Dev mode:** BROKEN under Turbopack (`next dev --turbopack`) — Noto Georgian font fails

---

## Summary

Stellar is a well-structured, demo-ready hackathon app with solid architecture. The Privy auth, AI chat, NFT minting, and sky data flows are all present and production-grade in design. However, there are several real bugs and serious UX/security issues that would fail under actual demo conditions or judge scrutiny: hardcoded Tbilisi coordinates served to all unauthenticated users, reward codes that are static and server-side legible, a `sim_` txId fallback that silently claims success on mint failure, and a broken build under Turbopack (dev mode). The app also carries Georgia-specific copy that conflicts with its stated "global" identity.

---

## What Is Good

- Build compiles cleanly (exit 0, no TypeScript errors)
- API routes have strong input validation (magic bytes on image upload, lat/lon bounds, amount caps)
- `INTERNAL_API_SECRET` guard exists on `/api/mint` and `/api/award-stars`
- Double-capture anti-cheat mechanism is clever and well-implemented
- Idempotency key on `/api/award-stars` prevents double-minting
- Daily stars cap enforced server-side in `/api/observe/log`
- Proper SSE streaming in chat route; tool-use agentic flow is solid
- Suspense boundaries with skeleton fallbacks on sky page
- `prefers-reduced-motion` respected in homepage animations
- `AppStateProvider` gracefully handles malformed localStorage
- `src/lib/stars.ts` extracted (cross-route import fixed)
- HEIC mediaType remapped to `image/jpeg` for Claude API (fixed)
- Cloud cover oracle properly returns `null` and 503 (fixed)
- `/api/darksky/geojson` route exists (fixed)

---

## Problems Found

### Issue 1 — Hardcoded Tbilisi coordinates for unauthenticated users
- **Severity:** High
- **Files:** `src/app/chat/page.tsx:39`, `src/app/missions/page.tsx:48`
- **Problem:** `fetch('/api/sky/verify?lat=41.6938&lon=44.8015')` is hardcoded. A user in New York sees Tbilisi sky conditions with no indication of this.
- **Why it matters:** For a "global" app this is wrong 99% of the time and destroys trust. Contradicts the GLOBAL pivot in CLAUDE.md.
- **Fix:** Use `useLocation()` hook coordinates. Fall back only if `location.source === 'default'`. Add "Showing conditions for [City]" label.

---

### Issue 2 — `sim_` txId silently treated as a successful mint
- **Severity:** High
- **File:** `src/components/sky/MissionActive.tsx:138-175`
- **Problem:** On any mint failure (network error, devnet down, missing env vars), `txId` stays as `sim_XXXX`. The mission is still saved as `status: 'completed'` and the done screen shows success UI. The Solana explorer link constructed from `sim_XXXX` returns a 404.
- **Why it matters:** Hackathon judges will click the explorer link. A 404 destroys on-chain credibility. Users think they have an NFT when they don't.
- **Fix:**
  - Change mission status to `'pending'` for any `txId.startsWith('sim')` call to `addMission()`
  - Show "Saved locally — will sync when online" instead of "Sealed on Solana"
  - Only render the explorer `<a>` link if `!mintTxId.startsWith('sim')`

---

### Issue 3 — Reward codes hardcoded in source (exposed in repo)
- **Severity:** High
- **File:** `src/app/api/redeem-code/route.ts:4-8`
- **Problem:** `MOONLAMP25`, `STELLAR10`, `STELLAR20` are literal strings in checked-in source. Anyone reading the GitHub repo gets the codes without any Stars.
- **Why it matters:** These are real Astroman store discount codes. Real financial exposure.
- **Fix:** Move to env vars: `process.env.REWARD_CODE_MOONLAMP`, `process.env.REWARD_CODE_10PCT`, `process.env.REWARD_CODE_20PCT`. Add to `.env.local` and Vercel dashboard.

---

### Issue 4 — `/api/users/upsert` has no authentication
- **Severity:** High
- **File:** `src/app/api/users/upsert/route.ts:16`
- **Problem:** Accepts `privyId`, `email`, `walletAddress` from anyone — no `INTERNAL_API_SECRET` check. An attacker can overwrite any user's `walletAddress` to redirect Stars minting to their own wallet.
- **Fix:** Add the same `INTERNAL_API_SECRET` check used in `/api/mint` and `/api/award-stars` at the top of the POST handler.

---

### Issue 5 — Turbopack dev mode crashes on Noto Sans Georgian font
- **Severity:** High (developer experience / contribution blocker)
- **File:** `src/app/layout.tsx:27`
- **Problem:** `next dev --turbopack` (default in Next.js 15+) throws `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'` for the Georgian font. Dev environment is broken for any new contributor.
- **Fix:**
  ```ts
  const notoGeorgian = Noto_Sans_Georgian({
    subsets: ['georgian'],
    variable: '--font-georgian',
    weight: ['400', '500', '600'],
    display: 'swap',
    preload: false, // ← add this line
  });
  ```

---

### Issue 6 — Chat ASTRA uses wrong location for sky data
- **Severity:** Medium
- **File:** `src/app/chat/page.tsx:39`, `src/app/api/chat/route.ts:9`
- **Problem:** The initial sky summary card fetches Tbilisi coords. ASTRA's tool calls (`get_planet_positions`, `get_sky_forecast`) default to `41.72, 44.83` if no lat/lon is passed. A user in London asking "what's visible tonight?" gets Tbilisi planet times.
- **Fix:** Pass `lat`/`lon` from `useLocation()` in the chat POST body. The API route already supports them in `runTool()` — just needs them passed through.

---

### Issue 7 — Leaderboard mixes fake seed data with real entries, no clear labeling
- **Severity:** Medium
- **File:** `src/app/leaderboard/page.tsx:18-28`
- **Problem:** `SEED_DATA` (9 fake Georgian handles with invented scores) is always shown merged with real DB entries. No "demo data" label. Judges will see a populated leaderboard that is fake.
- **Fix:** Either label seed entries with `"(example)"` suffix, or: if `liveEntries.length >= 1`, hide seed data entirely and only show real entries.

---

### Issue 8 — Georgia-specific hardcoded copy in observe page (not through i18n)
- **Severity:** Medium
- **File:** `src/app/observe/page.tsx:34`
- **Problem:** `"Every verified observation earns real rewards from Georgia's first astronomy store."` — hardcoded English string, not through `next-intl`, and geo-specific.
- **Why it matters:** CLAUDE.md requires all UI strings through `next-intl`. This page is the primary conversion funnel.
- **Fix:** Move to translation key `t('observe.rewardDesc')`. Change copy to `"Real rewards from your local astronomy partner."` in `en.json`.

---

### Issue 9 — `WalletSync` missing dependency in `useEffect`
- **Severity:** Medium**
- **File:** `src/components/providers/WalletSync.tsx:12`
- **Problem:** `useEffect(() => { ... }, [solWallet?.address])` — `setWallet` is missing from the deps array. ESLint/React strict mode will flag this.
- **Fix:** `}, [solWallet?.address, setWallet]);`

---

### Issue 10 — Chat input Enter key doesn't check `authenticated`
- **Severity:** Medium
- **File:** `src/app/chat/page.tsx:316-321`
- **Problem:** The `onKeyDown` handler calls `send()` which only guards on `!msg || loading`, not on `!authenticated`. If the textarea is somehow focused while unauthenticated, Enter triggers a fetch to `/api/chat`.
- **Fix:** Add `|| !authenticated` to the guard inside `send()`.

---

### Issue 11 — Photo lightbox has no Escape key / focus trap
- **Severity:** Low
- **File:** `src/app/profile/page.tsx:158`
- **Problem:** Modal opened by clicking a discovery photo has no keyboard close. Screen reader / keyboard users cannot dismiss it.
- **Fix:**
  ```ts
  useEffect(() => {
    if (!selectedPhoto) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPhoto(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedPhoto]);
  ```

---

### Issue 12 — `cloudCover === null` returns 503, discards already-paid Claude Vision call
- **Severity:** Low
- **File:** `src/app/api/observe/verify/route.ts:214`
- **Problem:** If Open-Meteo times out (5s), the route returns 503 and discards the Claude Vision result. The user's photo was already analyzed (API credit spent), but they get a retry-able error.
- **Fix:** Fall back to `cloudCover = 50` (medium/fair) with a `skyOracleUnavailable: true` flag in the response instead of a hard 503. The observation is still accepted at medium confidence.

---

### Issue 13 — Solana explorer link constructed from `sim_` txId is always a 404
- **Severity:** Low
- **File:** `src/components/sky/MissionActive.tsx` (done screen)
- **Problem:** The done screen renders an explorer link using `mintTxId`. If `mintTxId = 'sim_abc123'`, the link goes to `https://explorer.solana.com/tx/sim_abc123?cluster=devnet` — guaranteed 404.
- **Fix:** Wrap explorer link render: `{mintTxId && !mintTxId.startsWith('sim') && <a href={...}>View on Explorer</a>}`

---

## Open from Colosseum Deep Report (STELLAR_COLOSSEUM_DEEP_REPORT.md)

These were flagged by Colosseum Copilot — status as of 2026-04-13:

| ID | Issue | Status |
|----|-------|--------|
| C1 | Leaderboard static mock data | Still open (seed data still present) |
| C2 | Collection NFTs minted with `verified: false` | Still open (`mint-nft.ts:48`) |
| C3 | `simResult()` fakes mints (`success: true`) | Partially open — `sim_` path still in `MissionActive` |
| C4 | In-memory rate limiting resets on cold start | Still open (no Redis/Upstash) |
| C5 | Missing DB columns (`lat`, `lon`, `identifiedObject`) | Still open |
| C6 | `@metaplex-foundation/js` legacy dep still in `package.json` | Still open (v0.20.1 present) |
| C7 | `next: 16.1.6` unusual/pre-release version | Still open (package.json shows 16.1.6) |
| C8 | FALLBACK_ANALYSIS accepts with low confidence on Claude API failure | Still open (`hasNightSkyCharacteristics: true`) |
| C9 | Stars race condition (verify returns count, log awards async) | Still open |
| C10 | No shareable social proof on mission done screen | Still open |

---

## Confirmed Fixed (from `test result.md` and current codebase inspection)

| ID | Fix | Verified By |
|----|-----|------------|
| F1 | Cross-route import → `src/lib/stars.ts` extracted | File exists, import updated |
| F2 | HEIC mediaType remapped to `image/jpeg` for Claude | Lines 98-103 in verify route |
| F3 | Cloud cover oracle `null` → 503 (not default 15%) | Lines 202-215 in verify route |
| F4 | `/api/mint` cloudCover > 70 rejection | Lines 28-33 in mint route |
| F5 | `/api/mint` stars > 1000 cap | Lines 43-47 in mint route |
| F6 | `/api/darksky/geojson` route created | File exists in API routes |
| F7 | `src/lib/darksky-locations.ts` extracted | File exists |
| F8 | Profile uses `/api/stars-balance` endpoint | Confirmed in profile page |
| F9 | Duplicate AstroChat removed from layout | Not present in layout.tsx |
| F10 | Rate limit + idempotency on `/api/award-stars` | Confirmed in route |

---

## Regression Risks

- `INTERNAL_API_SECRET` being `undefined` makes all guarded routes fully open — document this in `.env.example`
- `AppState` localStorage merge doesn't handle shape changes in nested arrays
- Leaderboard "This Week" tab filters a 30-day server response client-side — misrepresents weekly data
- `/api/observe/log` and `/api/award-stars` can both award Stars for the same observation (double-award risk)
- `useLocation()` initialization delay causes flash from global→regional products on marketplace

---

## Final Verdict

**Ready after small fixes**

Issues 1–5 (hardcoded coords, sim_ UX, exposed reward codes, open upsert auth, Turbopack crash) must be fixed before demo day. Issues C2, C6, C7, C8 from the Colosseum report also need attention before submission.
