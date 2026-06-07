# Reputation Economy + Soulbound Telescope Passport

Makes the [Proof-of-Observation registry](./proof-of-observation.md) **load-bearing**:
on-chain observer reputation drives Stars rewards and unlocks a tokenized credential.

## Reputation tiers

Single source of truth: [`src/lib/reputation.ts`](../src/lib/reputation.ts). Tiers key off the
observer's verified-observation count (the on-chain `ObserverProfile.total_observations`, mirrored by
the DB accepted-observation count for the fast path).

| Tier | Min observations | Stars multiplier | Passport |
|---|---|---|---|
| 👁 Stargazer | 0 | ×1.0 | — |
| ⭐ Observer | 5 | ×1.1 | ✓ |
| 🧭 Pathfinder | 20 | ×1.25 | ✓ |
| 🌌 Celestial | 50 | ×1.5 | ✓ |

The multiplier is applied in [`/api/observe/log`](../src/app/api/observe/log/route.ts) to the
observer's **standing before** the current observation (so the first one isn't retroactively boosted),
after base + rare + event bonus and **before** the daily Stars cap (which stays authoritative).

## Soulbound Telescope Passport (Token-2022)

[`src/lib/telescope-passport.ts`](../src/lib/telescope-passport.ts). One non-transferable Token-2022
NFT per observer, minted gaslessly by the fee payer when they first reach Observer:

- **Soulbound** via the `NonTransferable` mint extension; supply locked at 1 (mint authority removed
  after the single mint). Verified on devnet: transfer attempts are rejected.
- **On-mint metadata** (`MetadataPointer` → self, `TokenMetadata` extension): name, symbol `STLP`,
  and `tier` / `observations` fields. Tier-ups **update the metadata field** rather than re-minting.
- **Deterministic per-wallet mint** derived from `sha256(feePayerSecret || wallet)` — reproducible
  server-side with no stored mapping, and not publicly derivable (salted with the server secret).
- Trigger: best-effort, timeout-guarded, only on a **tier-up boundary** in `/api/observe/log` (one
  chain op per tier change, not per observation). Never blocks Stars/registry/DB.

Read: [`GET /api/passport/[wallet]`](../src/app/api/passport/[wallet]/route.ts) (also the metadata
`uri` target). Surfaced on `/profile` in the On-chain record panel (tier + multiplier + progress +
passport, each linking to Solana Explorer).

## Notes

- No new required env (reuses `FEE_PAYER_PRIVATE_KEY` as mint authority). Devnet now, mainnet-ready.
- Retired the dead memo "proofs" (`mintMembership`/`mintTelescopePassport`/`mintObservation`) from
  `src/lib/solana.ts` — the registry + passport supersede them.
- Keeps "utility first, crypto invisible": passport is auto-minted, gasless; users never sign.
