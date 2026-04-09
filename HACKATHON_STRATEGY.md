# STELLAR — Colosseum Frontier Hackathon Strategy Report

**Based on:** Cypherpunk Hackathon winners analysis (Sep–Oct 2025)
**Target:** Frontier Hackathon, Consumer Track (Apr 6 – May 11, 2026)
**Current status:** Core features built. Need Solana depth + differentiators.

---

## SECTION 1 — What Won the Last Hackathon (and Why)

### Grand Champion: Unruggable ($30K)
Hardware wallet firmware on ESP32 + cross-platform companion app in pure Rust (Dioxus).

**Why it won:**
- Solved a real problem that existed before crypto: secure key storage
- Fully open source, self-custody, no third parties — hit the "cypherpunk" theme exactly
- Physical button required for every signing = tamper-proof by hardware
- Post-quantum signing via Winternitz one-time signatures (forward-looking)
- Every platform from one codebase (Rust + Dioxus = iOS/Android/macOS/Windows/Linux)

**Key deps:** `solana-sdk 2.3.1`, `solana-winternitz`, `squads-v4-client`, `jito`, `jupiter`, `spl-token`, `carrot-sdk`

---

### Consumer Track Winner: Capitola ($25K)
Prediction markets meta-aggregator — routes bets across all platforms (Polymarket, Drift, etc.) to get best price. Same concept as Jupiter but for prediction markets.

**Why it won:**
- Aggregation creates network effect value instantly
- Best-price routing is a familiar, proven pattern (DEX aggregators)
- Consumer utility without needing to teach users anything new

---

### Consumer Runner-Up: Superfan
Fan-backed music funding via tokenized presales. Artist launches campaign → fans buy tokens → tokens = revenue share + perks.

**Tech stack (most relevant to Stellar):**
- Next.js 15 + React 19 + TypeScript strict
- `@privy-io/react-auth ^2.13.2` — embedded wallets, email login (SAME AS STELLAR)
- Supabase for backend state
- Anchor 0.31.x + PDAs for onchain state
- `initialize_campaign`, `buy_presale`, `withdraw_funds`, `close_campaign` instructions
- Full Anchor test suite covering lifecycle + error conditions
- Farcaster MiniApp SDK (`@farcaster/miniapp-sdk ^0.1.10`)

**Why it placed:** Zero-crypto UX (Privy + embedded wallets), real consumer problem, hackathon-specific Solana adapter built in PR #37.

---

### Stablecoin Winner: MCPay ($25K)
x402 protocol layer for MCP servers — AI agents pay per API call autonomously via USDC.

**Why it won:**
- Perfect timing: x402 was a new Solana Foundation initiative at submission time
- Made it trivial to add paid API calls to any AI tool (ChatGPT, Cursor, etc.)
- AI agent economy + Solana micropayments = Solana Foundation's exact narrative

**Key insight for Stellar:** Claude API chat is already in the app. Wrapping it behind x402 so AI-powered sky queries can be monetized per-call is a hackathon-ready narrative.

---

### DeFi Winner: Yumi Finance ($25K)
BNPL underwriting on Solana using **zkTLS** to pull offchain bank/credit data into onchain loan origination without exposing raw data.

**Key insight:** zkTLS = prove a fact about a website's data (bank balance, credit score) without revealing the underlying data. This pattern is coming to every onchain product that needs real-world data.

---

### Infrastructure Winner: Seer ($25K)
Transaction debugger for Solana — Tenderly equivalent. Drop-in RPC that generates full execution traces mapped to source code.

**Key insight for Stellar:** Use Seer during development for debugging Anchor programs and Bubblegum NFT minting. Also: judges notice when you reference and use current-generation developer tooling.

---

## SECTION 2 — Universal Patterns Across All Winners

| Pattern | Evidence | Stellar Status |
|---|---|---|
| Privy embedded wallets (no seed phrases) | Superfan, implied by others | ✅ Already in |
| Real-world problem first, crypto second | Every winner | ✅ Astronomy utility |
| Anchor + PDAs for onchain state | Superfan, Yumi | ⚠️ Not yet implemented |
| Compressed NFTs (Bubblegum) | Unruggable, others | ⚠️ Planned, not built |
| SPL tokens for incentives | Unruggable BONK staking | ⚠️ Planned (Stars points) |
| Jito for transaction optimization | Unruggable baked it in | ❌ Not in |
| Squads multisig | Unruggable | ❌ Not relevant for consumer |
| MCP + x402 AI payments | MCPay | ❌ Not in — opportunity |
| Farcaster MiniApp | Superfan | ❌ Not in — opportunity |
| Full Anchor test suite | Superfan PR #37 | ❌ Missing — judges look |

---

## SECTION 3 — Gap Analysis: Current Stellar vs What's Needed

### What Stellar Has (confirmed from codebase)
- Next.js 15 + React 19 + TypeScript
- Privy auth + embedded Solana wallets
- 7-day sky forecast (Open-Meteo)
- Planet tracker (astronomy-engine)
- AI Space Companion (Claude API streaming)
- Marketplace (Astroman.ge products, GEL + SOL pricing)
- Quiz missions (3 quizzes, 10 questions each, EN + KA)
- Observation missions UI
- Star catalog + constellation renderer
- Georgian + English i18n
- `pollinet.ts` + `farmhawk.ts` (offline queue + sky condition oracle)
- `mintObservation` in `solana.ts` (exists, not fully wired)

### What's Missing That Judges Will Look For
1. **Working Anchor program** — any onchain state (no PDAs currently)
2. **Bubblegum compressed NFT minting** — the attestation flow is UI-only
3. **SPL token** — Stars points exist in UI state only, no token
4. **Jito integration** — transaction optimization
5. **x402 / MCP payment layer** — AI calls as paid micro-transactions
6. **Farcaster MiniApp** — viral distribution vector
7. **Anchor test suite** — visible proof of onchain engineering quality
8. **Seer integration** — use it in dev, mention it in README

---

## SECTION 4 — Priority Action Plan

### TIER 1 — Must Ship (Directly affects hackathon score)

#### 1.1 Discovery Attestation NFT — Metaplex Bubblegum

**What:** When a user completes an observation mission, mint a compressed NFT to their embedded wallet as proof. The NFT metadata contains: target object, timestamp, GPS coordinates, cloud cover reading from Farmhawk, oracle hash.

**Why it wins:** Compressed NFTs cost ~$0.000005 each. You can mint thousands. The "observation sealed on Solana" UX is the core Stellar narrative. Without this actually working, the pitch has no onchain substance.

**Files to change:**
- `src/lib/solana.ts` — complete `mintObservation()` with real Bubblegum calls
- `src/app/api/mint/route.ts` — server-side minting with fee-payer wallet
- `src/components/sky/MissionActive.tsx` — trigger mint on completion

**Packages needed:**
```
@metaplex-foundation/mpl-bubblegum
@metaplex-foundation/umi
@metaplex-foundation/umi-bundle-defaults
```

**Anchor-free path:** Bubblegum does not require you to write an Anchor program — Metaplex provides the program. You call their SDK. This is achievable in 1-2 days.

**NFT metadata schema:**
```json
{
  "name": "Stellar Observation: Jupiter",
  "symbol": "STLR",
  "description": "Verified telescopic observation sealed on Solana.",
  "attributes": [
    { "trait_type": "Target", "value": "Jupiter" },
    { "trait_type": "Timestamp", "value": "2026-04-08T21:33:00Z" },
    { "trait_type": "Location", "value": "Tbilisi, Georgia" },
    { "trait_type": "Cloud Cover", "value": "12%" },
    { "trait_type": "Oracle", "value": "Farmhawk" },
    { "trait_type": "Observer", "value": "0xABC..." }
  ]
}
```

---

#### 1.2 Stars SPL Token — On-Chain Points

**What:** Deploy a simple SPL token (Stars, symbol: ✦) on devnet. Award it when missions and quizzes complete. Show balance in profile. This replaces the current localStorage-only Stars counter.

**Why it wins:** Judges can see token in Solana Explorer. It transforms gamification from a UI trick into verifiable onchain state.

**Implementation path (no Anchor needed):**
```typescript
// Create token mint (one-time, devnet)
// Use @solana/spl-token createMint()
// Server-side mint authority = FEE_PAYER_PRIVATE_KEY
// On mission complete: server mints N tokens to user's ATA
```

**Files to touch:**
- New: `src/app/api/award-stars/route.ts` — server mints tokens
- `src/lib/solana.ts` — `awardStars(recipientAddress, amount)` helper
- `src/app/profile/page.tsx` — fetch real SPL balance
- `src/components/sky/StatsBar.tsx` — show token balance from chain

**Packages already in repo:** `@solana/web3.js`, `@solana/spl-token`

---

#### 1.3 Anchor Program — Minimal Observation Registry

**What:** A single Anchor program with two instructions:
1. `initialize_observer(user_pubkey)` — creates an Observer PDA storing: total_observations, total_stars, rank
2. `record_observation(target, timestamp, oracle_hash)` — increments count, emits event

**Why it wins:** Having ANY onchain program in the repo signals serious Solana engineering. Superfan built theirs in a PR specifically for Colosseum. You do the same.

**Program structure:**
```
programs/stellar-observations/
  src/
    lib.rs           — program entry point
    instructions/
      initialize.rs  — init Observer PDA
      record.rs      — record observation
    state/
      observer.rs    — Observer account struct
  Cargo.toml
  Xargo.toml
tests/
  stellar-observations.ts  — Anchor test suite
Anchor.toml
```

**Observer PDA state:**
```rust
#[account]
pub struct Observer {
    pub authority: Pubkey,        // user wallet
    pub total_observations: u32,
    pub total_stars: u64,
    pub rank: u8,                 // 0=Cadet, 1=Observer, 2=Astronomer, 3=Navigator
    pub last_observation: i64,    // unix timestamp
    pub bump: u8,
}
```

**Time estimate:** 1 day if you've written Anchor before. 2 days if not. Use `anchor init`, follow Superfan's pattern exactly.

---

#### 1.4 Farmhawk Oracle Integration (already in lib, wire it up)

**What:** `farmhawk.ts` already exists. Before minting an observation NFT, call Farmhawk to get cloud cover + oracle hash. Include this hash in the NFT metadata. This is the "verified" part of the Stellar attestation flow.

**Why it wins:** Judges want to see that the "verified" claim is backed by external data, not user self-reporting.

**Current state:** `farmhawk.ts` likely returns `{ cloudCover: number, oracleHash: string }`. The `mintObservation` call in `page.tsx` already passes `cloudCover` and `oracleHash`. You just need to make the mint actually execute.

---

### TIER 2 — Should Ship (Differentiates from generic consumer apps)

#### 2.1 x402 Payment Layer for ASTRA AI

**What:** Wrap the `/api/chat` route behind the x402 protocol. First 5 messages free (gasless). After that, each ASTRA query costs 0.01 USDC from the user's embedded wallet. Use MCPay's open-source SDK as reference.

**Why it wins:**
- References the exact MCPay pattern that won Cypherpunk
- Demonstrates Solana Foundation's x402 initiative
- Creates a revenue model judges can evaluate
- Turns ASTRA from "Claude wrapper" into "paid AI oracle with Solana rails"

**Implementation:**
```typescript
// src/app/api/chat/route.ts
// Add x402 middleware check:
// 1. Check user's free message count (from Supabase or localStorage)
// 2. If > 5 and no payment, return 402 with payment metadata
// 3. Frontend intercepts 402, triggers Privy transaction for 0.01 USDC
// 4. Frontend retries with payment receipt header
// 5. Server validates payment, proceeds with Claude API call
```

**Package:** `@x402-protocol/server` (or implement the 402 headers manually — it's just HTTP headers + a USDC transfer verification)

---

#### 2.2 Farcaster MiniApp

**What:** Wrap the home page (tonight's sky highlights + planet visibility) as a Farcaster Frame / MiniApp. Users can share their observation NFT directly to Farcaster with a "I just observed Jupiter on Stellar" cast.

**Why it wins:**
- Superfan used `@farcaster/miniapp-sdk ^0.1.10` — judges recognize this pattern
- Social sharing creates viral loop without any additional cost
- Farcaster is Solana-adjacent (many judges are on Farcaster)

**Minimum viable implementation:**
```typescript
// Add to src/app/layout.tsx <head>:
// <meta property="fc:frame" content="vNext" />
// <meta property="fc:frame:image" content="/api/og/sky" />
// <meta property="fc:frame:button:1" content="View Tonight's Sky" />
// <meta property="fc:frame:post_url" content="/api/frame/action" />

// New: src/app/api/og/sky/route.tsx — dynamic OG image with tonight's sky
// New: src/app/api/frame/action/route.ts — frame action handler
```

**Package:** `@farcaster/miniapp-sdk` (same as Superfan used)

---

#### 2.3 Observation NFT Gallery Page

**What:** `/nfts` route (already exists in the repo) — fetch all compressed NFTs from the user's wallet using Helius DAS API, display them in a grid with metadata.

**Why it wins:** Makes the "proof" tangible. Users see their collection. Judges can verify the NFTs exist.

**Implementation:**
```typescript
// src/app/nfts/page.tsx
// Helius DAS API: GET /v0/addresses/{wallet}/nfts?limit=50
// Filter by collection (your Bubblegum tree)
// Display: target name, date, cloud cover, thumbnail (generated SVG or star map)
```

**API call:**
```typescript
const res = await fetch(`${process.env.HELIUS_RPC_URL}/v0/addresses/${wallet}/nfts`, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'getAssetsByOwner',
    params: { ownerAddress: wallet, page: 1, limit: 50 }
  })
});
```

---

#### 2.4 Custom Star Map Digital Product (Revenue Story)

**What:** The `dig-starmap` product in the marketplace should actually generate a star map. When purchased, call the astronomy-engine to generate a SVG star map for the user's specified date + location, return as downloadable PDF.

**Why it wins:**
- Closes the loop between the marketplace (already built) and the astronomy engine (already built)
- 29 GEL = ~$10 is a real revenue transaction
- Demonstrates the full product loop: UI → payment → on-chain record → digital delivery

**Files:**
- New: `src/app/api/generate-starmap/route.ts`
- Uses existing `star-catalog.ts` + `sky-data.ts`
- Generates SVG → returns as data URL or PDF via `@react-pdf/renderer`

---

### TIER 3 — Nice to Have (Polish for demo day)

#### 3.1 Jito Bundle Transactions
When minting an observation NFT, use Jito bundles to ensure the transaction lands quickly. Include a small tip (0.001 SOL). This is table stakes for serious Solana apps.

```typescript
// src/lib/solana.ts — add jitoTip() helper
// Jito tip accounts: https://jito-foundation.gitbook.io/mev/searchers/technical-references/tip-payment-program
const JITO_TIP_ACCOUNT = new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5');
```

---

#### 3.2 Seer RPC for Development
Use Seer (https://seer.run) for debugging Anchor program transactions during development. Add to README. Judges notice when you reference current-gen tooling.

```bash
# .env.local
SEER_RPC_URL=https://your-session.seer.run
# Use this instead of devnet for local testing
```

---

#### 3.3 Observation Sharing Card
Auto-generate a social card (OG image) for each completed observation. Shows: planet name, date, star count earned, user rank. Use `@vercel/og` (already in Next.js ecosystem).

```typescript
// src/app/api/og/observation/route.tsx
// Dynamic image: dark background, planet emoji, stats
// Used for: Farcaster share, Twitter/X share button on mission complete
```

---

## SECTION 5 — Complete Dependency Additions

Add to `package.json`:

```json
{
  "@metaplex-foundation/mpl-bubblegum": "^5.0.0",
  "@metaplex-foundation/umi": "^1.0.0",
  "@metaplex-foundation/umi-bundle-defaults": "^1.0.0",
  "@farcaster/miniapp-sdk": "^0.1.10",
  "@coral-xyz/anchor": "^0.31.1"
}
```

Add to Anchor workspace (new `Anchor.toml` at root):

```toml
[toolchain]
anchor_version = "0.31.1"
solana_version = "2.1.0"

[programs.localnet]
stellar_observations = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.devnet]
stellar_observations = "YOUR_DEPLOYED_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

---

## SECTION 6 — Hackathon Submission Narrative

**One-sentence pitch:**
"Stellar turns every telescope session into a verified on-chain discovery — astronomers observe the sky, earn SPL tokens, and collect compressed NFT attestations while shopping for equipment from Georgia's first astronomy store."

**What judges will check:**
1. Is there a working Solana program? → YES: Anchor observation registry
2. Are there real NFTs? → YES: Bubblegum compressed NFTs per observation
3. Is there a token? → YES: Stars SPL token
4. Is the UX non-crypto? → YES: Privy email login, no seed phrases
5. Does it solve a real problem? → YES: 60K amateur astronomers in Georgia + globally
6. Is there a revenue model? → YES: Marketplace + x402 ASTRA premium

**Demo script (3 minutes):**
1. Sign up with email → embedded wallet created silently (30s)
2. Tonight's sky → planet visibility + forecast (30s)
3. Start Jupiter observation mission → Farmhawk verifies clear sky → complete → NFT minted (45s)
4. Show NFT in gallery with Solana Explorer link (30s)
5. Ask ASTRA "what can I see with a 70mm telescope tonight?" → streaming answer (30s)
6. Buy Bresser Junior from marketplace with card → order ref generated (15s)
7. Show Stars balance in profile — real SPL token (15s)

---

## SECTION 7 — Developer Help Needed

If adding a frontend developer:

**Immediate delegation:**
- Observation NFT gallery (`/nfts` page) — needs DAS API fetch + grid display
- Social sharing cards (OG images) — `@vercel/og` component
- Farcaster Frame meta tags + frame action handler
- Profile page polish (real SPL balance, rank progression, NFT count)

**Keep for yourself (founder-critical):**
- Anchor program (`stellar-observations`) — you need to understand what's on chain
- `mintObservation()` wiring — core product loop
- `awardStars()` SPL minting — tokenomics must be right
- x402 payment middleware — monetization decision

---

## SECTION 8 — Useful Prompts for Implementation

### Prompt: Complete mintObservation()
```
You are implementing compressed NFT minting for a Next.js + Solana app.
Use @metaplex-foundation/mpl-bubblegum and @metaplex-foundation/umi-bundle-defaults.
The function signature is:
  mintObservation(send: Function | null, userKey: PublicKey | null, data: ObservationData): Promise<{txId: string}>
Where ObservationData = { target: string, timestamp: number, lat: number, lon: number, cloudCover: number, oracleHash: string, stars: number }
The fee payer is a server-side keypair from process.env.FEE_PAYER_PRIVATE_KEY.
The Bubblegum tree address is process.env.MERKLE_TREE_ADDRESS.
Collection mint is process.env.COLLECTION_MINT_ADDRESS.
Return the transaction signature as txId.
Use devnet. Do not use @solana/wallet-adapter.
```

### Prompt: Stars SPL Token Mint Endpoint
```
Create a Next.js API route at /api/award-stars.
It accepts POST { recipientAddress: string, amount: number, reason: string }.
It uses the server-side FEE_PAYER_PRIVATE_KEY to mint SPL tokens to the recipient's ATA.
Token mint address is in process.env.STARS_TOKEN_MINT.
Use @solana/spl-token getOrCreateAssociatedTokenAccount + mintTo.
Validate that amount is a positive integer, max 1000.
Return { success: true, txId: string }.
```

### Prompt: Anchor Observer Program
```
Write a minimal Anchor 0.31.x program called stellar_observations.
It has one account: Observer { authority: Pubkey, total_observations: u32, total_stars: u64, rank: u8, last_observation: i64, bump: u8 }.
Instructions:
1. initialize_observer(ctx) — creates Observer PDA with seeds ["observer", authority.key()]
2. record_observation(ctx, target: String, oracle_hash: String, stars_earned: u64) — increments counts, updates rank based on thresholds (0=Cadet@0, 1=Observer@5, 2=Astronomer@20, 3=Navigator@50), sets last_observation to Clock::get().unix_timestamp
Include full Anchor test suite in TypeScript covering init, record, rank progression, and duplicate init error.
```

### Prompt: x402 Middleware
```
Add x402 payment gating to src/app/api/chat/route.ts in a Next.js 15 app.
Rules:
- First 5 messages per wallet address are free (tracked in Supabase table ai_usage)
- After 5, return HTTP 402 with header X-Payment-Required: { amount: "0.01", token: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", network: "solana-devnet" }
- Client should send X-Payment-Receipt: <tx_signature> header on retry
- Server verifies the USDC transfer on chain (from user to treasury wallet process.env.TREASURY_WALLET)
- If verified, increment free_count, proceed with Claude API call
Keep the streaming response intact.
```

---

## SECTION 9 — Reference Links

| Resource | URL | Use |
|---|---|---|
| Colosseum winners | https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/ | Benchmark |
| Superfan Solana adapter | https://github.com/kevinknielsen/superfan-core/pull/37 | Anchor pattern reference |
| Unruggable firmware | https://github.com/hogyzen12/unruggable-rust-esp32 | Solana SDK usage reference |
| MCPay | https://github.com/microchipgnu/MCPay | x402 implementation reference |
| Metaplex Bubblegum docs | https://developers.metaplex.com/bubblegum | Compressed NFT minting |
| Metaplex Umi | https://developers.metaplex.com/umi | UMI bundle setup |
| Helius DAS API | https://docs.helius.dev/compression-and-das-api | NFT gallery fetch |
| Seer debugger | https://seer.run | Anchor program debugging |
| x402 protocol | https://x402.org | Payment middleware spec |
| Farcaster Frames | https://docs.farcaster.xyz/reference/frames/spec | MiniApp implementation |
| Jito tip accounts | https://jito-foundation.gitbook.io/mev/searchers/technical-references | Transaction optimization |
| Anchor book | https://www.anchor-lang.com | Anchor program reference |

---

## SECTION 10 — Timeline to Demo Day (May 11, 2026)

| Week | Focus | Deliverable |
|---|---|---|
| Apr 8–13 | Onchain core | Bubblegum tree created, `mintObservation()` working on devnet, NFTs visible in Explorer |
| Apr 14–18 | SPL token + Anchor | Stars token deployed, `awardStars()` endpoint live, Anchor program deployed to devnet |
| Apr 19–24 | NFT gallery + profile | `/nfts` page live with real NFT fetch, profile shows real token balance + rank |
| Apr 25–30 | x402 + Farcaster | ASTRA payment gating, Farcaster Frame meta tags, social sharing |
| May 1–7 | Polish + testing | Star map generator, Jito integration, full demo flow recorded |
| May 8–11 | Submission | README updated, Anchor tests passing, demo video, project page on Colosseum |

**Critical path:** Bubblegum minting → everything else builds on top of it. If nothing else ships, the observation NFT must work.

---

*Last updated: 2026-04-08*
*Based on: Cypherpunk Hackathon winners, Stellar codebase analysis, Colosseum Frontier Consumer Track requirements*
