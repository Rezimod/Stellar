# Capsules: verifiable randomness with a public audit log

What a capsule contains is decided by randomness that anyone can check after
the capsule is opened, and every capsule's life is written to a public log
that cannot be edited in place. It is **not** trustless and it does **not**
make manipulation impossible. What it does is make the forms of manipulation
listed below either impossible or visible.

Code: `src/lib/sidera/randomness.ts` (pure), `src/lib/sidera/capsule.ts`
(database), `src/lib/sidera/audit.ts` (pure log audit). Public endpoints:
`GET /api/sidera/capsules/log` (entries and audit) and
`GET /api/sidera/capsules/verify?capsuleId=…` (one capsule, with every input).

## The construction, in order

1. **Listing.** The server draws a 32-byte `secret` (`crypto.randomBytes`) and
   publishes `commitment = SHA-256(secret)` in the log (`event = 'listed'`),
   with the capsule's listing number. The capsule does not exist for sale
   before this row exists. The secret is stored sealed (AES-256-GCM under
   `CAPSULE_SEAL_KEY`, capsule id as associated data); no route ever selects it.
2. **Purchase.** The buyer picks a listed capsule and supplies a 32-byte
   `nonce` (64 lowercase hex characters, from their own random source). The
   server builds the purchase message

   ```
   Sidera capsule purchase
   capsule: <capsule id>
   sequence: <listing number>
   commitment: <commitment>
   holder: <wallet>
   nonce: <nonce>
   ```

   and logs `purchase_hash = SHA-256(message)` with the nonce and wallet
   (`event = 'purchased'`), in the same transaction as the capsule changing
   hands and the order being created. The buyer's response carries the message
   and hash. If the buyer sends a base58 ed25519 signature of the message by
   the wallet, it is verified and stored; a bad one is refused.
3. **Outcome.**
   `seed = HMAC-SHA256(key = secret, message = nonce_bytes(32) ‖ ascii(capsule_id)(36))`.
   Draw `i` (0-based) reads `block_i = HMAC-SHA256(key = seed, message = uint32_be(i))`;
   bytes 0–5 are a big-endian 48-bit integer `r_tier`, bytes 6–11 `r_card`.
   `pick(r, n) = floor(r · n / 2^48)` in exact integer arithmetic.
   - Tier: the tiers that still have an edition, in the order common, rare,
     epic, legendary, weighted by `RARITY_ODDS_BPS` (integers summing to
     10,000). `x = pick(r_tier, W)` with `W` the sum of those weights; the tier
     is the first whose cumulative weight exceeds `x`.
   - Card: the tier's cards with an edition left, sorted by designation
     (byte order); card `pick(r_card, m)`.
   - An edition drawn earlier in the same capsule counts as gone for later draws.
4. **Open.** Only the buyer, only once the order is paid. The secret is
   revealed; each draw takes the card's next edition number; the log gets
   `event = 'opened'` with `outcome = {secret, draws, oddsBps, supply, pulls}`.
   `supply` is every card of the set with its remaining editions at the moment
   the draws were made.
5. **Verify.** `verifyCapsule({commitment, secret, nonce, capsuleId, pulls, supply, draws, oddsBps})`
   checks `SHA-256(secret) = commitment` and that the draws above reproduce
   exactly the logged pulls, in order, and no others.

A capsule can also be **voided** (admin/cron only, refused once its order is
paid). The void reveals the secret with a reason; the log keeps it as voided,
and one voided after purchase is flagged by the audit.

## Supply is part of the outcome

The draws depend on which cards still have editions: a card with none left is
skipped and its share goes to the rest of its tier; a tier with none left
passes its share to the other tiers in proportion to their odds. So the same
secret and nonce give the same pulls **only against the same supply**. The
supply each opening used is logged with it, and a verifier can check that
supply against the public edition counts (edition numbers are gapless from 1,
so the highest number of a card is how many exist). Until any card sells out,
supply changes nothing.

## Edition numbers under concurrency

neon-http has no interactive transactions; each opening is one `db.batch`
(one transaction). Every draw is
`INSERT INTO edition … SELECT MAX(edition_number)+1 … HAVING MAX < edition_size`
feeding a `capsule_pull` row whose `edition_id` and `capsule_id` are
sub-selects into NOT NULL columns. Two openings that pick the same number
collide on `edition_card_number_unique`; a card that sold out in between makes
the edition sub-select NULL. Either way the whole batch rolls back, and the
opening re-reads the supply and retries (bounded, with jitter). No number is
ever taken by a rolled-back batch, and editions are never deleted, so numbers
stay unique and gapless. Listing numbers are allocated the same way. The log's
own `seq` is a `bigserial` and can skip after a rollback; the audit relies on
the listing sequence, never on `seq`.

## What is and is not guaranteed

| Threat | Status |
| --- | --- |
| Server grinds the secret after seeing the nonce | **Prevented.** The secret is fixed by a commitment logged before any purchase. A different secret fails `SHA-256(secret) = commitment`. |
| Server grinds the secret at listing, against a predictable nonce | **Buyer's responsibility.** The secret is chosen before the nonce exists, so grinding only helps if the nonce is guessable. The client must draw the nonce from `crypto.getRandomValues`. |
| Buyer predicts the outcome | **Prevented.** The secret is unknown until the capsule is opened, after the nonce is fixed. |
| Server substitutes the nonce after purchase | **Detectable.** The nonce is logged at purchase and bound into `purchase_hash`; the buyer holds the message and hash as a receipt. With a wallet signature, anyone can check it. Without one (the beta default, since the purchase is authenticated by the Privy session and `assertOwnsWallet`), only the buyer's receipt contradicts a substitution — a third party cannot tell who is lying. |
| Server erases an unwanted outcome | **Detectable.** Listing numbers are gapless; a capsule removed from the log leaves a gap (`sequence_gap`). |
| Server withholds an unwanted outcome after purchase | **Detectable.** A purchased capsule that is never opened (`purchased_not_opened`) or is voided (`voided_after_purchase`, with the secret revealed so the outcome it would have had can be computed) stays visible. An unpaid order produces the same flag, so these are evidence to examine, not proof. |
| Server refuses a purchase request after seeing its nonce | **Not detectable from the log.** Nothing is logged for a refused request. A refusal is only legitimate if the capsule was already taken, which the log shows; a buyer refused on a capsule the log still shows as listed holds evidence (their request) of a selective refusal. |
| Server influences which cards are sold out when an opening draws | **Partly.** Supply matters only once cards sell out. The server controls the order in which concurrent openings commit and can sell cards directly. The supply used is logged and checkable against edition counts, but the ordering itself is not. |
| Log rewritten in place | **Refused by the database** (trigger on UPDATE, DELETE, TRUNCATE; unique `(capsule_id, event)`), and no code path issues such a statement (test). The operator controls the database and could drop the trigger: the log is tamper-evident only to someone who kept an earlier copy. Anchoring log hashes somewhere public is not built. |
| Sealed secrets read from a database dump | **Prevented without the key.** Losing `CAPSULE_SEAL_KEY` strands every unopened capsule. |
