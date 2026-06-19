# STELLAR — Adversarial Audit Report

## Executive Summary

- **Commit audited:** `2c5a20d4c1da831baa07f09d0d96dd312b1f8a23` (branch `main`)
- **Date:** 2026-06-19
- **Method:** Read-only static analysis + production build + local dev smoke (`localhost:3137`). No mutations to the repo except this report. No package installs. No commits.

**Posture in three sentences.** Stellar is a genuinely well-hardened codebase: every value-bearing API route enforces authentication, server-authoritative amounts, idempotency, and unified daily/monthly Stars caps; the photo→mint pipeline is gated by an HMAC verification token that the server re-validates; and there are no leaked secrets in the working tree or git history. The audit found **zero Critical issues** — the failure modes a grant reviewer would hunt for first (anyone-can-mint, README lying about the AI provider, leaked fee-payer key) are all either correctly defended or already accurate. The real liabilities are softer: a ~21× internal inconsistency in the Stars↔GEL economics, an unenforced "cloud cover blocks minting" claim, prediction-market and stale-URL remnants from earlier pivots, a CSP that still permits `unsafe-inline`/`unsafe-eval`, and documentation (CLAUDE.md) that has drifted from the actual design tokens.

**Top 5 findings (severity-ranked):**
1. **[High] CSP `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`** — `next.config.ts:~70` — defeats most of CSP's XSS value.
2. **[High] 27 high-severity transitive npm advisories** (`ws` DoS, `bigint-buffer` overflow) via the Solana dependency tree — `npm audit`.
3. **[Medium] Stars economics are internally inconsistent (~21×):** discount burn is 100 Stars/GEL (`stars-economy.ts:8`) but full Stars purchase is ~4.69 Stars/GEL (`stars-economy.ts:19`).
4. **[Medium] "Cloud cover > 70% blocks minting" is not enforced server-side** — `cloudCover` is client-supplied and never gates `/api/mint` (`src/app/api/mint/route.ts:59`).
5. **[Medium] Pivot remnants & stale URLs:** prediction-market `market_cashouts` table + `.mkt-*`/`.stl-odds-*` CSS; README points at dead `stellarsky.vercel.app`.

---

## Findings by Severity

### High

---

### F-001 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` in `script-src`

**Severity:** High
**Area:** Security
**Location:** `next.config.ts` (`headers()` → `csp` array)

**Evidence:**
```
"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://*.privy.io https://challenges.cloudflare.com",
```

**Impact:** A single reflected/stored XSS (e.g. a feed comment, username, or any DOM sink that escapes the React default) becomes fully exploitable: `'unsafe-inline'` lets injected `<script>`/inline handlers run, and `'unsafe-eval'` permits `eval`/`Function` payloads. For an app that mints tokens and signs transactions, script injection is the highest-value target. The rest of the header set is strong (HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options`), which makes this the weakest link.

**Recommendation:** Move to a nonce- or hash-based `script-src`. Next.js supports per-request nonces via middleware; emit a nonce, drop `'unsafe-inline'`, and scope `'unsafe-eval'` only if a wallet/Privy SDK genuinely requires it (test — most do not in production builds). If `'unsafe-eval'` is unavoidable for a dependency, document why and keep `'unsafe-inline'` off at minimum.

---

### F-002 — 27 high-severity transitive dependency advisories

**Severity:** High
**Area:** Code Quality / Security
**Location:** `package-lock.json` (transitive, via `@solana/web3.js` and the wallet-adapter tree)

**Evidence:** `npm audit` (production tree) reports `66 vulnerabilities (14 low, 25 moderate, 27 high)`. Representative highs:
```
ws: Memory exhaustion DoS from tiny fragments and data chunks — GHSA-96hv-2xvq-fx4p
ws: Uninitialized memory disclosure — GHSA-58qx-3vcg-4xpx
bigint-buffer: Buffer Overflow via toBigIntLE() — GHSA-3gc7-fjrx-p6mg
```
The build log confirms `bigint-buffer` is in use: `bigint: Failed to load bindings, pure JS will be used`.

**Impact:** `ws` is reachable through Solana RPC websocket subscriptions; `bigint-buffer` parses untrusted on-chain data. On devnet with low traffic the practical risk is low, but a grant/security reviewer running `npm audit` will see "27 high" and it reads badly regardless of exploitability. The mainnet-migration milestone raises real exposure.

**Recommendation:** Run `npm audit` and pin/upgrade where fixes exist (`ws` has patched releases; force-resolve via `overrides` in `package.json` if the Solana packages haven't bumped). For `bigint-buffer` (often no fix), document it as an accepted, transitive, parse-only risk in a `SECURITY.md` so reviewers see it was triaged, not ignored. Do this before the mainnet cutover.

---

### Medium

---

### F-003 — Stars↔GEL value is internally inconsistent by ~21×

**Severity:** Medium
**Area:** Business Logic
**Location:** `src/lib/stars-economy.ts:8` and `src/lib/stars-economy.ts:14-20`

**Evidence:**
```
export const STARS_PER_GEL = 100;          // discount burn: 100 Stars = 1 GEL off
...
export const MARKETPLACE_REFERENCE_GEL = 288;
export const MARKETPLACE_REFERENCE_STARS = 1350;
export const MARKETPLACE_STARS_PER_GEL = 1350 / 288; // ≈ 4.69  (pay-in-full)
```
A 288 GEL telescope can be bought outright for **1,350 Stars** (4.69/GEL), but using Stars as a *discount* on that same item costs **100 Stars per GEL** — so the (capped, 30%) discount of 86.4 GEL would burn **8,640 Stars**. The same Star is worth ~0.21 GEL on one path and ~0.01 GEL on the other.

**Impact:** A rational user always pays in full with Stars (cheap) and never uses the discount burn (expensive) — the discount feature is economically dead. More damaging for credibility: a grant or investor who models the token sink will spot the 21× gap immediately, and it undermines the "measured, earned" brand. The two rates were calibrated independently and never reconciled.

**Recommendation:** Pick one canonical Star value (GEL per Star) and derive both the discount-burn rate and the full-purchase rate from it. If the two paths are intentionally different products, cap or gate them so the cheaper path can't trivially dominate, and document the rationale next to the constants.

---

### F-004 — "Cloud cover > 70% blocks minting" is not enforced server-side

**Severity:** Medium
**Area:** Business Logic / Honesty
**Location:** `src/app/api/mint/route.ts:59-61`; `src/lib/oracle-hash.ts:9-18`; `src/app/api/observe/verify/route.ts:445-461`

**Evidence:** `/api/mint` only range-checks `cloudCover`:
```
if (typeof cloudCover !== 'number' || cloudCover < 0 || cloudCover > 100) {
  return NextResponse.json({ error: 'cloudCover must be 0–100' }, { status: 400 });
}
```
`cloudCover` is then fed verbatim (client value) into `computeOracleHash(lat, lon, cloudCover, slot)`. Because the server re-derives the hash with the *same client-supplied* `cloudCover`, the hash always validates — it attests "the client said it was clear," not the real weather. In `/api/observe/verify` the real Open-Meteo cloud cover is fetched but only sets a `weatherUnavailable` flag; the numeric value never gates acceptance or the Stars award. `/api/observe/log` passes `cloudCover: 0` to the on-chain record.

**Impact:** A user can mint a "verified observation" on a fully overcast night by sending `cloudCover: 0`. The sky-oracle hash, marketed as binding the observation to real conditions, binds it to a client claim. Any reviewer who checks the oracle inputs will note the weather attestation is cosmetic.

**Recommendation:** Fetch cloud cover server-side at verify time, include it in the signed observation token, and re-check it (or the token's value) at `/api/mint`. Either enforce the >70% reject, or stop advertising it as a gate and describe it accurately as an advisory signal.

---

### F-005 — Prediction-market remnants from an abandoned pivot

**Severity:** Medium
**Area:** Code Quality / Honesty
**Location:** `src/lib/schema.ts:270-282` (`marketCashouts` table); `src/app/globals.css:30`; `src/styles/stellar-tokens.css` (`.mkt-trending-odds`, `.mkt-odds-pair`, `.stl-odds-*`, `.stl-row-obs-odds`)

**Evidence:**
```
src/lib/schema.ts:270  export const marketCashouts = pgTable('market_cashouts', { ... marketId, side, originalStake, refundedAmount, refundTx ... })
src/app/globals.css:30  /* Markets Yes/No — binary outcome indicators, prediction markets only */
src/styles/stellar-tokens.css:1192  .mkt-trending-odds { ... }
```

**Impact:** The repo still ships a `market_cashouts` Drizzle table and "odds"/"market" CSS from the prediction-market direction that was reverted. A reviewer running `git grep` will find betting vocabulary in an astronomy app, which raises "what is this really" questions and (for a regulated-adjacent token) compliance eyebrows. Dead schema also risks accidental `db:push` of an unused table.

**Recommendation:** Delete the `marketCashouts` table from `schema.ts` (and drop it from the DB), remove the `.mkt-*`/`.stl-odds-*` rules and the "prediction markets only" comment. Confirm nothing references them first (`grep -r marketCashouts src/`).

---

### F-006 — Stale live-URL in README (`stellarsky.vercel.app`)

**Severity:** Medium
**Area:** Honesty
**Location:** `README.md:9, 66, 85`; also `docs/archive/STELLAR_INFO.md:7`

**Evidence:**
```
README.md:9  [Live App](https://stellarsky.vercel.app) · ...
README.md:85 Live network map: [stellarsky.vercel.app/network](https://stellarsky.vercel.app/network).
```
The code's canonical URL is `https://stellarrclub.vercel.app` (`src/lib/mint-nft.ts:62`, `e2e/routes.spec.ts`, `telescope-passport.ts`, `push/send.ts`). `stellarsky.vercel.app` appears nowhere in the app code.

**Impact:** The README's primary "Live App" link and the network-map link point at a hostname the app does not use; a reviewer clicking from the README may land on a dead or wrong deployment. (Note: the audit brief's assumed canonical `stellar.club` appears in neither README nor code — see F-018.)

**Recommendation:** Replace all `stellarsky.vercel.app` occurrences with the real canonical host. Decide the single source of truth for the public URL and use it in README, `NEXT_PUBLIC_APP_URL`, and OG metadata.

---

### F-007 — CLAUDE.md design palette contradicts the live design tokens

**Severity:** Medium
**Area:** Honesty / UX-UI
**Location:** `CLAUDE.md` §5 ("Dark cosmic theme") vs `src/app/globals.css:20-75`

**Evidence:** CLAUDE.md §5 states `accent purple #8B5CF6, teal #14B8A6, amber #F59E0B`. The live tokens are:
```
src/app/globals.css:20  --terracotta: #FFB347;    /* unified to missions-page orange (was #FFD166) */
src/app/globals.css:62  --accent: var(--terracotta);
src/app/globals.css:75  --accent-teal: var(--seafoam);   /* #5EEAD4 */
```
The primary accent is now warm orange (`#FFB347`), not purple. The comment confirms an intentional migration "(was #FFD166)".

**Impact:** The checked-in design doc no longer describes the product. Any agent or designer following CLAUDE.md §5 (or the audit brief's gold/teal/Fraunces spec, which is also stale) will introduce off-palette colors. This is documentation drift, not a UI bug — but it actively misleads future work. (Fonts, by contrast, are correct: `Orbitron`/`Geist`/`JetBrains Mono` are loaded in `layout.tsx:3` exactly as documented.)

**Recommendation:** Update CLAUDE.md §5 and `.impeccable.md` to match the `--terracotta`/`--seafoam` token reality, or re-derive the tokens from the documented palette if purple was the intended brand. Make `globals.css` the single source of truth and have the docs reference it.

---

### F-008 — Emoji used in UI chrome (design-system hard-rule violation)

**Severity:** Medium
**Area:** UX-UI
**Location:** `src/components/LocationPicker.tsx:118-121, 411`; `src/components/club/TelescopeStep.tsx:64`

**Evidence:**
```
LocationPicker.tsx:118  { key: 'caucasus', label: 'Caucasus', emoji: '🛰' },
LocationPicker.tsx:119  { key: 'north_america', label: 'Americas', emoji: '🌎' },
TelescopeStep.tsx:64    {saving ? 'Saving...' : 'Register Telescope 🔭'}
```

**Impact:** CLAUDE.md design constraints state "**No emoji in UI** — SVG icons only." Region tabs render satellite/globe emoji and the telescope-registration CTA carries a 🔭. Emoji render inconsistently across platforms and break the "patient/precise/earned, anti-hype" brand the design doc insists on. (The `✦` Star glyph is the sanctioned exception and is fine.)

**Recommendation:** Replace the region-tab emoji and the 🔭 CTA with `lucide-react` or inline SVG icons, consistent with the rest of the icon system in `src/components/icons/`.

---

### F-009 — Heavy First-Load JS on several primary pages

**Severity:** Medium
**Area:** Performance
**Location:** production build route table (`npm run build`)

**Evidence:**
```
/sky                    188 kB page   559 kB First Load JS
/marketplace/checkout  17.7 kB page   437 kB First Load JS
/missions              21.5 kB page   404 kB First Load JS
/learn                 49.6 kB page   388 kB First Load JS
/feed                  18.8 kB page   383 kB First Load JS
/profile               16.3 kB page   372 kB First Load JS
```
Shared baseline is a healthy 105 kB; the bloat is page-specific.

**Impact:** `/sky` at 559 kB First Load is the app's headline surface and the slowest to interactive — costly on the mid-range Android phones the Astroman/Field audience uses. Three.js + Leaflet + the wallet/Privy stack are the likely contributors. Mobile-first is a stated hard rule; half-megabyte first loads contradict it.

**Recommendation:** Dynamically import the Three.js sky scene and Leaflet map (`next/dynamic`, `ssr:false`) so they load only when visible; code-split the checkout/marketplace flows. Re-measure; target < 300 kB First Load on `/sky`.

---

### F-010 — Observation-token HMAC compared with non-constant-time `!==`

**Severity:** Medium
**Area:** Security
**Location:** `src/lib/observation-token.ts:129, 161-162`

**Evidence:**
```
if (signPayload(payload, secret) !== sig) {
  return { ok: false, status: 401, reason: 'Invalid verification token' };
}
```
By contrast, the X-agent token does it correctly: `agent-token.ts:29` uses `timingSafeEqual`.

**Impact:** String `!==` short-circuits on the first differing byte, leaking timing that — in theory — aids forging a token signature for the mint/Stars path. Over a network with a 30-minute token TTL this is impractical to weaponize, but it is the gate protecting all minted value and should match the constant-time comparison already used elsewhere in the codebase.

**Recommendation:** Compare the hex signatures with `crypto.timingSafeEqual` (guard equal length first), mirroring `agent-token.ts`.

---

### Low

---

### F-011 — 19 `<img>` tags instead of `next/image`

**Severity:** Low
**Area:** Performance
**Location:** e.g. `src/app/sky/page.tsx:840`, `src/components/sky/MissionActive.tsx:608,907`, `src/app/proof/page.tsx:37`, `src/components/feed/FeedPostCard.tsx:638`

**Evidence:** `grep -rn "<img " src --include=*.tsx` → 19 hits.

**Impact:** Mostly defensible — many render `blob:`/`data:` capture previews or remote photos where `next/image` is awkward, and most already set `loading="lazy" decoding="async"`. But static local assets (`getMissionImage(...)`) forgo Next's AVIF/WebP/resize pipeline that `next.config.ts` already configures.

**Recommendation:** Convert the static-asset cases (mission thumbnails, placeholders) to `next/image`; leave the user-capture/data-URL cases as `<img>` with explicit `width`/`height` to avoid layout shift.

---

### F-012 — `/api/m/o` returns `Access-Control-Allow-Origin: *`

**Severity:** Low
**Area:** Security
**Location:** `src/app/m/o/route.ts:36`

**Evidence:** `'Access-Control-Allow-Origin': '*'`

**Impact:** This is a GET NFT-metadata/share route returning public, non-sensitive data, so wildcard CORS is acceptable — but it's the only `*` in the codebase and worth confirming it never grows to return user-scoped data.

**Recommendation:** Leave as-is for the public metadata response; add a comment noting the wildcard is intentional and the response must stay non-sensitive.

---

### F-013 — `/api/push/subscribe` stores location with no authentication

**Severity:** Low
**Area:** Security / Data
**Location:** `src/app/api/push/subscribe/route.ts` (in the "open routes" survey)

**Evidence:** Route is not gated by `verifyPrivy`; the `push_subscription` table stores `endpoint, p256dh, auth, lat, lon, city` (`schema.ts:321-335`).

**Impact:** An unauthenticated caller can write push-subscription rows (with attacker-chosen lat/lon), enabling spam rows and minor data pollution. The endpoint URL is the dedupe key (`.unique()`), which bounds blast radius. Low risk, but it stores approximate user location.

**Recommendation:** Rate-limit by IP and, where a session exists, bind the subscription to the wallet; validate `lat`/`lon` ranges before insert.

---

### F-014 — `ASTROMAN_TILL_SECRET` env var is undocumented

**Severity:** Low
**Area:** Code Quality
**Location:** `src/app/api/redeem-code/validate/route.ts:17`; absent from `.env.example`

**Evidence:** The cashier-till redemption endpoint requires `process.env.ASTROMAN_TILL_SECRET`, but the variable is not listed in `.env.example` or CLAUDE.md's env section.

**Impact:** A fresh deploy of the redemption feature fails closed with a 503 ("Till secret not configured") and the operator has no documentation pointing at the missing var.

**Recommendation:** Add `ASTROMAN_TILL_SECRET=` to `.env.example` and the CLAUDE.md env list.

---

### F-015 — `find:` Stars reward grants 10 Stars with no proof of a find

**Severity:** Low
**Area:** Business Logic
**Location:** `src/app/api/award-stars/route.ts:118-119`; `src/lib/award-stars-policy.ts:36`

**Evidence:**
```
} else if (reasonStr.startsWith('find:')) {
  amount = 10;
}
```
Any authenticated session can POST `reason: "find:anything"` and receive 10 Stars; there is no server-side check that the target was actually located.

**Impact:** A scripted client can farm `find:` rewards up to the `DAILY_STARS_CAP` (500/wallet/day → ~50 free claims/day), all server-authoritative and rate-limited but unbacked by a real action. The unified daily + 4,000/month cap (`stars-cap.ts`) bounds the total, so this is a grind annoyance, not a drain — but it's the one earning path with no verification.

**Recommendation:** Bind `find:` to a server-verifiable signal (e.g., a short-lived signed token issued when the sky-finder confirms the target is above the horizon at the user's coordinates), the way observations use the HMAC token.

---

### F-016 — `/darksky` responds with a 307 redirect

**Severity:** Low
**Area:** Smoke
**Location:** live probe `GET /darksky → HTTP 307`

**Evidence:** Local dev smoke: every page returned 200 except `/darksky` (307). All other probed pages (`/`, `/sky`, `/missions`, `/marketplace`, `/chat`, `/nfts`, `/leaderboard`, `/field`, `/profile`) rendered 200 with no server-side errors in the dev log.

**Impact:** Likely an intentional locale/redirect, but unverified; a 307 on a linked page can confuse crawlers and OG unfurls if unintended.

**Recommendation:** Confirm the redirect target is intended (locale prefix?) and that it terminates in a 200.

---

### F-017 — Dead/incorrect `ai-config.ts` constant

**Severity:** Low
**Area:** Code Quality / Honesty
**Location:** `src/lib/ai-config.ts:1`

**Evidence:** The file's entire contents: `export const CLAUDE_MODEL = 'claude-sonnet-4-6';`. `grep -rn "CLAUDE_MODEL" src/` shows no importer. The only actual Anthropic call (`/api/star/claim/route.ts:54`) hardcodes `claude-haiku-4-5-20251001`.

**Impact:** An unused constant naming a different model (`sonnet-4-6`) than the one actually used (`haiku-4-5`) is a small honesty trap — a reader could believe Sonnet is in the loop.

**Recommendation:** Delete `src/lib/ai-config.ts`, or repurpose it as the single source of the haiku model id and import it in `star/claim`.

---

### Informational

---

### F-018 — Audit brief premises do not match repository reality

**Severity:** Informational
**Area:** Honesty
**Location:** audit brief vs repo

**Evidence:** The brief assumes: canonical URL `stellar.club` (appears in neither code nor README — code uses `stellarrclub.vercel.app`); GitHub `Rezimod/Stellar`; "README says Claude powers ASTRA + photo verification" (README explicitly and correctly credits OpenAI gpt-4o-mini for chat and Gemini 2.5 Flash for vision — `README.md:44,47,97`); Stars cap "30 grants × 500 = 15,000/day" (actual cap is `DAILY_STARS_CAP = 500`/wallet/day, `MONTHLY_STARS_CAP = 4000` — `stars-cap.ts:18-19`); design palette gold `#FFD166`/teal `#38F0FF`/Fraunces (actual: `#FFB347`/`#5EEAD4`/Orbitron).

**Impact:** None to the product — noted so findings are read against the code, not the brief's stale assumptions. Several "expected Critical" issues in the brief are non-issues here.

**Recommendation:** None. Reconcile pitch/audit materials with the canonical numbers in CLAUDE.md and `stars-cap.ts` before external review.

---

### F-019 — Build emits a non-fatal Privy optional-dependency warning

**Severity:** Informational
**Area:** Code Quality
**Location:** `npm run build` log; `src/components/providers/PrivyProvider.tsx`

**Evidence:** `Module not found: Can't resolve '@stripe/crypto'` traced through `@privy-io/react-auth/.../FiatOnrampScreen`. Build completes (`exit 0`, "Compiled with warnings").

**Impact:** Cosmetic; the fiat-onramp screen references an optional Stripe crypto module not installed. Does not break the build or runtime.

**Recommendation:** Ignore, or alias `@stripe/crypto` to an empty module in webpack/turbopack config (the repo already does this for `@farcaster/mini-app-solana`) to silence the warning.

---

## Phase-by-Phase Logs

### Phase 0 — Inventory

- **Commit:** `2c5a20d4c1da831baa07f09d0d96dd312b1f8a23`, branch `main`. Working tree clean except one untracked PNG (`social/x-posts/images/midday-draft-2026-06-17.png`).
- **Pages:** 32 `page.tsx` under `src/app/` (home, sky, missions, marketplace(+checkout), chat, nfts, observe flow ×5, profile, club, learn, feed, network, leaderboard, darksky, field, hub, earn, settings, solar-system, star(+[catalogId]), u/[wallet], proof, observations, contact, privacy, terms).
- **API routes:** 71 `route.ts` under `src/app/api/` — far more than CLAUDE.md documents (notably the `/api/agent/*` X/Twitter pipeline, `/api/wallet/fund`, `/api/stars/burn`, `/api/stars/sync`, `/api/sky/*` ×13, `/api/feed/*` ×8).
- **Stack:** Next.js `15.5.19`, React `19.2.3`, TypeScript strict `true` (`tsconfig.json`). `@solana/web3.js ^1.98.4`, `@metaplex-foundation/mpl-bubblegum ^4.4.0`, `@privy-io/react-auth ^3.19.0` + `server-auth ^1.32.5`, `openai ^6.34.0`, `@anthropic-ai/sdk ^0.78.0`, `drizzle-orm ^0.45.2`, `@neondatabase/serverless ^1.0.2`.
- **Env files:** `.env.example` (tracked, all-empty placeholders) and `.env.local` (gitignored). `.gitignore` line 37 = `.env*`, line 38 = `!.env.example`.
- **Schema (`src/lib/schema.ts`):** tables `users`, `telescopes`, `observation_log`, `email_subscribers`, `orders`, `stars_burns`, `redeem_codes`, `feed_posts`, `feed_reactions`, `feed_comments`, `feed_shares`, `feed_follows`, `market_cashouts` (← pivot remnant, F-005), `tweet_drafts`, `analytics_event`, `push_subscription`.
- **next.config.ts:** strong header set (HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy: camera=self, geolocation=self`, full CSP with `frame-ancestors 'none'`). Image `remotePatterns` allow-lists celestron/bresser/astroman/levenhuk. `reactCompiler:false`, `optimizePackageImports:['lucide-react']`.
- **middleware.ts:** no-op `NextResponse.next()` matching `/api/chat` + `/api/observe/verify` (rate limiting moved into handlers).

### Phase 1 — Static Analysis

- `npx tsc --noEmit` → **exit 0** (clean).
- `npm run build` → **exit 0**, "Compiled with warnings" (single Privy `@stripe/crypto` warning, F-019). `.next/` artifacts produced. No lint script in `package.json` (absent — noted).
- `npm audit` (prod) → 66 vulns: 14 low / 25 moderate / **27 high** (F-002).
- TODO/FIXME/HACK/ts-ignore markers in `src/`: **26**.
- `console.log|error|warn` in `src/app/api/`: **50** — all server-side logging (errors/warns + a few award/mint success logs that already truncate addresses, e.g. `recipient.slice(0,8)`); none leak secrets to clients.
- `any` annotations in `src/`: **1** (excellent for a strict codebase).
- `dangerouslySetInnerHTML`: **1** — `src/app/layout.tsx:113`, a static theme-bootstrap script with no user input (safe).
- Emoji in JSX chrome: region tabs + club CTAs (F-008).

### Phase 2 — Security (highlights)

- **Secrets:** No `NEXT_PUBLIC_*` exposure of any private key/secret. No private-key/API-key values in git history — only the empty `.env.example` placeholder `FEE_PAYER_PRIVATE_KEY=` appears. `FEE_PAYER_PRIVATE_KEY`, mint authority, and oracle keys are read only in `src/lib/*` and `src/app/api/*` (server). The two `star/*` page.tsx hits on `process.env.DATABASE_URL` are server components (no `'use client'`), legitimate.
- **AuthZ:** `/api/award-stars`, `/api/mint`, `/api/observe/log`, `/api/chat`, `/api/orders/confirm`, `/api/wallet/fund`, `/api/users/profile` (PUT) all verify a Privy Bearer token (or a valid wallet pubkey for mint's external-wallet path) and enforce `assertOwnsWallet` so wallet A cannot act for wallet B. Live probe confirmed **401** without a token (auth runs before body parsing — even malformed JSON returns 401, not 500).
- **Server-authoritative value:** `/api/award-stars` computes amounts from server data for quiz/find/check-in and requires the signed observation token for cosmic-bonus/weekly-challenge; clamps to `remainingStarsAllowance`; idempotency via a `pending`→`minted` ledger row keyed by `idempotencyKey`. `/api/observe/log` recomputes Stars from confidence and never trusts client `stars`.
- **Mint gate:** real mints require the HMAC observation token (`verifyObservationToken`) bound to wallet + file hash + confidence; demo mints are forced Common/≤50/Demo. Oracle hash re-derived server-side (current or previous hour slot accepted) — replay from an old night fails (slot mismatch). Caveat: cloud-cover input is client-trusted (F-004).
- **Payments:** `/api/orders/confirm` uses `validateTransfer` to check recipient + amount + reference (explicitly defends the "1-lamport with right reference" spoof). Stars-discount orders can't flip to paid until the SPL burn signature lands.
- **Redemption:** `/api/redeem-code/validate` is bearer-secret (till POS) gated, single-use via atomic conditional update, lazy expiry, 409 on concurrent spend.
- **Upload:** `/api/observe/verify` enforces image MIME, 10 KB–10 MB size bounds, and magic-byte checks (JPEG/PNG/WebP/HEIC) — not just `Content-Type`.
- **Agent/cron:** `/api/agent/*` approve/reject links are HMAC-signed with a 24–48 h time bucket (`agent-token.ts`, constant-time compare). `cron-auth` fails closed in production when `CRON_SECRET` is unset. `/api/wallet/fund` is hard-guarded to devnet RPC only.
- **Headers/CORS:** HSTS, frame-ancestors none, nosniff present. Only one `Access-Control-Allow-Origin: *` (F-012, public GET).

### Phase 3 — Smoke (local dev `:3137`)

| Surface | Result |
|---|---|
| `/ /sky /missions /marketplace /chat /nfts /leaderboard /field /profile` | HTTP 200, no dev-log errors/hydration warnings |
| `/darksky` | HTTP 307 (F-016) |
| `GET /api/products /api/leaderboard /api/sky/planets /api/price/sol` | HTTP 200 |
| `POST /api/award-stars` (no token, valid JSON) | **401** |
| `POST /api/chat` (no token) | **401** (even with malformed JSON — auth precedes parsing) |
| `POST /api/mint` (no token, `{}`) | **401** |

(An initial probe batch reported 400s; this was a shell-quoting artifact in the test harness — the corrected probe above confirms 401. Page render times shown by the probe are dev cold-compile, not production.)

### Phase 4 — UX / Design System

- **Fonts:** correct — `Orbitron`, `Geist`, `JetBrains_Mono`, `Noto_Sans_Georgian` loaded in `layout.tsx:3`, matching CLAUDE.md. No banned `Inter`/`Fraunces`/`Space Grotesk` in app code.
- **Palette:** live tokens are `--terracotta #FFB347` / `--seafoam #5EEAD4` — documentation drift (F-007), not a UI defect.
- **Banned patterns:** zero `background-clip:text` gradient text; zero `framer-motion`/`gsap` imports (the one `motion.` hit is a code comment about orbital motion). CSS-keyframe-only animation rule upheld.
- **Emoji:** violations in LocationPicker + club steps (F-008).
- **i18n:** `src/messages/en.json` and `ka.json` each have **1,100 leaf keys** — full EN/KA parity at the key level (the prior "~25%" figure is outdated). `useTranslations` used in 34 files. Per CLAUDE.md §4 some older surfaces still hardcode English in JSX, but the message catalogs are complete.

### Phase 5 — Business Logic

- **Stars caps:** `DAILY_STARS_CAP=500`, `MONTHLY_STARS_CAP=4000`, enforced across both earning pipelines via the shared `observation_log.stars` ledger (`stars-cap.ts`). Per-reason maxima derived from payout source and CI-tested (`award-stars-policy.ts`). Solid.
- **Photo verification:** Gemini prompt explicitly instructs rejection of screenshots/AI-art/wallpapers; ambiguous/unparseable responses fail closed to an *unverified* keepsake (0 Stars), never silently "verified". Pre-checks (hash dedup, EXIF GPS within 0.5°, ≤24 h age, reverse-image) run before the model call. Cloud-cover gate is the gap (F-004).
- **Mint rate limit:** Upstash 2/wallet/hour + DB "one cert mint per wallet+target/hour" + per-file-hash dedup. Survives restart (Redis + Postgres).
- **Oracle determinism:** SHA-256 of `lat.toFixed(4),lon.toFixed(4),cloudCover,hourSlot` — no `Date.now()`/`Math.random()` in the digest; hour-boundary handled by accepting current or previous slot.
- **NFT metadata:** `mint-nft.ts` uploads JSON to Irys (permanent) and falls back to a deterministic `${NEXT_PUBLIC_APP_URL}/m/o?...` query-string URI; the latter is Vercel-served (technically mutable/availability-dependent) but content is fully determined by the URL params.
- **Redemption rates:** the 100/GEL vs 4.69/GEL inconsistency (F-003).

### Phase 6 — Honesty

- ASTRA chat: `openai` SDK, model `gpt-4o-mini` (`chat/route.ts:1,29`). System prompt resists instruction-leak + impersonation; 2,000-char input cap, history capped to last 8 × 4,000 chars, Privy-gated, dual rate-limited.
- Photo verification: Gemini REST via `gemini-vision.ts` (no Anthropic). `@anthropic-ai/sdk` is imported in exactly one file — `star/claim/route.ts` — for `claude-haiku-4-5-20251001` name moderation, matching CLAUDE.md.
- README AI claims are accurate (F-018).
- "Verified" labeling: a non-screenshot/non-AI image defaults to `medium` confidence (accepted) even when night-sky characteristics are weak, but the pipeline never upgrades a rejected/unparseable result to "verified" — the honesty risk here is the cloud-cover gap (F-004), not mislabeling.
- AR scale: `src/lib/sky/ar.ts` `effectiveFov` now uses correct pinhole geometry (diagonal FOV split by aspect ratio) with clamps only at 20°/120° sanity bounds — the previously-flagged 22% portrait inflation is **resolved** (not a finding).

### Phase 7 — Performance

- Lighthouse: not installed locally — **skipped** (per the no-install rule).
- Bundle: shared baseline 105 kB (good); page-specific bloat on `/sky` (559 kB) and the marketplace/missions/learn/feed/profile cluster (372–437 kB) — F-009.

---

## What is NOT a Finding (verified correct)

- No secrets in the working tree or git history; `.env*` is gitignored, only empty `.env.example` committed.
- README accurately credits OpenAI (chat) + Gemini (vision) + Claude Haiku (moderation) — no AI-provider dishonesty.
- All value-bearing API routes enforce Privy auth and return 401 without a token (confirmed live).
- `assertOwnsWallet` prevents one session from awarding/minting to a wallet it doesn't own.
- `/api/award-stars` amounts are server-authoritative with idempotency + unified daily/monthly caps.
- `/api/observe/log` recomputes Stars server-side and never trusts client `stars`.
- Mint requires an HMAC verification token bound to wallet + fileHash + confidence; oracle hash re-derived server-side; replay-resistant by hour slot.
- `/api/orders/confirm` validates transfer recipient + amount (defeats the 1-lamport reference spoof).
- Redeem codes are single-use via atomic conditional update with lazy expiry.
- Photo upload validates magic bytes + size bounds, not just `Content-Type`.
- HMAC X-agent links are time-bucketed and constant-time compared.
- `cron-auth` fails closed in production; `/api/wallet/fund` is devnet-hard-guarded.
- Strong security headers (HSTS preload, frame-ancestors none, nosniff, Referrer-Policy, Permissions-Policy).
- TypeScript strict; `tsc --noEmit` clean; production build passes; only 1 `any` in `src/`.
- No `framer-motion`/`gsap`; no gradient-text; CSS-keyframe animation only.
- Fonts match the documented Orbitron/Geist/JetBrains/Noto stack.
- i18n EN/KA message catalogs at full key parity (1,100 each).
- `src/lib/sky/ar.ts` FOV math is sound; the prior 22% portrait inflation is fixed.
- Only `dangerouslySetInnerHTML` use is a static, input-free theme bootstrap.

---

## Recommended Fix Order

1. **F-001** — Switch CSP to nonce-based `script-src`; drop `'unsafe-inline'` (and `'unsafe-eval'` if dependencies allow). Highest security ROI, no feature work.
2. **F-004** — Fetch cloud cover server-side at verify, sign it into the observation token, enforce/relabel at mint. Closes the one real "verified" honesty gap before any pitch.
3. **F-003** — Reconcile the Stars↔GEL rates to a single canonical Star value. Do before any investor/grant economic review.
4. **F-018 / F-006 / F-007** — Align README URL, CLAUDE.md palette, and pitch numbers (caps) with code reality. Cheap, removes credibility traps a reviewer hits first.
5. **F-005** — Delete `market_cashouts` table + `.mkt-*`/`.stl-odds-*` CSS + "prediction markets" comment.
6. **F-017** — Delete or correct `ai-config.ts`.
7. **F-010** — Use `timingSafeEqual` for the observation-token HMAC compare (one-line, matches existing pattern).
8. **F-002** — Triage `npm audit` highs; override-pin `ws`; document `bigint-buffer` as accepted transitive risk in `SECURITY.md`. Gate the mainnet milestone on this.
9. **F-008** — Replace UI-chrome emoji with SVG icons.
10. **F-015** — Back the `find:` reward with a server-verifiable signal.
11. **F-013 / F-014** — Rate-limit + bind `/api/push/subscribe`; document `ASTROMAN_TILL_SECRET`.
12. **F-009 / F-011** — Dynamic-import Three.js/Leaflet on `/sky`; convert static `<img>` to `next/image`. Re-measure First Load.
13. **F-016** — Confirm `/darksky` 307 terminates at 200 / is intentional.
14. **F-019** — Alias `@stripe/crypto` to silence the build warning.
