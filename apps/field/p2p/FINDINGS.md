# Field Mesh — P2P delegation findings (QVAC SDK 0.9.2)

Honest, reproducible notes on how far QVAC's P2P **delegated inference** gets for a
phone↔laptop "offload heavy work" scenario, captured while building Stellar Field.
This is the kind of "what works / what doesn't / what QVAC should focus on next"
the hackathon's *Build in Public* track asks for.

## What works ✅
- **Model seeding / distribution** (`downloadAsset({ seed: true })`, `startQVACProvider`)
  — a phone can serve its cached model to peers over Hyperdrive/Hyperswarm. Shipped
  in the app as **Field Mesh**.
- **Provider startup** — `startQVACProvider({ topic })` announces the topic and
  accepts peer connections.
- **Delegated `loadModel`** — `loadModel({ delegate: { topic, providerPublicKey } })`
  registers a remote model on the consumer **with zero local inference weights**.
  Measured: model registered in **~9.2 s** against a pre-warmed provider.

## What doesn't (yet) ❌
- **Delegated `completion` round-trip** — after the model registers, the streamed
  completion request **times out** (`ETIMEDOUT`). The provider logs show it
  receives the delegated registration and reports the model "already loaded", but
  never logs receipt/processing of the completion; the consumer's peer connection
  times out. Reproduced node↔node same-machine **and** phone↔laptop.

## Two real bugs found along the way (now worked around here)
1. **Provider "Invalid input" under Node.** The SDK's bundled `provider` example does
   `process.env["QVAC_HYPERSWARM_SEED"] = seed` with `seed === undefined`, which Node
   stringifies to `"undefined"` — rejected by `startQVACProvider`. Fix: never set the
   env var when there's no seed (see `provider.mjs`).
2. **Cold-cache `loadModel` timeout.** On first delegation the provider downloads the
   full model (~773 MB) *on demand*; that exceeds the consumer's `loadModel` timeout →
   `ECONNRESET`. Fix: **pre-warm** the provider's model cache before serving (see
   `provider.mjs`), after which delegated `loadModel` is fast (~9 s).

## Conclusion
Delegated **model distribution and registration** are production-usable today; the
**streaming completion round-trip** is the missing piece in 0.9.2. Stellar Field
therefore ships Field Mesh seeding (works) and runs all inference **locally** with a
`fallbackToLocal` posture for delegation — no feature depends on the completion
round-trip. The architecture is in place to flip delegation on when the SDK closes
that gap.

## Reproduce
```bash
# terminal 1 — provider (pre-warms the model, then serves it)
node p2p/provider.mjs
# copy the printed PUBKEY:<hex>

# terminal 2 — consumer (delegated loadModel + completion)
node p2p/consumer.mjs <PUBKEY>
```
Expect: `✓ model registered (~9 s)` then the completion `ETIMEDOUT`. Run from
`apps/field` so `@qvac/sdk` resolves.
