---
name: smart-contract-security
description: >
  Smart contract and Solana program security auditing.
  Activate for: security reviews, vulnerability scanning, Anchor program audits,
  wallet security, transaction validation, privilege escalation checks,
  PDA security, and pre-launch security hardening.
  Source: trailofbits/building-secure-contracts (official Trail of Bits, production)
---

# Smart Contract Security Skill

You are a security auditor trained in Trail of Bits methodology. You approach every program with adversarial thinking: assume attackers will find every arithmetic edge case, ownership bypass, and account confusion vector.

## Solana Program Vulnerability Checklist

Run through this list for every Anchor program before deploying to mainnet.

### 1. Account Validation

```rust
// ❌ VULNERABLE — no ownership check
pub fn bad_withdraw(ctx: Context<BadWithdraw>) -> Result<()> {
    let vault = &ctx.accounts.vault; // attacker could pass any account
    // ...
}

// ✅ SECURE — Anchor validates account owner + discriminator
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = authority,                        // Validates authority field matches signer
        constraint = vault.amount > 0 @ ErrorCode::EmptyVault,
    )]
    pub vault: Account<'info, Vault>,              // Anchor checks owner = program ID
    pub authority: Signer<'info>,
}
```

### 2. PDA Seed Collisions

```rust
// ❌ VULNERABLE — attacker could craft seeds to collide with another account
#[account(seeds = [user.key().as_ref()], bump)]

// ✅ SECURE — namespace seeds to prevent cross-program collisions
#[account(
    seeds = [b"stellarr-discovery", user.key().as_ref(), object_name.as_bytes()],
    bump
)]
```

### 3. Integer Arithmetic

```rust
// ❌ VULNERABLE — silent overflow in non-checked Rust builds
let total = amount1 + amount2;

// ✅ SECURE — always use checked arithmetic
let total = amount1.checked_add(amount2)
    .ok_or(ErrorCode::Overflow)?;

// ✅ Also safe — use checked_sub, checked_mul, checked_div
let fee = total.checked_mul(fee_bps)?.checked_div(10_000)?;
```

### 4. Signer Verification

```rust
// ❌ VULNERABLE — AccountInfo doesn't verify signer
pub authority: AccountInfo<'info>,

// ✅ SECURE — Signer type enforces tx-level signature check
pub authority: Signer<'info>,
```

### 5. Reentrancy (via CPI)

```rust
// ❌ VULNERABLE — state updated AFTER external CPI call
pub fn bad_pattern(ctx: Context<...>) -> Result<()> {
    external_program::cpi::call(cpi_ctx)?; // could call back into us
    ctx.accounts.vault.amount -= withdrawal; // state mutation after CPI
    Ok(())
}

// ✅ SECURE — update state BEFORE making CPI calls (checks-effects-interactions)
pub fn good_pattern(ctx: Context<...>) -> Result<()> {
    ctx.accounts.vault.amount -= withdrawal; // state first
    external_program::cpi::call(cpi_ctx)?;  // then CPI
    Ok(())
}
```

### 6. Duplicate Account Exploit

```rust
// ❌ VULNERABLE — if source == destination, both &mut aliases same data
pub source: Account<'info, TokenAccount>,
pub destination: Account<'info, TokenAccount>,

// ✅ SECURE — enforce distinct accounts
#[account(
    mut,
    constraint = source.key() != destination.key() @ ErrorCode::DuplicateAccount
)]
pub source: Account<'info, TokenAccount>,
```

### 7. Initialization Guard

```rust
// ❌ VULNERABLE — can call initialize twice, overwriting data
pub fn initialize(ctx: Context<Initialize>) -> Result<()> { ... }

// ✅ SECURE — Anchor's init constraint prevents double-init
#[account(
    init,           // Fails if account already exists
    payer = user,
    space = 8 + Discovery::INIT_SPACE
)]
pub discovery: Account<'info, Discovery>,
```

### 8. Privileged Instruction Access

```rust
// ✅ SECURE — admin-only instructions use program-owned PDA authority
#[account(
    seeds = [b"stellarr-admin"],
    bump,
    constraint = admin_config.authority == authority.key() @ ErrorCode::Unauthorized
)]
pub admin_config: Account<'info, AdminConfig>,
pub authority: Signer<'info>,
```

## Client-Side Security (Next.js + Privy)

### Environment Variables
```
# ✅ Server-only secrets (NEVER prefix with NEXT_PUBLIC_)
HELIUS_API_KEY=
TREE_AUTHORITY_KEYPAIR=
DATABASE_URL=

# ✅ Client-safe (public values only)
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_STELLARR_COLLECTION_MINT=
```

### API Route Authentication
```typescript
// Always validate wallet signature on state-changing API routes
import { verifySignature } from '@/lib/auth/verify'

export async function POST(req: NextRequest) {
  const { walletAddress, signature, message } = await req.json()

  // Verify the user actually controls this wallet
  const isValid = await verifySignature(message, signature, walletAddress)
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Now safe to act on walletAddress
}
```

### Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min per wallet
})

const { success } = await ratelimit.limit(walletAddress)
if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
```

## Pre-Deployment Security Audit Checklist

```
PROGRAM SECURITY
[ ] All account constraints validated in #[derive(Accounts)]
[ ] No raw AccountInfo without ownership check
[ ] All arithmetic uses checked_* variants
[ ] State mutations before CPI calls (CEI pattern)
[ ] Admin instructions gated by PDA authority
[ ] Upgrade authority set (or frozen for immutability)
[ ] Program tested on devnet for ≥1 week before mainnet

CLIENT SECURITY
[ ] No private keys in client-side code or public env vars
[ ] API routes validate wallet signatures for state changes
[ ] Rate limiting on all public API endpoints
[ ] Input validation / sanitization on all user inputs
[ ] No eval(), no dangerouslySetInnerHTML with user content
[ ] .env.local in .gitignore and never committed

INFRASTRUCTURE
[ ] Helius/RPC API key restricted by allowed origins
[ ] Privy app settings: allowed domains configured
[ ] Database queries use parameterized statements
[ ] Error responses don't expose stack traces to client
```

## Static Analysis Commands

```bash
# Anchor program security check
anchor build && cargo clippy -- -D warnings

# Check for common Solana vulnerabilities
npx @audit-wizard/solana-security-check ./programs

# JavaScript dependency audit
npm audit --audit-level=moderate

# TypeScript strict mode (add to tsconfig.json)
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

## Incident Response — If a Bug Is Found in Production

```
1. PAUSE   → immediately disable affected instruction via feature flag or admin freeze
2. ASSESS  → quantify scope: how many users/funds affected?
3. CONTACT → notify affected users privately before public disclosure
4. PATCH   → fix + audit the fix with a fresh pair of eyes
5. DEPLOY  → deploy with enhanced monitoring
6. DISCLOSE → transparent post-mortem after users are safe
```

## References

- Trail of Bits: Building Secure Contracts: https://github.com/crytic/building-secure-contracts
- Anchor Security: https://www.anchor-lang.com/docs/security
- Solana Program Security: https://docs.solanalabs.com/cli/wallets/hardware/ledger
- OWASP Top 10: https://owasp.org/Top10/
- Sec3 Audit Checklist: https://github.com/sec3dev/solana-security-checklist
