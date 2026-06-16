# Dependency Security Posture

_Last reviewed: 2026-06-17 (P6 of the mainnet hardening pass)._

## Summary

`npm audit` reports **70 advisories (14 low / 27 moderate / 29 high)**. This number is
alarming at face value but is **almost entirely transitive noise from `@privy-io/react-auth@3.x`'s
bundled EVM machinery** — a stack this Solana-only app never executes. There is no safe automated
remediation beyond the one non-breaking patch already applied; the rest require destructive
downgrades. Details below so the count is understood, not blindly "fixed."

## Why `npm audit fix --force` must NOT be run

Almost every advisory's `fixAvailable` is a **major downgrade**, not an upgrade:

| Advisory cluster | npm's "fix" | Reality |
|---|---|---|
| `@reown/*`, `@wagmi/*`, `@walletconnect/ethereum-provider`, `viem`, `ws`, `x402`, `uuid` | `@privy-io/react-auth@1.74.1` | **MAJOR DOWNGRADE** of the core auth SDK from 3.31 → 1.74. Would break Privy embedded wallets, the login flow, and the server-auth pairing. Non-starter. |
| `postcss`, `next` | `next@9.3.3` | Downgrade Next.js from 15.5 → 9.3. Absurd. |
| `bn.js`, `merkletreejs`, `web3-utils`, `number-to-bn` | `@metaplex-foundation/mpl-bubblegum@0.11.0` | MAJOR downgrade of the cNFT mint SDK from 4.x. Breaks Discovery Attestations. |
| `esbuild`, `@esbuild-kit/*` | `drizzle-kit@0.19.1` | Dev-only tool downgrade; the esbuild advisory is **dev-server-only** (not a prod/runtime risk). |
| `@solana/pay` | `@solana/pay@1.0.18` | MAJOR downgrade. |

Running `--force` would roll the project back across several breaking majors. **Do not run it.**

## What was applied

- `npm audit fix` (non-breaking, semver-compatible only) — resolved **1** advisory (71 → 70),
  lockfile-only change, no `package.json` edits. Build verified green afterward.

## Genuinely runtime-relevant advisories (and why they can't be cleanly fixed yet)

These are in the Solana/crypto path, not the EVM noise — the ones worth tracking:

| Package | Severity | `fixAvailable` | Note |
|---|---|---|---|
| `bigint-buffer` | high | **false** | No patched release published. Deep transitive under `@solana/spl-token` / web3. Monitor upstream. |
| `bn.js` | moderate | only via mpl-bubblegum MAJOR downgrade | Pervasive in Solana/Anchor. Wait for upstream bump. |
| `elliptic` | low | **false** | No patched release. |
| `@solana/web3.js` | moderate | **false** | Already current; await a fixed release. |
| `@solana/spl-token`, `@solana/buffer-layout-utils` | high | **false** | Await upstream. |

The `ws` advisories (moderate, `>=8.0.0 <8.20.1`) were considered for a targeted `overrides`
pin, but the tree also carries `ws@1/4/7` from legacy deps; a blanket `"ws": "^8.21"` override
would force incompatible majors onto those consumers and risk breaking the build for a moderate
memory-disclosure issue. Not worth it pre-beta. Revisit with path-scoped overrides if needed.

## Exploitability in THIS app

- The EVM cluster (`@reown/*`, `@wagmi/*`, `@walletconnect/*`, `viem`, `x402`, MetaMask/Coinbase/Safe
  SDKs) ships inside Privy but is **never imported or executed** — Stellar is Solana-only
  (`git grep` for first-party imports of these returns nothing). Client-side EVM advisories have no
  reachable code path here.
- The dev-only advisories (`esbuild`, `drizzle-kit`, `@esbuild-kit/*`) never ship to production.

## Remediation plan

1. **Primary lever: upgrade `@privy-io/react-auth` (and `@privy-io/server-auth`) when a patched 3.x ships.**
   That single bump clears the large majority of the high/moderate count. Watch Privy releases.
2. **Solana/Anchor/Metaplex crypto libs** (`bigint-buffer`, `bn.js`, `elliptic`, `@solana/*`): bump
   when upstream publishes non-major fixes; re-run `npm audit` after each Solana dependency update.
3. **Never** `npm audit fix --force`. If a future advisory has a real non-major upgrade, apply it
   targeted (single package) and re-run `tsc --noEmit && npm run build`.
4. Re-review this file at each dependency bump and before the mainnet migration.
