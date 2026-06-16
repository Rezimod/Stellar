# Stellar — Security & Solana Mainnet-Readiness Audit

**Scope:** Authorized owner review of the Stellar web app (`src/`), Solana token/mint scripts (`scripts/`, `src/lib/`), API routes, database schema, auth, and deploy config.
**Date:** 2026-06-16 · **Branch:** `main` @ `32fba91` · **Network today:** devnet
**Reviewer posture:** Strict. Assume attackers will try to drain rewards, abuse the fee-payer, fake observations, replay signatures, and mint duplicate rewards.

> No code was modified. No secrets are printed. No third-party systems were touched. All commands run are listed in section **J**.

---

## A. Executive summary

**Overall mainnet readiness: NOT READY** (close, but blocked on key-management and reward-integrity items).

The app is unusually well-built for security on the *mechanics*: HMAC-signed observation tokens, server-side reward recomputation, DB unique-index idempotency, wallet/session binding, magic-byte upload validation, real CSP + HSTS, no committed secrets, and a devnet-only hard guard on the gas faucet. The blockers are **architectural**, not sloppiness:

1. The **STARS mint authority is the same hot key as the gas-drip fee payer.** One key leak = unlimited token minting + SOL drain. This is the single most important mainnet blocker.
2. **No emergency pause / kill-switch** exists anywhere in the value path.
3. **Reward issuance trusts the client** in two places (`/api/award-stars` quiz/mission claims; `/api/observe/log` accepts unauthenticated callers). On devnet that's free play money; on mainnet, STARS burn for real GEL discounts and till-redeemable codes, so this is discount/redemption fraud.

### Top 10 risks
| # | Risk | Severity |
|---|------|----------|
| 1 | Fee-payer key doubles as STARS mint authority (unlimited mint + gas drain on leak) | **Critical (mainnet)** |
| 2 | No emergency pause / kill-switch on mint/award/burn/fund | **Critical (mainnet)** |
| 3 | `/api/award-stars` trusts client-claimed quiz/mission completion (mints burnable, GEL-redeemable STARS) | **High** |
| 4 | `/api/observe/log` mints STARS with no proven wallet ownership when unauthenticated | **High** |
| 5 | Sybil farming of soulbound STARS → marketplace discount / till-redemption fraud | **High** |
| 6 | 71 dependency vulns (30 high): `elliptic`, `bn.js`, `bigint-buffer`, `ws`, `esbuild`, `postcss`, WalletConnect cluster | **High** |
| 7 | `/api/award-stars` claims idempotency slot *before* the mint → failed mint + retry permanently loses the award | **Medium** |
| 8 | DB/chain divergence: `observe/log` writes `starsAwarded` to DB while on-chain mint is fire-and-forget | **Medium** |
| 9 | No mainnet RPC hard-separation on value routes (silent devnet fallback if `SOLANA_RPC_URL` unset) | **Medium** |
| 10 | Internal error messages returned to clients (`award-stars`, `wallet/fund`) | **Low/Medium** |

### Mainnet launch recommendation
**Do not migrate to mainnet until items 1, 2, 3, 4 in section I "Must fix" are closed.** They are bounded, well-scoped changes — none require a rewrite. Once the mint authority is moved off the hot fee-payer to a multisig (Squads) or program PDA, a kill-switch is wired, and reward issuance is server-verified, this codebase is in good shape for a controlled beta on mainnet.

---

## B. Critical issues

### C1 — STARS mint authority is the hot fee-payer key
- **Severity:** Critical (for mainnet)
- **Affected:** `scripts/create-stars-token.ts:73-79`, `src/lib/stars.ts:20-58`, `src/app/api/award-stars/route.ts:122-154`, `src/lib/observation-program.ts`, `src/app/api/wallet/fund/route.ts:66-101`
- **Why it matters:** `FEE_PAYER_PRIVATE_KEY` is loaded into many serverless routes and is **simultaneously**: (a) the SOL gas sponsor for every gasless tx, (b) the SOL faucet (`wallet/fund`), and (c) the **STARS Token-2022 mint authority**. A single compromise of that one base58 secret lets an attacker mint unlimited STARS to any wallet and drain all sponsor SOL. The blast radius is the entire token economy.
- **Proof from code:**
  ```ts
  // scripts/create-stars-token.ts:73 — mint authority set to fee payer
  createInitializeMintInstruction(mintKeypair.publicKey, 0, feePayerKeypair.publicKey, null, TOKEN_2022_PROGRAM_ID)
  // src/lib/stars.ts:47 — fee payer signs mintTo as authority
  await mintTo(connection, feePayerKeypair, mintKey, ata.address, feePayerKeypair, BigInt(amount), ...)
  ```
- **Fix:**
  - Create the mainnet mint with the **mint authority held by a Squads multisig** (or a program PDA that enforces per-tx caps), distinct from the operational fee payer.
  - The award route should request a signed mint from that authority service, or the authority should be a dedicated, narrowly-scoped key stored separately (different Vercel project / KMS), never the gas sponsor.
  - Keep `freezeAuthority = null` (already correct; NonTransferable makes freeze moot).
  - Hold only a small float of SOL on the gas-drip key; alert + auto-pause on balance drop.

### C2 — No emergency pause / kill-switch
- **Severity:** Critical (for mainnet)
- **Affected:** all value routes — `award-stars`, `mint`, `observe/log`, `stars/burn`, `wallet/fund`, `club/activate`.
- **Why it matters:** If fraud, a key leak, or a runaway loop is detected on mainnet, there is no single switch to stop minting/burning/funding. Today the only "stop" is pulling env vars or redeploying.
- **Proof:** No `KILL_SWITCH`/`PAUSED` check exists in any route (grepped; none found).
- **Fix:** Add a single guard read at the top of every value route:
  ```ts
  if (process.env.STELLAR_PAUSED === '1') return NextResponse.json({ error: 'Temporarily paused' }, { status: 503 });
  ```
  Toggle via Vercel env (instant). Optionally back it with an Upstash flag for sub-second flip without redeploy.

---

## C. High / Medium / Low issues

### High

**H1 — `/api/award-stars` trusts client-claimed quiz/mission completion**
`src/app/api/award-stars/route.ts:73-87` + `src/lib/award-stars-policy.ts`. The route validates *reason allowlist* and *per-reason caps* but never verifies the underlying event actually happened. Any authenticated user can POST `reason:"quiz:x"` (≤100), `cosmic_bonus:` (≤100), `weekly_challenge` (≤200), etc., with fresh idempotency keys up to **30 grants/day/wallet**. Because STARS burn for real GEL discounts and till-redeemable codes, this is direct value fraud on mainnet.
*Fix:* compute rewards server-side from a verified completion record (quiz answers scored server-side; mission state in DB), not from a client-asserted `reason`+`amount`.

**H2 — `/api/observe/log` mints STARS without proven wallet ownership**
`src/app/api/observe/log/route.ts:32-94`. `verifyPrivy` may return `null`; `assertOwnsWallet` is only enforced *if* a Privy token is present (`if (privyId) {…}`). An unauthenticated caller can submit a valid `verificationToken` (issued by `/api/observe/verify`, which itself requires no auth) bound to any `wallet` string they choose, then trigger `awardStarsOnChain(wallet, …)` (line 278). STARS are soulbound, so the attacker can only credit wallets they control — but combined with H3 this is the farming primitive.
*Fix:* require a verified Privy session **or** a wallet signature on both `/observe/verify` and `/observe/log`; bind the rate-limit key and token issuance to the authenticated principal.

**H3 — Sybil farming → discount/redemption fraud**
The per-wallet daily cap (`DAILY_STARS_CAP = 500`, `src/lib/stars.ts:18`) and verify quota (20/day per IP or Privy id) bound *one* identity, but nothing caps issuance across many wallets/accounts. With a stock of real-looking sky photos and many embedded wallets, an attacker farms soulbound STARS, then burns them for the 30% marketplace discount (`stars/burn` `discount-burn`) or `redeem-code` value at the Astroman till. The anti-fraud stack (Gemini auth check, cross-wallet hash dedup `observations-dedup.ts`, EXIF GPS/age, reverse-image) raises the cost but doesn't cap aggregate value.
*Fix:* tie redemption value to verified identity (email/phone uniqueness via Privy), add a global daily issuance budget + anomaly alerting, and consider a manual review threshold on `redeem-code` over a GEL ceiling.

**H4 — Dependency vulnerabilities (71 total: 14 low / 27 moderate / 30 high)**
`npm audit`. High-severity advisories in the crypto/runtime path are the concern: `elliptic` (GHSA-848j-6mx2-7j84), `bn.js` (GHSA-378v-28hj-76wf), `bigint-buffer` (GHSA-3gc7-fjrx-p6mg), `ws`, plus dev-only `esbuild`/`postcss`/`uuid`. A large share comes from a **WalletConnect / `@reown/*` / `@wagmi/*` cluster** — those are EVM stacks pulled transitively; this is a Solana-only app.
*Fix:* `npm audit fix`; upgrade `@solana/wallet-adapter-*` to latest; **investigate and remove the wagmi/reown/walletconnect dependency chain** if nothing imports it (it likely accounts for most of the 30 highs). Re-audit and pin.

### Medium

**M1 — `award-stars` idempotency claimed before mint → lost awards**
`src/app/api/award-stars/route.ts:94-115` inserts the idempotency row *before* the Solana mint (lines 144-154). If the mint throws (500), the slot is already claimed; a retry with the same `idempotencyKey` hits the unique index and returns `{success:true, cached:true}` (line 110) even though **no STARS were ever minted**. Result: silent permanent loss of that award. Also, the `23505` catch can't distinguish the idempotency unique index from `obs_daily_unique (wallet,target,observedDate)` (`schema.ts:113`), so a second legit same-reason award the same day is also swallowed.
*Fix:* claim idempotency only after a confirmed mint (store the real tx signature), or mark the pre-row `pending` and update→`minted` on success / delete on failure; return `cached` only when a real signature exists.

**M2 — DB/chain divergence in `observe/log`**
`src/app/api/observe/log/route.ts:252-282`: the DB row records `starsAwarded` and the response says `starsMinted:true`, but the actual on-chain `awardStarsOnChain(...)` is fire-and-forget (`.catch(console.error)`, line 278-281). A mint failure leaves the DB claiming STARS that don't exist on chain. On-chain Proof-of-Observation is also best-effort (lines 228-249).
*Fix:* await the mint (or a queued job with retry) before reporting `starsMinted`; add a reconciliation job comparing `observation_log.stars` to on-chain balances.

**M3 — No mainnet RPC hard-separation on value routes**
`award-stars:15`, `stars.ts:31`, `mint`, `stars/burn:47`, `club/activate`, `observation-program.ts` all default to `https://api.devnet.solana.com` when `SOLANA_RPC_URL` is unset. Only `wallet/fund` hard-guards devnet (`wallet/fund:62`). At migration, a missing env var silently runs value ops on devnet (or worse, mismatched cluster vs. front-end). The explorer `cluster` label also defaults to `'devnet'` everywhere.
*Fix:* add a startup assertion: in production, require `SOLANA_RPC_URL` and `NEXT_PUBLIC_SOLANA_CLUSTER` to be set and consistent; refuse to mint/burn if the configured cluster disagrees with the mint's owning cluster.

**M4 — GET endpoints that mutate state (tweet agent)**
`src/app/api/agent/approve-tweet/route.ts:44-112` posts live to X and flips DB status on a **GET** (also `reject-tweet`). It's HMAC-signed (`agent-token.ts`), which is good, but the signature has **no expiry/nonce** (`signAction` = `HMAC(draftId:action)`), so a leaked Telegram link is replayable forever, and GET makes it prefetchable. Low real impact (your own X account), hence Medium-Low.
*Fix:* move the mutating action to POST with the signed token in the body, and add an `exp` + one-time `reviewedAt` guard (already partially present via status check).

### Low

- **L1 — Internal error leakage:** `award-stars:165` and `wallet/fund:121` return `err.message` to the client. Return a generic message; log details server-side (the `mint` route already does this correctly at line 222).
- **L2 — CSP allows `'unsafe-eval'` + `'unsafe-inline'` in `script-src`** (`next.config.ts:47`). Required by Privy/wallet libs today, but it weakens XSS defense. Track for tightening (nonce-based) post-beta. Everything else in the header set is strong (HSTS preload, `frame-ancestors 'none'`, `X-Content-Type-Options`, scoped `Permissions-Policy`).
- **L3 — Stale env entries:** `.env.example` lists `ADMIN_SECRET`, `RESOLVER_SECRET`, `NEXT_PUBLIC_ADMIN_WALLET` (lines 32-35) from the removed Stargazer Markets feature. No source references them now (`/admin` route absent). Remove to avoid confusion and accidental future trust.
- **L4 — No automated security gates:** there is no CI (`.github/workflows` absent). Add `tsc --noEmit`, `npm run build`, `npm audit`, and a secret scan on PR.
- **L5 — `dangerouslySetInnerHTML`** appears once (`src/app/layout.tsx:113`) — a static theme-bootstrap script with no user input. **Not exploitable.** Listed for completeness.

---

## D. Mainnet readiness checklist

| Check | Status | Note |
|---|---|---|
| No devnet-only configs left in production path | **NEEDS REVIEW** | Value routes silently fall back to devnet RPC (M3); `wallet/fund` correctly hard-guards devnet |
| Mainnet RPC/env separation is clean | **NEEDS REVIEW** | Add prod assertion for `SOLANA_RPC_URL` + cluster consistency |
| Fee-payer wallet is protected and limited | **FAIL** | Doubles as mint authority (C1); no float cap / alerting |
| Mint authority is controlled safely | **FAIL** | Hot key = mint authority (C1); move to multisig/PDA |
| Admin keys not in code or frontend | **PASS** | No secrets committed; `.env*` gitignored; no `/admin` route |
| Reward-abuse protections exist | **NEEDS REVIEW** | Caps/rate-limits/dedup present, but client-trust gaps (H1–H3) |
| Failed transactions do not create fake DB success | **FAIL** | M1 (lost award on retry) + M2 (DB says minted when chain failed) |
| Duplicate submissions cannot mint twice | **PASS** | `observation_log_wallet_mint_tx_unique`, `obs_daily_unique`, per-target 24h cooldown, fileHash dedup |
| Observations are verified before rewards | **PASS (web path)** | HMAC token binds AI verdict → log/mint; tampering rejected |
| Wallet signature / session binding | **PARTIAL** | `assertOwnsWallet` solid, but not enforced when unauthenticated on `observe/log` (H2) |
| Replay protection on mint/award | **PASS** | Idempotency key + unique indexes + hourly/daily limits |
| Clear emergency pause / kill-switch | **NOT FOUND** | C2 — must add |
| Secrets not committed to git | **PASS** | `git log --all` shows only `.env.example` ever tracked |
| Security headers / CSP | **PASS** | Strong CSP, HSTS preload, anti-clickjacking |
| File-upload safety | **PASS** | Magic-byte check, size bounds, type allowlist, no disk write |
| SSRF on outbound fetches | **PASS** | All fetch hosts fixed (Gemini/Open-Meteo/Google Vision); coords numeric-validated |
| CSRF | **PASS** | Bearer-token auth (not cookies); CSP `frame-ancestors 'none'` |

---

## E. Tokenization-specific findings

- **Token type:** STARS = Token-2022, **NonTransferable**, **0 decimals**, **mint authority = fee payer**, **freeze authority = null** (`scripts/create-stars-token.ts:54-83`). NonTransferable is the right call — it makes STARS soulbound, killing secondary-market drain incentives. ✅
- **Mint authority centralization (C1)** is the headline tokenization risk — see B.
- **Decimals/supply:** 0 decimals, no fixed supply cap. Supply is bounded operationally by daily caps and reward tables, not by the mint. Acceptable for a loyalty token, but document the inflation policy.
- **ATA derivation:** consistently uses `STARS_TOKEN_PROGRAM_ID` (Token-2022) for both `getOrCreateAssociatedTokenAccount` and `getAssociatedTokenAddress` (`stars.ts`, `stars/burn:177`). ✅ Mixing classic SPL vs Token-2022 ATAs would silently create wrong accounts — correctly avoided.
- **Burn flow (`stars/burn`)** is the strongest route in the codebase: prepare/submit split, fee-payer sponsors gas, server **re-decodes the on-chain Burn instruction** to confirm source ATA, mint, authority, and amount (lines 305-330), re-validates eligibility just before submit, and enforces idempotency via `stars_burns (order_id, kind)` unique index. ✅
- **cNFT (Bubblegum) mint (`/api/mint`)** is gated by the HMAC observation token, rate-limited (2/hr Upstash + DB per-target hourly + fileHash dedup), and re-derives the oracle hash server-side rather than trusting the client (`mint:176-188`). ✅
- **Proof-of-Observation / Telescope Passport** writes are oracle-signed and best-effort — see M2 for the divergence concern.

---

## F. Fee-payer and reward-abuse findings

- **Fee-payer drain (gas):** `wallet/fund` is well-guarded — devnet-only hard check, `assertOwnsWallet`, 3/hour/address Upstash limit, no-op skip when balance sufficient, fixed 0.02 SOL top-up (`wallet/fund:20-101`). The remaining risk is C1 (same key as mint authority) and the absence of a float cap/alert.
- **Reward abuse (the big one):** see H1–H3. The mechanics (caps, rate limits, dedup, server-side recompute in `observe/log` and `observe/verify`) are good; the gaps are *trust boundaries* — `award-stars` trusting reasons, and `observe/log`/`verify` accepting unauthenticated principals. On devnet harmless; on mainnet these mint GEL-redeemable value.
- **Idempotency / double-mint:** strongly defended by DB unique indexes (`schema.ts:112-113, 156, 177`) — duplicate observation, duplicate award, and duplicate burn are all blocked. The defect is *direction* (M1: claim-before-mint loses awards), not double-spend.
- **Replay:** observation token expires in 30 min and is HMAC-bound to wallet+fileHash+confidence+device (`observation-token.ts:97,135-147`); cannot be reused for a different wallet or re-scored. ✅

---

## G. GitHub / CI/CD findings

- **No GitHub Actions / workflows** (`.github/workflows` absent). Deploy is Vercel auto-from-`main`. **No build-time secret exposure via CI** (nothing to leak), but also **no automated gates** (audit/typecheck/secret-scan). → L4.
- **Secret hygiene: PASS.** `.gitignore` is thorough — ignores `.env*` (except `.env.example`), `*.pem`, `stellar-toolkit/auth.json` ("contains real tokens"), `.superstack/`, `test-results/`, and transient `*.tmp.*`. `git log --all --name-only` confirms **no `.env`/`.env.local`/`auth.json` was ever committed** — only `.env.example`.
- **`.env.example` contains no live secrets** (all values blank/placeholder; `NEXT_PUBLIC_MERCHANT_WALLET` placeholder is a dummy string, not a real key). The file correctly annotates `PRIVY_APP_SECRET` as "server-only, never NEXT_PUBLIC_". ✅
- **`.npmrc`** sets `legacy-peer-deps=true` — needed for the wallet-adapter peer mess, but it also masks dependency conflicts; revisit after pruning the wagmi/walletconnect cluster (H4).
- **Vercel cron** (`vercel.json`) hits `/api/agent/draft-tweet` and `/api/cron/push`; both gated by `verifyCronSecret` which **fails closed in production** (`cron-auth.ts:5-10`). ✅
- **Recommendation:** add a minimal CI workflow (typecheck + build + `npm audit --audit-level=high` + gitleaks) before opening mainnet beta.

---

## H. Dependency findings

`npm audit`: **71 vulnerabilities (14 low, 27 moderate, 30 high)**; production-only subset: 67 (28 high).

| Package | Advisory | Path / Notes |
|---|---|---|
| `elliptic` | GHSA-848j-6mx2-7j84 (risky crypto primitive) | crypto path — **relevant**, prioritize |
| `bn.js` | GHSA-378v-28hj-76wf (infinite loop) | crypto path |
| `bigint-buffer` | GHSA-3gc7-fjrx-p6mg (buffer overflow) | Solana serialization path |
| `ws` | GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p | WebSocket (RPC/WalletConnect) |
| WalletConnect / `@reown/*` / `@wagmi/*` cluster | depends-on vulnerable `@walletconnect/*` | **EVM stack — likely removable** |
| `esbuild` | GHSA-67mh-4wv8-2f99, GHSA-gv7w-rqvm-qjhr | dev-server only |
| `postcss` | GHSA-qx2v-qp2m-jg93 (XSS in stringify) | build-time |
| `uuid` | GHSA-w5hq-g745-h8pq | low-impact buffer bounds |

**Upgrade path:**
1. `npm audit fix` (non-breaking first).
2. Bump `@solana/wallet-adapter-*` and `@solana/web3.js` to latest patch — clears most of the `elliptic`/`bn.js`/`bigint-buffer` chain.
3. **Trace and remove the wagmi/reown/walletconnect dependency** (run `npm ls @reown/appkit @wagmi/connectors @walletconnect/core`); if no first-party import, exclude/override it — this alone should clear the bulk of the 30 highs.
4. Re-run audit; for residual transitive issues use `overrides` in `package.json` to pin fixed versions.

---

## I. Prioritized fix plan

### Must fix before mainnet
1. **Move STARS mint authority off the hot fee-payer** to a Squads multisig or program PDA with per-tx caps (C1).
2. **Add a kill-switch** (`STELLAR_PAUSED`) to every value route (C2).
3. **Server-verify reward issuance** in `/api/award-stars` — score quizzes/missions server-side instead of trusting `reason`+`amount` (H1).
4. **Require authenticated wallet ownership** on `/api/observe/verify` and `/api/observe/log` before issuing tokens/minting (H2), and add a global daily issuance budget + redemption-value identity binding (H3).
5. **Production RPC/cluster assertion** so value ops can never silently run on the wrong network (M3).
6. **Fix award idempotency ordering** (claim after confirmed mint) and reconcile DB↔chain (M1, M2).
7. **Clear the high-severity dependency cluster** (H4).

### Should fix before beta
- Move tweet-agent mutations to POST with expiring signed tokens (M4).
- Stop returning raw `err.message` to clients (L1).
- Add CI gates: typecheck, build, `npm audit`, secret scan (L4).
- Add fee-payer SOL float cap + low-balance alert.

### Can fix later
- Tighten CSP toward nonce-based `script-src` (L2).
- Remove stale `ADMIN_SECRET`/`RESOLVER_SECRET`/`NEXT_PUBLIC_ADMIN_WALLET` env entries (L3).
- Document STARS inflation/supply policy.

---

## J. Commands run

```
git status
git log --oneline -n 20
git log --all --oneline --name-only | grep -iE '\.env...'        # confirm no env ever committed
ls -la ; cat package.json ; cat .gitignore ; cat .npmrc ; cat vercel.json
find src/app/api -name route.ts | sort                            # API route inventory
ls src/lib ; ls scripts
git grep -nE 'PRIVATE_KEY|SECRET_KEY|-----BEGIN|[base58]{80,}'     # hardcoded-secret scan (none found)
git grep -nl 'dangerouslySetInnerHTML'                            # XSS surface
git grep -n 'NEXT_PUBLIC_SOLANA_CLUSTER|mainnet-beta'             # cluster config
git grep -nc 'api.devnet.solana.com' -- 'src/**'                  # devnet fallbacks
git grep -nl 'ADMIN_SECRET|RESOLVER_SECRET|/admin|isAdmin'        # admin-endpoint leftovers
grep -nE 'NEXT_PUBLIC' .env.example ; (masked dump of .env.example keys)
npm audit ; npm audit --omit=dev
```
Files read in full: `src/lib/api-auth.ts`, `observation-token.ts`, `rate-limit.ts`, `stars.ts`, `cron-auth.ts`, `agent-token.ts`, `gemini-vision.ts`, `observations-dedup.ts`, `schema.ts`, `award-stars-policy.ts`; routes `award-stars`, `mint`, `observe/verify`, `observe/log`, `wallet/fund`, `stars/burn`, `redeem-code/validate`, `agent/draft-tweet`, `agent/approve-tweet`; `next.config.ts`, `scripts/create-stars-token.ts`.

---

## K. Safe patch suggestions (not applied)

**Kill-switch helper** (`src/lib/kill-switch.ts`, new) — call first thing in each value route:
```ts
import { NextResponse } from 'next/server';
export function paused(): NextResponse | null {
  return process.env.STELLAR_PAUSED === '1'
    ? NextResponse.json({ error: 'Service temporarily paused' }, { status: 503 })
    : null;
}
// usage:  const p = paused(); if (p) return p;
```

**Production network assertion** (`src/lib/solana.ts` or a shared init):
```ts
export function assertMainnetConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  const rpc = process.env.SOLANA_RPC_URL;
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
  if (!rpc || rpc.includes('devnet') || cluster !== 'mainnet-beta') {
    throw new Error('Refusing to run value ops: SOLANA_RPC_URL/CLUSTER not set to mainnet');
  }
}
```

**`observe/log` auth gate** (`src/app/api/observe/log/route.ts`, after parsing wallet):
```ts
if (!privyId) {
  return NextResponse.json({ logged: false, reason: 'Authentication required' }, { status: 401 });
}
const owns = await assertOwnsWallet(privyId, wallet);
if (!owns) return NextResponse.json({ logged: false, reason: 'Wallet mismatch' }, { status: 403 });
```

**`award-stars` idempotency-after-mint** — replace the pre-mint insert with: mint first, then `insert(...).values({ mintTx: signature })`; on `23505` return the existing row's real signature. Drop the `idempotencyKey`-as-`mintTx` placeholder so a failed mint never claims a slot.

**Mint authority separation** — at token creation, pass a dedicated authority pubkey instead of `feePayerKeypair.publicKey`:
```ts
const mintAuthority = new PublicKey(process.env.STARS_MINT_AUTHORITY!); // multisig / PDA
createInitializeMintInstruction(mint, 0, mintAuthority, null, TOKEN_2022_PROGRAM_ID);
```
and have the award path obtain a signature from that authority service rather than signing with the gas key.

**Error redaction** — in `award-stars`/`wallet/fund` catch blocks, log `err` server-side and return `{ error: 'Operation failed' }` with status 500.
