# Migration plan — Stellar becomes an observatory

How the app gets from "astronomy companion with an observatory page" to
"observatory with an astronomy companion attached", and how we build the live
session before any hardware exists.

Design: `docs/observatory-network.md`. This file is the sequence.

---

## The rule that makes this safe

**Everything is built against the simulator, and the simulator is the default
implementation, always.** The real node swaps in behind `ObservatoryAdapter`
without a UI change. This is not a shortcut around missing hardware — it is how
the product stays testable once hardware exists, because you cannot run CI
against a telescope on a roof.

### Simulated output is never evidence

A simulated frame is unmistakably marked in the interface, and a simulated
capture:

- cannot mint a Discovery Attestation,
- cannot award Stars,
- cannot be written to `observation_log` as a verified observation,
- cannot appear in the Collection, the feed, or a passport.

This is enforced at the boundary, not by UI discipline. `provenance:
'simulated' | 'instrument'` rides on every capture from the adapter outward,
and the mint and award paths refuse anything that is not `'instrument'`. The
July certify-all window is why this rail exists before the feature does.

---

## Stage 1 — the mission spine

Pure logic, no UI, fully tested.

- Mission state machine: `REQUESTED → SCHEDULED → PREPARING → SLEWING →
  VERIFYING → CENTERING → OBSERVING → CAPTURING → PROCESSING → COMPLETE`,
  plus `WEATHER_HOLD`, `NOT_VISIBLE`, `HARDWARE_ERROR`, `CANCELLED`, `FAILED`.
- **Safety envelope**, evaluated before any transition: altitude floor and
  ceiling, horizon mask, Sun avoidance, target visibility from that site at
  that time. A refused command returns the reason, never a silent no-op.
- **Command envelope**: `commandId`, `missionId`, `sessionId`, `issuedAt`,
  `expiresAt`, `type`, `payload`. Idempotent by `commandId`, rejected after
  `expiresAt`, rejected when the session is not the current owner.
- **Realistic timings** in the simulator: slew duration from angular distance
  and slew rate, mechanical settle, plate-solve, centering iterations.

Acceptance: the machine can run a whole mission in fast-forward under test,
and every safety refusal has a test.

## Stage 2 — the session room

`/observatory/session/[id]`, the surface a customer actually uses.

- **Live view** — the frame, at the instrument's true field of view.
- **Telemetry**, mono, always visible: RA/Dec, Alt/Az, tracking state, sub
  count, integration time, seeing, cloud, temperature, time left in the slot.
- **Controls** — target select, GoTo, nudge N/S/E/W at selectable rate,
  exposure, gain, capture, abort, park. Every control disabled with a stated
  reason rather than hidden when the envelope forbids it.
- **Mission log** — a running list of what the instrument did and when. This is
  what makes a failed night legible instead of infuriating.

## Stage 3 — the camera simulation

The part that has to be honest to be worth anything.

The frame is computed, not decorated:

- **True field of view** from aperture, focal length and sensor size.
  A NexStar 6SE at 1500 mm with an ASI585MC (11.2 × 6.3 mm) frames about
  **26′ × 14′** — the full Moon does not fit. With the f/6.3 reducer it becomes
  about **41′ × 23′** and the Moon just fits. Those numbers are the product;
  getting them wrong makes the whole thing a toy.
- **The target at its true angular size** inside that field. Jupiter is ~40″
  across — roughly 2.5% of the frame width. A reference photograph is scaled to
  that size, not to the viewport.
- **Seeing** blurs it. **Sky glow** from the site's Bortle class lifts the
  background. **Shot noise** dominates a single sub.
- **Live stacking**: noise falls as √N with each sub, so faint structure emerges
  over integration time exactly as it does in EAA.
- **Alt-az field rotation** over a long session, and **star trails** when
  tracking is off.

A reference photograph supplies the *content*; the optics, the sky and the
sensor supply everything else. The result is what that instrument would show,
and it is labelled simulated regardless.

## Stage 4 — booking

Slot picker over `node_availability`, a dry-run reservation, no money. Enough to
run a session end to end with a real account.

## Stage 5 — money

Escrow at booking, release on `COMPLETE`, automatic refund on any terminal
failure, operator payout ledger. Gated on the commission decision in
`docs/observatory-network.md` §12.

---

## Migrating the rest of the app

Staged so nothing breaks and nothing is thrown away.

| Phase | Change | Depends on |
| --- | --- | --- |
| **A** *(done)* | `/observatory` exists, unlinked | — |
| **B** | Nav entry; a "tonight" module on the home surface | Stage 2 |
| **C** | `/sky` gains routing — *your sky is clouded, this node's is not* | 2+ nodes |
| **D** | `/observe` and the session room become two capture paths into one Collection | Stage 3 |
| **E** | Home reframes around booking; the companion becomes the supporting act | Stage 4 |

Nothing is deleted. Forecast, planets, ASTRA, missions, marketplace and Field
all keep working; they change role, and the roles are in
`docs/observatory-network.md` §9.

## Open question

**Is the simulator public?** A clearly-labelled sandbox where anyone can drive a
telescope that behaves correctly is the best marketing asset this project could
have, and it is the Colosseum demo. The alternative is an internal harness
behind a flag. It changes how much the session room UI is worth polishing.
