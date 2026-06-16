# Mainnet Cutover Runbook

Status after the code pass in this commit: **the app is network-agnostic.** No contract
address, mint, program ID, or RPC is hardcoded in source — all are env-driven, and every
explorer link / Privy chain / wallet-adapter network now derives from
`NEXT_PUBLIC_SOLANA_CLUSTER`. Going live = provision mainnet infra → flip env → redeploy.

Decisions locked for this launch:
- Demo / guaranteed-mint missions stay **live on mainnet** (accept per-mint SOL cost + abuse risk).
- Gasless stays **on** (fee-payer covers embedded-wallet tx); external-wallet gas drip stays **disabled** on mainnet (`/api/wallet/fund` returns 503 off devnet by design).
- Anchor program redeploys with the **same keypair → same program ID** `t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT` (no IDL/env address change).

---

## PRE-FLIGHT — human steps an agent cannot do (do these first)

1. **Helius mainnet RPC** — create a mainnet API key, copy the `https://mainnet.helius-rpc.com/?api-key=...` URL.
2. **Fund the fee-payer** (pubkey of `FEE_PAYER_PRIVATE_KEY`) on **mainnet** with real SOL:
   - ~5–6 SOL for the one-time Anchor program deploy
   - ~1 SOL for the Bubblegum tree rent (depth 14 / canopy 10)
   - a working buffer for ongoing gasless mints/awards (top up + monitor)
   - → fund **~8 SOL** to start.
3. **Fund the oracle wallet** (pubkey of `OBSERVATION_ORACLE_PRIVATE_KEY`) with ~0.2 SOL for observation writes. (If unset, it falls back to the fee-payer.)
4. **Privy dashboard** (app `cmnnk6n2c002d0cl47skaaz0d`) — confirm Solana **mainnet** is enabled for embedded wallets.
5. **Merchant wallet** — confirm `NEXT_PUBLIC_MERCHANT_WALLET` is a mainnet wallet you control (marketplace SOL payments are now real money).
6. **Solana CLI** — `solana config set --url <helius-mainnet-url>` and ensure `~/.config/solana/id.json` is the deploy authority with the program upgrade authority / enough SOL for `anchor deploy`.

---

## THE ONE PROMPT — paste into Claude Code after pre-flight

> **Go live on mainnet.** Pre-flight is done: fee-payer + oracle are funded with real SOL on
> mainnet, I have a Helius mainnet RPC URL, Privy mainnet is enabled, and the merchant wallet is
> confirmed. Execute the mainnet cutover per `docs/mainnet-cutover.md`:
>
> 1. In `.env.local`, set `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`, and set `SOLANA_RPC_URL`,
>    `NEXT_PUBLIC_SOLANA_RPC_URL`, and `NEXT_PUBLIC_HELIUS_RPC_URL` all to my Helius mainnet URL
>    (ask me for it if not already in the file).
> 2. Run `npm run setup:bubblegum` → it writes a fresh `MERKLE_TREE_ADDRESS` +
>    `COLLECTION_MINT_ADDRESS`. Then mirror the collection into `NEXT_PUBLIC_COLLECTION_MINT_ADDRESS`.
> 3. Run `npm run setup:token` → it writes a fresh `STARS_TOKEN_MINT`. Mirror it into
>    `NEXT_PUBLIC_STARS_TOKEN_MINT`.
> 4. Deploy the Anchor program to mainnet with the existing keypair (same program ID): add a
>    `[programs.mainnet]` entry, build, and `anchor deploy --provider.cluster mainnet`. Leave
>    `OBSERVATION_PROGRAM_ID` = `t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT`. Then run
>    `npm run setup:observations` to initialize the registry on mainnet.
> 5. Run `npx tsc --noEmit && npm run build` — both must pass.
> 6. Print the final list of every env var (name + value) that I must set in **Vercel production**,
>    then stop so I can paste them into Vercel and redeploy. Do NOT push or commit until I confirm.

---

## Env vars to set in Vercel production (the cutover set)

| Var | Mainnet value |
|---|---|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta` |
| `SOLANA_RPC_URL` | Helius mainnet URL |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Helius mainnet URL |
| `NEXT_PUBLIC_HELIUS_RPC_URL` | Helius mainnet URL |
| `FEE_PAYER_PRIVATE_KEY` | mainnet-funded key (can stay the same key once funded) |
| `OBSERVATION_ORACLE_PRIVATE_KEY` | mainnet-funded oracle key |
| `MERKLE_TREE_ADDRESS` | from `setup:bubblegum` |
| `COLLECTION_MINT_ADDRESS` | from `setup:bubblegum` |
| `NEXT_PUBLIC_COLLECTION_MINT_ADDRESS` | same as `COLLECTION_MINT_ADDRESS` |
| `STARS_TOKEN_MINT` | from `setup:token` |
| `NEXT_PUBLIC_STARS_TOKEN_MINT` | same as `STARS_TOKEN_MINT` |
| `OBSERVATION_PROGRAM_ID` | `t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT` |
| `NEXT_PUBLIC_MERCHANT_WALLET` | mainnet merchant wallet |

> Note: devnet Stars balances and devnet NFTs do **not** carry over — the mainnet mint/tree are
> fresh. Beta users start from zero, which is expected.

---

## POST-DEPLOY VERIFY

1. Sign in (email) → embedded wallet created; profile shows **"Solana mainnet"**.
2. Run a Demo Observation → real cNFT mints; explorer link opens **mainnet** (no `?cluster=devnet`).
3. `/nfts` gallery loads via Helius mainnet DAS API.
4. Award Stars → balance reflects the mainnet Token-2022 mint.
5. Marketplace SOL price + checkout point at the mainnet merchant wallet.
6. Watch the **fee-payer balance** — every gasless mint/award/burn now spends real SOL.
