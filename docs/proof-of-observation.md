# Proof-of-Observation Protocol

On-chain attestation registry for verified astronomical observations.

## What it is

Every time a Stellar user photographs the night sky and the photo passes
verification (Claude Vision + Open-Meteo weather oracle + EXIF + dedup +
visibility cross-check), the result is recorded as **real Solana program state** —
not just a database row. Each verified observation becomes an `Observation`
account on-chain; each observer accrues an `ObserverProfile` (reputation).

This turns the thing Stellar uniquely produces — a verified observation
(observer, target, geolocation, timestamp, confidence tier, weather-oracle hash)
— into composable, auditable, on-chain infrastructure that other apps can read.

## Trust model

Observations are **oracle-signed, not user-signed**. The server runs the
verification pipeline and is the only party that can attest an observation's
confidence; it holds the `oracle_authority` key and writes attestations
gaslessly on the user's behalf. This is the same trust model already used by
Stellar's off-chain HMAC verification token and server-side Stars mint — an
attestation/oracle registry, a legitimate mainnet pattern, not a self-report.

Users still sign up with email and never touch keys. The chain write is gasless
and server-side — "utility first, crypto invisible."

## Program

Anchor program `stellar_observations` (`anchor/programs/stellar-observations`).

- **Program ID:** `t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT`
- **Cluster:** devnet (mainnet-ready — migration is an RPC + redeploy + reinit)
- **Registry PDA:** `BzKRCHnKT4LxUSianZ7kFuojxUBafTZietw8JnnWDq2L`

### Accounts (PDAs)

| Account | Seeds | Holds |
|---|---|---|
| `Registry` | `["registry"]` | admin, oracle_authority, total_observations, paused |
| `ObserverProfile` | `["observer", observer]` | total_observations, total_stars, first/last seen, revoked_count |
| `Observation` | `["obs", file_hash[..20]]` | observer, target, confidence, lat/lon (µdeg), observed_at, oracle_hash, cloud_cover, stars, revoked |

Seeding `Observation` by the photo's file hash gives **on-chain dedup for free**:
re-recording the same photo fails the account `init`.

### Instructions

1. `initialize_registry(oracle_authority)` — admin, once.
2. `set_oracle_authority(new)` / `set_paused(bool)` — admin governance.
3. `record_observation(args)` — **oracle-signed**; creates the `Observation`
   PDA, upserts the `ObserverProfile`, bumps counters, emits `ObservationRecorded`.
4. `revoke_observation(file_hash)` — oracle/admin anti-fraud clawback; marks the
   observation revoked and rolls back the observer's counters.

## Data flow

```
photo → /api/observe/verify   Claude Vision + Open-Meteo oracle + EXIF/dedup → HMAC token
      → /api/mint             Bubblegum cNFT (Discovery Attestation)
      → /api/observe/log      DB insert + Stars mint
                              └─ recordObservationOnChain()  ── oracle-signed, gasless
                                        │
                                        ▼
                              stellar_observations (devnet)
                                        │
        /api/observe/onchain/[wallet] ◀── profile "On-chain record" panel
```

The on-chain write in [observe/log](../src/app/api/observe/log/route.ts) is
best-effort with a timeout — an RPC failure never blocks the Stars / cNFT / DB
path. The resulting tx + Observation PDA are persisted to
`observation_log.chain_tx` / `chain_pda` and returned to the client.

## Client

- [`src/lib/observation-program.ts`](../src/lib/observation-program.ts) —
  `recordObservationOnChain`, `fetchObserverProfile`, `fetchObservations`, and
  PDA derivation helpers. IDL + types live in `src/lib/idl/`.
- [`GET /api/observe/onchain/[wallet]`](../src/app/api/observe/onchain/[wallet]/route.ts) —
  public read of the observer's on-chain profile + observation accounts.
- The profile "On-chain record" panel
  ([`OnChainRecord.tsx`](../src/components/profile/OnChainRecord.tsx)) links each
  account to Solana Explorer.

## Ops

```bash
cd anchor && anchor build && anchor test          # build + test the program
anchor deploy --provider.cluster devnet           # deploy
npm run setup:observations                         # initialize the registry (idempotent)
```

Env: `OBSERVATION_PROGRAM_ID` (defaults to the IDL address),
`OBSERVATION_ORACLE_PRIVATE_KEY` (falls back to `FEE_PAYER_PRIVATE_KEY` on devnet).

## Mainnet path

The program and client are network-agnostic. To go to mainnet: deploy the
program to mainnet-beta, point `SOLANA_RPC_URL` at a mainnet RPC, set a
dedicated funded `OBSERVATION_ORACLE_PRIVATE_KEY` (with monitoring — it's a hot
server key), and re-run `npm run setup:observations`.
