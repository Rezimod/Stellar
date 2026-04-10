---
name: solana-blockchain
description: >
  Core Solana dApp development using modern 2026 best practices.
  Activate for: wallet connections, transaction building, Anchor programs,
  Privy embedded wallets, gasless flows, @solana/kit (v5.x), Next.js + Solana,
  RPC/Helius integration, Solana Pay, and any on-chain program work.
  Source: solana-foundation/solana-dev-skill (official, 129 stars, MIT)
---

# Solana Blockchain Development Skill

You are an expert Solana developer working with January 2026 best practices.

## Stack Defaults

| Layer | Default | Alternative |
|---|---|---|
| Client SDK | @solana/kit (v5.x) | @solana/web3-compat for legacy interop |
| UI Wallet | Privy embedded wallets | @solana/wallet-adapter |
| Program Framework | Anchor 0.31 | Pinocchio (high-performance) |
| Unit Testing | LiteSVM / Mollusk | - |
| Integration Testing | Surfpool | solana-test-validator |
| Client Generation | Codama | - |
| RPC | Helius | QuickNode |

## Core Principles

- Always use `@solana/kit` for new client code, never `@solana/web3.js` directly unless bridging legacy
- Use `@solana/web3-compat` only at integration boundaries with web3.js-dependent packages
- Anchor is the default for program development; switch to Pinocchio only when CU optimization is critical
- Gasless transactions via Privy relayer or fee-payer server — never expose keypairs client-side
- Card-first payments: use Privy's fiat on-ramp before native SOL flows for consumer apps

## Wallet Connection Pattern (Privy + Kit)

```typescript
// Privy embedded wallet — recommended for consumer apps like Stellarr
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth'

const { ready, authenticated, login } = usePrivy()
const { wallets, createWallet } = useSolanaWallets()

// Auto-create embedded wallet on first login
const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
if (authenticated && !embeddedWallet) await createWallet()
```

## Transaction Building (@solana/kit v5.x)

```typescript
import {
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  appendTransactionMessageInstruction,
  signAndSendTransactionMessageWithSigners,
  pipe,
} from '@solana/kit'

const rpc = createSolanaRpc('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY')

const tx = await pipe(
  createTransactionMessage({ version: 0 }),
  msg => setTransactionMessageFeePayerSigner(feePayer, msg),
  msg => appendTransactionMessageInstruction(ix, msg),
  msg => signAndSendTransactionMessageWithSigners(msg),
)
```

## Anchor Program Structure

```rust
use anchor_lang::prelude::*;

declare_id!("YOUR_PROGRAM_ID");

#[program]
pub mod stellarr {
    use super::*;

    pub fn initialize_discovery(
        ctx: Context<InitializeDiscovery>,
        object_name: String,
        coordinates: [f64; 2],
    ) -> Result<()> {
        let discovery = &mut ctx.accounts.discovery;
        discovery.discoverer = ctx.accounts.user.key();
        discovery.object_name = object_name;
        discovery.coordinates = coordinates;
        discovery.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDiscovery<'info> {
    #[account(init, payer = user, space = 8 + Discovery::INIT_SPACE)]
    pub discovery: Account<'info, Discovery>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Discovery {
    pub discoverer: Pubkey,         // 32
    pub object_name: String,        // 4 + 50 max
    pub coordinates: [f64; 2],     // 16
    pub timestamp: i64,             // 8
}
```

## LiteSVM Testing

```typescript
import { LiteSVM } from 'litesvm'
import { Keypair } from '@solana/kit'

describe('Discovery Attestation', () => {
  let svm: LiteSVM

  beforeEach(() => {
    svm = new LiteSVM()
  })

  it('creates discovery record on-chain', async () => {
    const user = Keypair.generate()
    svm.airdrop(user.publicKey, 1_000_000_000n)
    // ... build and send instruction via svm.sendTransaction()
    const account = svm.getAccount(discoveryPda)
    expect(account).not.toBeNull()
  })
})
```

## Common Errors & Fixes

- `AccountNotFound` → wrong PDA seeds or program not deployed to target cluster
- `InstructionError: InvalidAccountData` → account discriminator mismatch, rerun `anchor build`
- `0x1` (Insufficient funds) → user needs SOL, trigger Privy fiat on-ramp
- `GLIBC_2.39 not found` → use Anchor 0.30.x on Ubuntu 20.04 or switch to Docker
- Transaction too large → use Versioned Transactions with Address Lookup Tables (ALTs)

## Security Rules

- NEVER store private keys in frontend code or .env committed to git
- Always validate account ownership: `constraint = account.owner == expected_program`
- Use `checked_add`, `checked_mul` for all arithmetic — never overflow silently
- Validate all PDA seeds server-side before trusting client-provided addresses
- Rate-limit RPC calls with exponential backoff; use Helius priority fee API

## Helius RPC Integration

```typescript
const connection = createSolanaRpc(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
)

// Priority fee estimation
const { priorityFeeEstimate } = await fetch(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getPriorityFeeEstimate',
      params: [{ accountKeys: [programId], options: { priorityLevel: 'High' } }]
    })
  }
).then(r => r.json()).then(r => r.result)
```

## References

- Solana Docs: https://solana.com/docs
- @solana/kit: https://github.com/anza-xyz/solana-kit
- Anchor: https://www.anchor-lang.com/docs
- Privy Solana: https://docs.privy.io/guide/solana
- Helius API: https://docs.helius.dev
- LiteSVM: https://github.com/LiteSVM/litesvm
