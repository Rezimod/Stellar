# Stellar Observatory — the network layer

Working design for turning Stellar from an astronomy app into a two-sided
marketplace for telescope time. This is the build backlog and the Colosseum
pitch; where it disagrees with a later ADR, the ADR wins.

---

## 1. What it is

**Owners list idle telescopes. Anyone books a live session and watches a real
object through a real instrument. Solana settles the operator payouts.**

Stellar already answers *"is tonight worth it?"* for one person standing in one
place. The network answers the question that follows: *"then whose telescope
can I use?"*

The single feature that justifies the whole thing:

> Tbilisi is clouded out tonight. A node in the Atacama has a clear window in
> 40 minutes. Book it.

No single-observatory product can offer that. We already compute a 7-day
Open-Meteo forecast per location and already render Go/Maybe/Skip per night —
`/api/sky/forecast`, `/api/sky/score`. Today that tells a user to give up.
In the network it becomes a routing engine over instruments.

## 2. The two sides

| | Demand | Supply |
| --- | --- | --- |
| Who | Anyone. Beginners who own no telescope; owners whose sky is clouded | Telescope owners with idle clear nights |
| Buys/sells | A live session, or an observer seat on someone else's | Time on an instrument they already own |
| Pays/paid | Card (Privy onramp) or Stars | Payout per completed session, minus commission |
| Sees crypto | Never | A balance and a cash-out button |

## 3. Supply is the hard half — three tiers

A rentable node needs a computerised GoTo mount, a camera, a mini-PC, a network
connection and a repeatable alignment. Most owned telescopes are not that. So
onboarding is tiered, and we never block on the hardest case.

**Tier 1 — first-party.** Our own instrument in Tbilisi. Full stack, we control
it, it is the reference implementation and the demo that always works.

**Tier 2 — kitted partners.** An Astroman customer buys a Stellar Node Kit —
mount adapter, ASI camera, mini-PC pre-flashed with the agent — plugs it in and
runs a pairing flow. **This is the business.** The supply side of the
marketplace is also a product SKU with retail margin on it, and we can address
it by name: 45,000+ telescope buyers since 2018, brand and model on file.

**Tier 3 — existing rigs.** Astrophotographers already running ASCOM/Alpaca or
INDI install the agent and pass a certification run. Low volume, best captures,
best marketing.

Tier 2 scales. Tier 3 gives credibility. Tier 1 proves it works.

## 4. The adapter boundary

Stellar **never talks to hardware.** It talks to an adapter.

```
browser / mobile
     |  HTTPS + WSS
Stellar cloud  --  scheduler, escrow, provenance
     |  ObservatoryAdapter  (server-side, per node)
node agent  (dials out; no inbound connection)
     |
mount + camera
```

`ObservatoryAdapter` is a server-side TypeScript interface. Minimum surface:

- `getReadiness()` — online, safe, weather, current target
- `reserve(window)` / `release(reservationId)`
- `startMission(lease)` / `abort(missionId)`
- `command(envelope)` — expiring, idempotent, session-scoped
- `subscribe(missionId)` — telemetry + frame stream

Rules that do not bend:

1. **Browsers never receive node credentials** and never address a mount or
   camera. Every command goes through the adapter.
2. **Commands are idempotent by `commandId`, expire at `expiresAt`, and are
   rejected when the session is not the current owner.**
3. **The node re-validates every command locally.** A cloud-approved command
   that fails local safety is refused. Altitude envelope, horizon mask, Sun
   avoidance, emergency park.
4. **One controller per session.** Observers can watch; they can never command.

### 4.1 Hard constraint — the Darkview boundary

Our own Tbilisi instrument is built as **Darkview**, a separate, grant-funded
project with its own repository, its own contract (`contracts/openapi.yaml`)
and an audited provenance statement asserting it shares no code with Stellar.

**No Darkview source enters this repository, and no Stellar source enters
Darkview.** Stellar defines its own adapter interface; Darkview is one
implementation behind it, integrated over its documented API like any other
node. This is not a style preference — Darkview's funding is conditioned on
that separation, and breaking it is expensive in ways a refactor cannot undo.
Treat it as a compile error.

## 5. Session lifecycle

```
REQUESTED -> SCHEDULED -> PREPARING -> SLEWING -> VERIFYING
          -> OBSERVING -> CAPTURING -> PROCESSING -> COMPLETE
```

Holds and failures: `WEATHER_HOLD`, `NOT_VISIBLE`, `HARDWARE_ERROR`,
`CANCELLED`, `FAILED`.

Money moves on exactly two transitions: `COMPLETE` releases, and any terminal
failure refunds. Nothing settles mid-session.

## 6. Money

**The user pays by card.** Privy onramp, as the marketplace already does.
Stars can cover part or all of a session — this is what makes idle nights
worth listing, since Stars cost us catalogue margin rather than cash.

**The operator is paid on-chain.** This is the honest answer to *why a chain*:
many small, cross-border, per-session payments to individuals in different
countries. Banks make that impossible; a program makes it a line of code.

- Session fee is escrowed against the mission lease at booking.
- `COMPLETE` releases: operator share, platform commission.
- `WEATHER_HOLD` / `HARDWARE_ERROR` / `FAILED` refunds the user in full,
  automatically. No support ticket, no dispute.
- The operator sees **"₾ 240 earned this month"** and a cash-out button. The
  word *wallet* does not appear.

Proposed split: **80 / 20** operator / platform, matching the 20% we already
take on partner brands. The number has to survive the kit's payback maths — an
operator must see the kit paid off in a plausible number of nights or Tier 2
does not recruit.

## 7. What goes on chain

On chain:

- **The escrow and the split.** A program holding the session fee against the
  lease, releasing on completion, refunding on failure.
- **Capture provenance.** The Proof-of-Observation program
  (`t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT`, devnet) already records an
  oracle-signed observation. A node capture is a *strictly stronger* input than
  a phone photo: the mount reports where it pointed, the agent signs it, and
  confidence is high by construction rather than by a vision model's guess.
  The oracle role moves from a weather API to an instrument.
- **Operator reputation**, derived from completed sessions — portable, not ours
  to revoke.

Off chain: scheduling, telemetry, frames, weather, PII, everything a database
does better.

## 8. Data model additions

New tables, alongside the existing `users` / `telescopes` / `orders`:

| Table | Holds |
| --- | --- |
| `observatory_node` | owner, site, lat/lon, timezone, tier, approval status, capabilities |
| `node_instrument` | mount, optics, camera, focal length, limits — FK to `telescopes` where the owner already registered gear |
| `node_availability` | recurring windows the node accepts work |
| `session` | user, node, instrument, target, window, state, lease, escrow ref |
| `session_observer` | paid view-only seats, capped, opt-in by the controller |
| `capture` | frames + processed output + provenance, FK to `observation_log` |
| `operator_payout` | per-session ledger row, append-only, idempotent by session id |

`observation_log` already carries `chainTx` / `chainPda` and the verification
columns; a node capture writes the same row with a different source, so the
existing gallery, feed, passport and OG surfaces keep working unchanged.

## 9. Surfaces

`/network` is **taken** — it is the observation map, with its own `NodeType`
union. The observatory gets its own namespace.

| Route | Purpose |
| --- | --- |
| `/observatory` | Browse nodes. Live status, sky conditions, next free window |
| `/observatory/[nodeId]` | One instrument: gear, sample captures, availability, book |
| `/observatory/session/[id]` | The live room — real frames, mission state, capture |
| `/observatory/operator` | Supply side: list a telescope, availability, earnings |
| `/observatory/operator/pair` | Node pairing flow |
| `/api/observatory/*` | nodes, availability, booking, session, telemetry, payout |

Existing surfaces change role rather than disappearing:

| Surface | Becomes |
| --- | --- |
| `/sky` forecast | routing engine — find a node with a clear window |
| `/observe` | one of two capture paths; the weaker one |
| ASTRA | "book me something in Orion tonight" — it already has tool calls |
| Stars | + telescope time on low-demand nights |
| `/marketplace` | + the Node Kit, which is the supply funnel |
| Discovery Pass | the demand-side launch instrument |

## 10. Cold start

A two-sided marketplace deadlocks: no owners without customers, no customers
without instruments. The pass drop breaks it in the right order.

1. **Sell passes.** Committed demand, in cash, before a node exists.
2. **Build node one.** Our own instrument, funded and proved.
3. **Recruit Tier 2** with the only pitch that works: *there are N people
   holding prepaid sessions — put your scope online and get paid.*
4. **Open booking** to everyone once supply covers demand.

This is the third argument, after the undersell problem and the loot-box
exposure in `docs/discovery-business-plan.md` §4–5, for passes granting
**telescope time** rather than tokens alone.

## 11. Non-goals

- No public bidding, auctions or dynamic pricing.
- No automatic node approval. Every node is reviewed by a human before it can
  take a booking.
- No unattended first light. A node's first real mission is attended.
- No browser-to-hardware path, ever.
- No new npm dependencies without a measured need.

## 12. Open decisions

1. **Do passes grant telescope time?** Assumed yes throughout §10. Blocks card
   copy; reveal is 21 Oct 2026.
2. **Commission split.** 80/20 proposed in §6, pending the kit payback maths.
3. **Observer seats in v1, or controller-only?** They are most of the revenue
   on a scarce instrument and cost one more socket, but they add a sharing
   surface to the session model.
