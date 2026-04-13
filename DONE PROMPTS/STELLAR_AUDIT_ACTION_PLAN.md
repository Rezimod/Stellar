# STELLAR — Copilot Audit Action Plan
## Cross-Referenced Analysis + Execution Prompts

**Date:** April 13, 2026
**Source:** Colosseum Copilot Deep Audit Report (April 13, 2026)
**Cross-referenced against:** Live codebase at github.com/Rezimod/Stellar (64 commits, main branch)
**Deadline:** May 11, 2026 (28 days remaining)

---

## PART 1 — AUDIT FINDINGS vs CURRENT CODEBASE STATE

### What the audit found vs what's actually in the repo right now

| Audit Finding | Audit Priority | Current Codebase State | Action Needed? |
|---|---|---|---|
| **Leaderboard is static mock data** | P1 (Critical) | `/leaderboard` page exists but queries are hardcoded. DB has `observation_log` table but leaderboard route returns mock. | **YES — must fix before demo** |
| **Stars award atomicity gap** | P1 | `/api/observe/verify` returns `starsAwarded` but SPL mint happens in `/api/observe/log`. Race condition if client crashes between calls. | **YES — needs atomic flow** |
| **Remove `@metaplex-foundation/js`** | P1 | `package.json` still has `"@metaplex-foundation/js": "^0.20.1"` — confirmed in live repo. The project uses Umi/Bubblegum for all actual minting. 300KB unused bloat. | **YES — 5 minute fix** |
| **Next.js version 16.1.6** | P1 | `package.json` shows `"next": "16.1.6"`. This is an unusual/unstable version. Should be pinned to stable 15.x. | **YES — critical stability fix** |
| **Collection NFTs minted `verified: false`** | P2 | `mint-nft.ts` line ~46 has `verified: false` on collection field. NFTs don't show as verified collection items on explorers. | **YES — correctness fix** |
| **Fallback analysis accepts with `low` confidence** | P2 | `FALLBACK_ANALYSIS` in verify route sets `hasNightSkyCharacteristics: true`. Claude API failure = loophole to earn stars. | **YES — 15 min security fix** |
| **DB schema missing columns** | P2 | `observation_log` lacks `lat`, `lon`, `identified_object`, `stars_awarded` columns. Only `wallet`, `target`, `stars`, `confidence`, `mint_tx`. | **YES — schema migration** |
| **Observation count in leaderboard** | P2 | Leaderboard doesn't surface observation count alongside stars. | **YES — ties into leaderboard fix** |
| **In-memory rate limiting** | P2 (noted) | `middleware.ts` uses in-memory rate limiter. Vercel cold starts reset it. | **LOW — acceptable for hackathon** |
| **`@solana/web3.js` v1 alongside Umi** | P2 (tech debt) | Both present. Umi uses v2 internally. Type conflicts possible. | **LOW — don't touch before demo** |
| **No wallet address in observations** | P2 | Schema stores `wallet` but not lat/lon/object. | **YES — ties into schema fix** |
| **GPS spoofing unmitigated** | Noted | Acknowledged in audit. Double-capture partially mitigates. | **NO — document in README, don't try to solve** |
| **Single-image path weaker** | Noted | By design — "be generous with phone photos" is intentional UX. | **NO — acceptable tradeoff** |
| **Demo script dry-run** | P2 | README has 10-step demo. Needs real-device timing test. | **YES — manual testing, not code** |
| **Streak calculation ad-hoc** | P3 | Calculated per request, no DB column. | **SKIP — nice to have** |
| **Dark sky map: real user contributions** | P3 | Currently 6 hardcoded Georgian locations. | **SKIP — post-hackathon** |
| **Push notifications** | P3 | Not built. | **SKIP** |
| **Farcaster Frame endpoint** | P3 | OG metadata tags exist. Endpoint not built. | **SKIP — tags are enough** |

### README is outdated

The live README on GitHub still says:
- "Next.js 16 + React 19" — needs correction
- "Phantom Wallet" — Privy replaced this months ago
- "FarmHawk satellite weather verification" — removed, now Sky Oracle
- Deploy URL: "proof-of-observation.vercel.app" — should be "stellarrclub.vercel.app"
- Hackathon: "Vibecoding From 0 · Superteam Georgia × CyreneAI · March 14-15, 2026" — needs to say Colosseum Frontier

Wait — the README visible at the top-level GitHub page (the short one) is different from the longer README also in the repo. The short README is the old Superteam hackathon one. The longer updated README is also present. **The old README needs to be fully replaced with the updated version, or deleted.**

---

## PART 2 — STRATEGIC ANALYSIS OF AUDIT OPPORTUNITIES

### What to amplify from the audit's Section 6

**DePIN reframe (6.1):** The audit correctly identifies that Stellar's dark sky data + verified observations = a DePIN network. However, the dark sky page is currently static hardcoded data. For hackathon, this is a narrative claim — you can mention it in the pitch without building the full pipeline. The 6 seeded Georgian locations are enough to show the concept.

**Arcade token positioning (6.2):** This is a pitch-narrative task, not a code task. In your submission text and pitch video, explicitly use the phrase "arcade token" when describing Stars. Reference the a16z paper framing. Judges who've read it will recognize the pattern instantly.

**ASTRA as standalone product (6.4):** This is post-hackathon scope. Don't build a Telegram bot now. But worth one sentence in the pitch: "ASTRA can be deployed standalone as a Telegram bot for 10M+ amateur astronomers who just want tonight's sky answer."

### What the audit validates that you should lean into

1. **Zero competition** — 5,400+ Colosseum submissions, zero astronomy. This is your strongest pitch slide.
2. **Founder-market fit** — 60K followers, physical store, existing revenue. Pitch this first.
3. **Compressed NFT economics** — $0.000005/mint. This answers "why Solana?" in one number.
4. **Multi-layer verification** — Claude Vision + sky oracle + astronomy cross-check + double capture. Most sophisticated anti-cheat in any consumer hackathon project.

---

## PART 3 — PHASED EXECUTION PROMPTS

### Phase structure:
- **Phase A (Days 1-2):** Critical fixes from P1 — things that would embarrass during demo
- **Phase B (Days 3-4):** Data integrity + correctness from P2
- **Phase C (Day 5):** README + submission materials
- **Phase D (Days 6-7):** Demo hardening + dry run

Each prompt is designed for one Claude Code conversation. Run in order. Each depends on the previous.

---

## PHASE A — CRITICAL DEMO BLOCKERS (Days 1-2)

---

### PROMPT A1 — Remove Legacy Dependency + Fix Next.js Version

```
I'm building Stellar, a Next.js astronomy app for the Colosseum Frontier hackathon. I need to clean up two critical dependency issues flagged in an audit.

Read package.json before making changes.

Step 1 — Remove unused legacy Metaplex SDK:
The project uses @metaplex-foundation/mpl-bubblegum + umi for all NFT minting. The old @metaplex-foundation/js (v0.20.1) is never imported anywhere in the codebase. It adds ~300KB to the bundle.

Action:
- Search the entire src/ directory for any import from '@metaplex-foundation/js'. If found, do NOT remove the package — report back.
- If no imports found: remove it from package.json dependencies.

Step 2 — Fix Next.js version:
package.json currently has "next": "16.1.6" which is an unstable/pre-release version. The project should be on the latest stable 15.x release.

Action:
- Change "next": "16.1.6" to "next": "^15.3.0"
- Check if any code in the project uses Next.js 16-specific APIs (unlikely but verify). Search for:
  - 'use cache' directive
  - Any import from 'next/cache' that doesn't exist in 15.x
  - dynamicIO config option in next.config.ts
  If any of these are found, report them — do not change the version.

Step 3 — Verify build:
Run: npm install && npm run build
If there are type errors or build failures, fix them. If the build passes, we're done.

Do NOT change any other files. Do NOT update any other packages.
```

---

### PROMPT A2 — Wire Real Leaderboard to Database

```
I'm building Stellar. The /leaderboard page currently shows hardcoded mock data. I need to wire it to real data from the observation_log database table. This is the single biggest credibility gap for demo day — if a judge opens this page and sees fake names, the project looks unfinished.

Read these files fully before writing anything:
  src/app/leaderboard/page.tsx
  src/app/api/observe/log/route.ts (to understand observation_log schema)
  src/lib/db.ts or src/db/ (to understand Drizzle schema and connection)
  src/app/profile/page.tsx (to understand how wallet → display name works)

---

Step 1 — Understand the current schema:
The observation_log table has at minimum: id, wallet, target, stars, confidence, mint_tx, created_at.
There is likely a users table with: wallet/privy_id, display_name or email.

If the schema doesn't have a users table, we'll use truncated wallet addresses as display names.

Step 2 — Create or update src/app/api/leaderboard/route.ts:

GET handler accepting query param: period = 'week' | 'month' | 'all' (default: 'all')

Logic:
1. Build date filter:
   - week: created_at > NOW() - INTERVAL '7 days'
   - month: created_at > NOW() - INTERVAL '30 days'
   - all: no date filter

2. Query observation_log:
   SELECT wallet,
          COUNT(*) as observation_count,
          COALESCE(SUM(stars), 0) as total_stars
   FROM observation_log
   WHERE confidence != 'rejected'
     AND [date filter if applicable]
   GROUP BY wallet
   ORDER BY total_stars DESC
   LIMIT 50

3. For each row, try to get display name:
   - If users table exists with a name/display_name column: LEFT JOIN
   - If not: use wallet address truncated (first 4 + "..." + last 4 chars)

4. Return JSON array:
   [
     {
       rank: 1,
       wallet: "ABC...XYZ",
       displayName: "Rezi" or "ABC...XYZ",
       observationCount: 12,
       totalStars: 850,
       isCurrentUser: false  // set true if wallet matches query param ?viewer=<wallet>
     }
   ]

Set Cache-Control: public, s-maxage=60, stale-while-revalidate=300

Step 3 — Update src/app/leaderboard/page.tsx:

Remove ALL hardcoded mock data arrays.

Add state:
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all')
  const [loading, setLoading] = useState(true)

On mount and when period changes: fetch /api/leaderboard?period=${period}&viewer=${walletAddress}

Preserve the existing UI design (podium for top 3, list for rest, time filter tabs). Just replace the data source.

Handle empty state: If leaders array is empty, show:
  "No observations yet. Be the first — complete a sky mission!"
  Button → /missions

If the current user is in the list, highlight their row with a subtle teal left border.

Step 4 — Edge case: If the leaderboard query fails (DB not connected, no observations), show a graceful empty state — NOT fake data. Never fall back to mock data.

Do NOT modify the observation_log schema.
Do NOT modify any other pages.
```

---

### PROMPT A3 — Fix Stars Award Atomicity

```
I'm building Stellar. There's a race condition in the observation reward flow flagged by an audit:

Current flow:
1. Client calls POST /api/observe/verify → returns { starsAwarded: N }
2. Client shows "you earned N stars!" to user
3. Client calls POST /api/observe/log → this route actually mints SPL tokens

Problem: If the client crashes, loses connection, or the user navigates away between steps 2 and 3, the user sees stars they never received on-chain.

Read these files fully before writing anything:
  src/app/api/observe/verify/route.ts
  src/app/api/observe/log/route.ts
  src/app/api/award-stars/route.ts
  src/components/sky/MissionActive.tsx (the mission flow component)
  src/lib/solana.ts

---

The fix: Make the log route the single source of truth for star awards.

Step 1 — Update src/app/api/observe/log/route.ts:

After the existing DB insert logic, add SPL token award in the SAME try/catch:

a. After inserting to observation_log, call the award-stars logic directly (not via HTTP):
   - Import the same SPL minting logic used in /api/award-stars
   - Award stars amount = the value from the request body
   - If SPL mint fails: log the error, but still return success with { starsAwarded: N, starsMinted: false, mintError: "..." }
   - If SPL mint succeeds: return { starsAwarded: N, starsMinted: true, starsTxId: "..." }

b. Add a stars_awarded column to the DB insert if not already present:
   - If the column doesn't exist in the schema, add it via Drizzle schema update
   - Write the actual awarded amount to this column

Step 2 — Update src/app/api/observe/verify/route.ts:

Change the response: instead of returning starsAwarded as a final number, return starsEstimate:
  - Rename the field from starsAwarded to starsEstimate in the response JSON
  - Add a comment: // Stars are minted in /api/observe/log, not here

Step 3 — Update src/components/sky/MissionActive.tsx:

Find where the verify response is handled and stars are shown to the user.
If the component shows "You earned X stars!" immediately after verify:
  - Change the copy to show it as pending: "~X Stars" or show a muted version
  - After the log call succeeds, update to the confirmed amount with a checkmark

If the component already waits for the log response before showing stars:
  - No change needed, just verify this is the case

Step 4 — Ensure /api/observe/log has retry-safe behavior:

Add an idempotency check: before inserting a new observation_log row, check if a row with the same wallet + target + created_at within 60 seconds already exists. If so, return the existing row's data (don't mint SPL again, don't insert duplicate).

This prevents double-awards if the client retries the log call.

Do NOT change the SPL minting logic itself.
Do NOT change /api/award-stars route (it may still be used by the mission completion flow separately).
```

---

## PHASE B — DATA INTEGRITY + CORRECTNESS (Days 3-4)

---

### PROMPT B1 — Harden Fallback Analysis + Fix Collection Verification

```
I'm building Stellar. Two security/correctness issues from an audit need fixing.

Read these files before writing:
  src/app/api/observe/verify/route.ts
  src/lib/mint-nft.ts

---

Issue 1 — Fallback analysis is a loophole:

In src/app/api/observe/verify/route.ts, find the FALLBACK_ANALYSIS constant or object. It's used when the Claude API call fails. Currently it sets:
  hasNightSkyCharacteristics: true
  isScreenshot: false

This means if Claude API is down, ANY photo gets accepted with 'low' confidence and earns stars. This is a security hole.

Fix:
- Change FALLBACK_ANALYSIS to:
  hasNightSkyCharacteristics: false
  isScreenshot: true
  confidence: 'rejected'
  identifiedObject: 'unknown'
  reasoning: 'Verification service temporarily unavailable. Please try again.'

- In the code that uses FALLBACK_ANALYSIS, ensure it returns starsEstimate: 0 (or starsAwarded: 0)
- The response should still be HTTP 200 (not 500) so the client can show a user-friendly message
- Add a field to the response: verificationFailed: true so the client can show "Verification unavailable, try again later"

Issue 2 — Collection NFTs minted with verified: false:

In src/lib/mint-nft.ts, find the mintV1 call. The collection field has:
  collection: { key: toPublicKey(COLLECTION_MINT_ADDRESS), verified: false }

This means minted NFTs don't appear as verified collection items on Solana explorers.

The correct fix depends on the Bubblegum SDK version. Check which approach is available:

Option A (preferred): If mpl-bubblegum exports a verifyCollection or setAndVerifyCollection function:
  - After mintV1 succeeds, call verifyCollection with the collection authority (fee payer)
  - The fee payer must be the collection's update authority for this to work

Option B: If the collection was created with the fee payer as update authority (check setup-bubblegum.ts):
  - Change verified: false to verified: true in the mintV1 call
  - Note: This only works if Bubblegum SDK version supports it and the signer has authority

Option C (safest): If neither A nor B works:
  - Leave as verified: false
  - Add a code comment explaining why
  - This is acceptable for devnet demo — judges won't check collection verification status on devnet

Read scripts/setup-bubblegum.ts to check if the collection mint's update authority is the fee payer.
Report which option you used and why.
```

---

### PROMPT B2 — Expand Database Schema

```
I'm building Stellar. The observation_log schema needs additional columns for richer querying and leaderboard accuracy.

Read these files before writing:
  src/db/ or src/lib/db.ts (find the Drizzle schema definition)
  src/app/api/observe/log/route.ts (the route that inserts observations)

---

Step 1 — Add columns to the Drizzle schema for observation_log:

Add these columns (with defaults so existing rows aren't broken):
  lat: doublePrecision('lat')                    // nullable, default null
  lon: doublePrecision('lon')                    // nullable, default null  
  identified_object: text('identified_object')   // nullable — what Claude identified
  stars_awarded: integer('stars_awarded')         // nullable — actual SPL tokens minted
  oracle_hash: text('oracle_hash')               // nullable — sky verification hash

Do NOT rename or remove any existing columns.
Do NOT change column types of existing columns.

Step 2 — Update src/app/api/observe/log/route.ts:

Find the INSERT statement. Add the new columns to the insert:
  lat: body.lat ?? null
  lon: body.lon ?? null
  identified_object: body.identifiedObject ?? body.target ?? null
  stars_awarded: body.stars ?? null
  oracle_hash: body.oracleHash ?? null

The request body should already contain these fields from the client (MissionActive.tsx sends them). If any field is missing from the request, use null — don't fail.

Step 3 — Push schema:

After editing the Drizzle schema, the user will need to run:
  npm run db:push

Add a comment at the top of the schema file noting these columns were added for the audit fix.

Step 4 — Update the leaderboard API (from Prompt A2):

If the leaderboard route doesn't already use stars_awarded, update it:
  - Use COALESCE(SUM(stars_awarded), SUM(stars), 0) as total_stars
  This prefers the actual minted amount over the estimated amount.

Do NOT modify any frontend files.
Do NOT modify the observation verify route.
```

---

### PROMPT B3 — Update Observation Log Route to Populate New Columns

```
I'm building Stellar. After expanding the DB schema (Prompt B2), I need the client to pass the additional data fields through to the log endpoint.

Read these files:
  src/components/sky/MissionActive.tsx (find where /api/observe/log is called)
  src/app/api/observe/log/route.ts (verify it accepts the new fields)

---

Step 1 — Find the fetch call to /api/observe/log in MissionActive.tsx:

The body should already include target, stars, wallet, confidence, and mint_tx.
Add these fields to the body (they should already be available in the component state):
  lat: coords?.lat ?? null
  lon: coords?.lon ?? null
  identifiedObject: verifyResult?.identifiedObject ?? mission.name
  oracleHash: sky?.oracleHash ?? null

If coords, verifyResult, or sky aren't in scope where the log call is made, trace back where they're defined and pass them through.

Step 2 — Verify the log route accepts and stores them:

Check that /api/observe/log/route.ts destructures these from the body and includes them in the DB insert (should already be done in Prompt B2).

If any field mapping is wrong (e.g., the client sends identifiedObject but the DB column is identified_object), fix the mapping in the route handler.

Step 3 — Test scenario:
After this change, a completed observation should produce an observation_log row with:
  wallet: user's wallet address
  target: mission name
  stars: estimated stars
  stars_awarded: actual SPL tokens minted (if Prompt A3 is done)
  confidence: 'high' | 'medium' | 'low'
  mint_tx: Solana transaction hash
  lat: user's latitude
  lon: user's longitude
  identified_object: what Claude identified in the photo
  oracle_hash: sky oracle SHA-256 hash

Do NOT change the observation flow UI.
Do NOT change the verify route.
```

---

## PHASE C — README + SUBMISSION MATERIALS (Day 5)

---

### PROMPT C1 — Rewrite README for Colosseum Frontier Submission

```
I'm building Stellar for the Colosseum Frontier 2026 hackathon. The README on GitHub needs to be rewritten for the submission. The current README has outdated information (references Phantom wallet, FarmHawk, old hackathon name, wrong deploy URL).

Read:
  README.md (the current one at repo root)
  src/app/ directory listing (to verify all pages mentioned actually exist)
  package.json (for accurate dependency list)

---

Rewrite README.md with this structure:

1. TITLE + ONE-LINER
   # Stellar — Observe the Sky, Earn on Solana
   > The astronomy app that turns every telescope session into a verified on-chain discovery.

2. WHAT IT DOES (4-5 sentences max)
   - Observe → Capture → Verify → Earn → Spend loop
   - Privy embedded wallets, no crypto visible to users
   - Stars SPL token + compressed NFT proof per observation
   - AI verification via Claude Vision + sky oracle cross-check
   - Real rewards redeemable at Astroman.ge (Georgia's first astronomy store)

3. WHY SOLANA (3 bullets)
   - Compressed NFTs at ~$0.000005/mint via Metaplex Bubblegum
   - SPL tokens for verifiable on-chain rewards
   - Privy embedded wallets = email signup, zero friction

4. FOUNDER-MARKET FIT (short paragraph)
   Built by Rezi Modebadze, founder of Astroman.ge — 60K+ social followers, physical store in Tbilisi, established telescope dealer. First 100 users come from existing customers. Not a hackathon project — a real business adding a crypto layer.

5. TECH STACK (table format, accurate to current package.json)
   - Next.js 15 (NOT 16) + React 19 + TypeScript + Tailwind CSS 4
   - Privy SDK (NOT Phantom)
   - Metaplex Bubblegum + Umi (NOT @metaplex-foundation/js)
   - @solana/spl-token for Stars
   - Claude API for ASTRA + photo verification
   - Open-Meteo (NOT FarmHawk) + astronomy-engine
   - Neon serverless Postgres + Drizzle ORM
   - Vercel

6. SCREENSHOTS section (placeholder: "> Screenshots will be added before final submission")

7. LIVE DEMO link: stellarrclub.vercel.app (NOT proof-of-observation.vercel.app)

8. HOW TO RUN LOCALLY (keep the existing setup:bubblegum and setup:token scripts)

9. DEMO SCRIPT (the 10-step, 3-minute version from PROJECT_INFO.md)

10. PROJECT STRUCTURE (simplified src/ tree — only app/ routes and key lib/ files)

11. ENVIRONMENT VARIABLES (the full .env.example list)

12. HACKATHON section:
    Colosseum Frontier 2026 (April 6 – May 11, 2026)
    Consumer Track
    Built by Rezi Modebadze (@StellarClub26 on X)

Remove ALL references to:
  - FarmHawk
  - Pollinet  
  - Phantom Wallet
  - CyreneAI
  - "Vibecoding From 0"
  - "Superteam Georgia" (as the hackathon — you can mention Superteam as a community)
  - proof-of-observation.vercel.app
  - Next.js 16

The README should read like a startup project page, not a tutorial. Concise, confident, investor-readable.
```

---

### PROMPT C2 — Pitch Narrative Script (3 Minutes)

```
I'm building Stellar for the Colosseum Frontier 2026 hackathon. I need a 3-minute pitch video script.

Context from copilot audit:
- Zero direct competition in 5,400+ Colosseum submissions — no astronomy project on any chain
- Stars token is an "arcade token" (a16z framing): non-speculative, earned through real activity, spent on real goods
- Founder-market fit: 60K followers, physical store, existing revenue
- Compressed NFTs at $0.000005/mint is the Solana justification
- Multi-layer verification (Claude Vision + sky oracle + astronomy cross-check + double capture) is the most sophisticated anti-cheat in any consumer hackathon project

Key judge questions to preemptively answer:
- "Who are your users?" → Active telescope owners, 10M globally, 60K already following Astroman
- "Why Solana?" → Compressed NFT economics, Privy email login, gasless
- "What prevents cheating?" → Multi-layer verification system
- "How do you make money?" → Astroman already makes money. Stellar drives traffic.
- "Is there competition?" → Zero on any chain.

---

Write a pitch script with these sections:

HOOK (15 seconds):
Start with the problem. "There are 10 million active amateur astronomers worldwide. They buy $500 telescopes, spend hours under the stars, and have nothing to show for it except memories. No proof. No rewards. No community incentive."

SOLUTION (30 seconds):
"Stellar changes that. Open the app, check tonight's sky, go outside, photograph what you see. Our AI verifies it's real — real sky, real object, real location, right now. You earn Stars tokens and a compressed NFT sealed on Solana."

WHY SOLANA (20 seconds):
Lead with the number: "$0.000005 per NFT mint. We can stamp every observation a user ever makes for less than a penny total. Users sign up with email — Privy creates their wallet invisibly. They never see a seed phrase, never buy SOL, never know they're on Solana until they check Explorer."

DEMO WALKTHROUGH (60 seconds):
Walk through the live app: signup → sky forecast → start mission → take photo → verification → NFT minted → see it in gallery → ASTRA chat → Stars balance

DISTRIBUTION ADVANTAGE (30 seconds):
"I'm Rezi. I built Astroman.ge — Georgia's first astronomy store. 60,000 followers. A physical retail location in Tbilisi. My customers already buy telescopes from me. Now they earn Stars for using them and spend those Stars back in my store. That's not a theoretical token model — it's happening."

MARKET + EXPANSION (15 seconds):
"Zero direct competition on any chain. The astronomy app market is entirely Web2. We're expanding dealer partnerships — Celestron for the US, Bresser for Europe. Same model, more stores."

CLOSE (10 seconds):
"Stellar. Observe the sky. Earn on Solana. Try it now at stellarrclub.vercel.app."

Format as a readable script with timing markers. Keep total under 3:00.
Do not create a file — output this as text in the conversation.
```

---

## PHASE D — DEMO HARDENING (Days 6-7)

---

### PROMPT D1 — Fix SOL Price Display Confusion in Marketplace

```
I'm building Stellar. The marketplace shows SOL prices on product cards alongside GEL prices, but payment is GEL-only (external link to astroman.ge). An audit flagged this as confusing for judges — they might think SOL payment is implemented when it's not.

Read:
  src/app/marketplace/page.tsx
  src/lib/products.ts (or wherever product data is defined)
  src/app/api/price/sol/route.ts (the SOL price endpoint)

---

Option A (preferred — simplest):
Remove SOL price display from product cards entirely. Show only GEL price.
Keep the /api/price/sol route (it may be used elsewhere).
In the product card, if there's a SOL price display, remove it or replace with:
  "Ships from Astroman.ge" in muted text.

Option B (if SOL display is deeply integrated):
Add a small "Price shown for reference only — payment via astroman.ge" disclaimer at the bottom of the marketplace page.

Apply whichever option requires fewer changes.

Do NOT modify the product data structure.
Do NOT remove the price API route.
```

---

### PROMPT D2 — End-to-End Demo Flow Smoke Test Fixes

```
I'm building Stellar. I need to ensure the 3-minute demo script runs without errors. This prompt identifies and fixes any remaining UI issues a judge would hit during the demo path.

Read these files:
  src/app/page.tsx (home — first thing judges see)
  src/app/sky/page.tsx (sky forecast)
  src/app/missions/page.tsx (mission list)
  src/components/sky/MissionActive.tsx (observation flow)
  src/app/nfts/page.tsx (NFT gallery)
  src/app/chat/page.tsx (ASTRA)
  src/app/profile/page.tsx (profile)
  src/app/marketplace/page.tsx (store)

For each page, check:

1. Does it render without errors when unauthenticated?
   - Pages that need auth should show a clean sign-in prompt, NOT a blank screen or error
   - Pages that work without auth (home, sky, marketplace) should render fully

2. Are there any references to removed features?
   - Any mention of "FarmHawk", "Pollinet", "CyreneAI" → remove
   - Any import from farmhawk.ts or pollinet.ts → remove
   - Any reference to "Phantom" wallet → change to Privy

3. Loading states:
   - Every page that fetches data should have a loading skeleton or spinner
   - No page should show a blank white screen while loading

4. Empty states:
   - NFT gallery with zero NFTs → should show "No observations yet" card
   - Leaderboard with zero entries → should show "Be the first" card
   - Profile with zero Stars → should show "0 ✦" not an error

5. Navigation consistency:
   - All pages accessible from nav bar
   - Bottom nav on mobile has correct 5 tabs
   - No dead links (404 pages)

6. The /darksky page:
   - Currently hardcoded 6 locations — that's fine
   - Make sure it doesn't 404 or show a blank screen

For any issue found: fix it. Keep changes minimal — this is a polish pass, not a rewrite.
Report all changes made as a summary at the end.
```

---

### PROMPT D3 — Add .env.example File

```
I'm building Stellar. The repo needs a .env.example file so judges can understand what environment variables are needed.

Read:
  package.json (for setup script references)
  src/app/api/ directory (scan route files for process.env.* references)
  src/lib/ directory (scan for process.env.* references)
  next.config.ts (for any env configuration)

---

Create .env.example at the repo root with every environment variable used in the project.

Format each variable with:
  - The variable name
  - An empty value or placeholder
  - A comment explaining what it is and where to get it

Group by category:

# === Auth ===
NEXT_PUBLIC_PRIVY_APP_ID=           # Privy dashboard → App ID

# === AI ===
ANTHROPIC_API_KEY=                  # Anthropic console → API Keys

# === Database ===
DATABASE_URL=                       # Neon dashboard → Connection string

# === Solana ===
SOLANA_RPC_URL=https://api.devnet.solana.com   # Or Helius RPC URL
FEE_PAYER_PRIVATE_KEY=              # Base58 encoded — run setup scripts to generate
MERKLE_TREE_ADDRESS=                # Set by: npm run setup:bubblegum
COLLECTION_MINT_ADDRESS=            # Set by: npm run setup:bubblegum
STARS_TOKEN_MINT=                   # Set by: npm run setup:token

# === Public (exposed to client) ===
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=  # Same as COLLECTION_MINT_ADDRESS
NEXT_PUBLIC_HELIUS_RPC_URL=           # helius.dev → free tier RPC
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
NEXT_PUBLIC_SUPABASE_URL=             # Only if dark sky features are enabled
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Only if dark sky features are enabled

# === Optional ===
INTERNAL_API_SECRET=                  # Server-to-server auth for /api/mint
SUPABASE_SERVICE_ROLE_KEY=            # Only for dark sky Bortle analysis

Scan for ANY process.env reference I might have missed. Include all of them.
Do not create any other files.
```

---

## PHASE E — OPTIONAL ENHANCEMENTS (Only if Phases A-D complete with days to spare)

---

### PROMPT E1 — Dark Sky Map: Wire to Real User Data

```
I'm building Stellar. The /darksky page currently shows 6 hardcoded Georgian locations. I want to wire it so that when a user completes a mission, their observation location + sky conditions are added to the map data.

This is OPTIONAL — only run if Phases A-D are complete and working.

Read:
  src/app/darksky/page.tsx
  src/app/api/observe/log/route.ts (now has lat/lon columns from Prompt B2)

---

Step 1 — Create src/app/api/darksky/data/route.ts:

GET handler. No auth required.

Query observation_log for all rows where lat IS NOT NULL and lon IS NOT NULL:
  SELECT lat, lon, target, confidence, created_at
  FROM observation_log
  WHERE lat IS NOT NULL AND lon IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 500

Also include the 6 hardcoded Georgian seed locations as fallback (so the map isn't empty even with zero observations).

Return GeoJSON:
{
  type: "FeatureCollection",
  count: N,
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { target, confidence, created_at, source: "observation" }
    }
  ]
}

For the 6 seed locations, set source: "seed".

Cache-Control: public, s-maxage=120, stale-while-revalidate=600

Step 2 — Update src/app/darksky/page.tsx:

Replace the hardcoded locations array with a fetch to /api/darksky/data on mount.
Keep the existing map visualization (whether it's SVG, Leaflet, or static).
Show a count badge: "X observations from Y locations"
If fetch fails, fall back to the 6 hardcoded locations.

Do NOT add Supabase. Use the existing Neon/Drizzle database.
Do NOT add Leaflet if it's not already in use on this page.
Keep changes minimal.
```

---

### PROMPT E2 — Improve ASTRA System Prompt with Audit Insights

```
I'm building Stellar. The ASTRA AI companion should reference the project's unique positioning identified in the copilot audit.

Read src/app/api/chat/route.ts — find the system prompt.

---

Update the ASTRA system prompt to include:

1. Add to the existing prompt (don't replace, append):
   "You can tell users these facts about Stellar when relevant:
   - Stellar is the only astronomy app on any blockchain. There are zero competitors.
   - Each observation proof costs ~$0.000005 to mint as a compressed NFT on Solana.
   - Stars tokens work like arcade tokens — earned for real activity, spent on real gear from partner stores.
   - The verification system uses multiple layers: AI image analysis, sky oracle weather cross-check, and astronomy position verification.
   - Stellar is built by the founder of Astroman.ge, Georgia's first astronomy store with 60,000+ followers."

2. Add a Stellar-specific instruction:
   "When users ask 'what is Stellar?' or 'how does this work?', give a concise 2-3 sentence answer about the observe-verify-earn loop, then offer to help them with tonight's sky."

3. Keep ALL existing tool definitions and streaming logic unchanged.

Only modify the system prompt string. Do not touch any other part of the route.
```

---

## EXECUTION CHECKLIST

Run prompts in this order. Check off each as you go:

### Phase A — Critical (Days 1-2)
- [ ] A1: Remove @metaplex-foundation/js + fix Next.js version
- [ ] A2: Wire real leaderboard
- [ ] A3: Fix Stars award atomicity

### Phase B — Correctness (Days 3-4)
- [ ] B1: Harden fallback + fix collection verification
- [ ] B2: Expand DB schema
- [ ] B3: Wire new columns to observation log

### Phase C — Submission (Day 5)
- [ ] C1: Rewrite README
- [ ] C2: Write pitch script (conversational, not a file)

### Phase D — Demo Hardening (Days 6-7)
- [ ] D1: Fix marketplace SOL price confusion
- [ ] D2: End-to-end smoke test
- [ ] D3: Add .env.example

### Phase E — Optional
- [ ] E1: Dark sky real data
- [ ] E2: ASTRA prompt enhancement

### Post-Prompts Manual Tasks
- [ ] Run `npm run db:push` after Prompt B2
- [ ] Force redeploy on Vercel after each phase
- [ ] Test full demo flow on phone (real device, not simulator)
- [ ] Record 3-minute pitch video using C2 script
- [ ] Take screenshots for README
- [ ] Register project on Colosseum arena
- [ ] Submit before May 11 deadline

---

## WHAT WAS DELIBERATELY SKIPPED

| Audit Suggestion | Why Skipped |
|---|---|
| In-memory rate limiting → Redis | Overkill for hackathon. Vercel cold-start resets are acceptable at demo scale. |
| @solana/web3.js v1 dedup | Risky refactor with no user-visible benefit. Don't touch before deadline. |
| Streak DB column | Nice-to-have. Ad-hoc calculation works for demo. |
| Push notifications | Requires push infrastructure (FCM/APNs). Way too much scope. |
| Full Farcaster Frame endpoint | OG meta tags are sufficient. Frame endpoint is post-hackathon. |
| GPS spoofing mitigation | Unsolvable in a hackathon. Document honestly in README's "Known Limitations" section. |
| Schema: separate confidence vs status column | Refactoring existing column semantics is risky. Document the dual-use. |

---

*Generated: April 13, 2026*
*28 days to submission*
